#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, vec, Address, Env, IntoVal, Symbol,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    TokenA,
    TokenB,
    ReserveA,
    ReserveB,
    TotalLpShares,
    LpBalance(Address),
}

#[contract]
pub struct AetherPool;

#[contractimpl]
impl AetherPool {
    pub fn initialize(env: Env, token_a: Address, token_b: Address) {
        if env.storage().instance().has(&DataKey::TokenA) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::TokenA, &token_a);
        env.storage().instance().set(&DataKey::TokenB, &token_b);
        env.storage().instance().set(&DataKey::ReserveA, &0i128);
        env.storage().instance().set(&DataKey::ReserveB, &0i128);
        env.storage()
            .instance()
            .set(&DataKey::TotalLpShares, &0i128);
    }

    pub fn provision_liquidity(
        env: Env,
        provider: Address,
        amount_a: i128,
        amount_b: i128,
    ) -> i128 {
        provider.require_auth();
        if amount_a <= 0 || amount_b <= 0 {
            panic!("invalid amounts");
        }

        let token_a: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenA)
            .expect("not initialized");
        let token_b: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenB)
            .expect("not initialized");
        let current_contract = env.current_contract_address();

        // Cross-contract call: Transfer token_a from provider to pool
        env.invoke_contract::<()>(
            &token_a,
            &Symbol::new(&env, "transfer"),
            vec![
                &env,
                provider.to_val(),
                current_contract.to_val(),
                amount_a.into_val(&env),
            ],
        );

        // Cross-contract call: Transfer token_b from provider to pool
        env.invoke_contract::<()>(
            &token_b,
            &Symbol::new(&env, "transfer"),
            vec![
                &env,
                provider.to_val(),
                current_contract.to_val(),
                amount_b.into_val(&env),
            ],
        );

        let reserve_a: i128 = env
            .storage()
            .instance()
            .get(&DataKey::ReserveA)
            .unwrap_or(0);
        let reserve_b: i128 = env
            .storage()
            .instance()
            .get(&DataKey::ReserveB)
            .unwrap_or(0);
        let total_shares: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalLpShares)
            .unwrap_or(0);

        let shares_to_mint = if total_shares == 0 {
            amount_a
        } else {
            let shares_a = (amount_a * total_shares) / reserve_a;
            let shares_b = (amount_b * total_shares) / reserve_b;
            if shares_a < shares_b {
                shares_a
            } else {
                shares_b
            }
        };

        let new_reserve_a = reserve_a + amount_a;
        let new_reserve_b = reserve_b + amount_b;
        let new_total_shares = total_shares + shares_to_mint;

        env.storage()
            .instance()
            .set(&DataKey::ReserveA, &new_reserve_a);
        env.storage()
            .instance()
            .set(&DataKey::ReserveB, &new_reserve_b);
        env.storage()
            .instance()
            .set(&DataKey::TotalLpShares, &new_total_shares);

        let user_shares: i128 = env
            .storage()
            .instance()
            .get(&DataKey::LpBalance(provider.clone()))
            .unwrap_or(0);
        env.storage().instance().set(
            &DataKey::LpBalance(provider.clone()),
            &(user_shares + shares_to_mint),
        );

        env.events()
            .publish((symbol_short!("deposit"), provider), shares_to_mint);

        shares_to_mint
    }

    pub fn execute_swap(
        env: Env,
        sender: Address,
        token_in: Address,
        amount_in: i128,
        min_amount_out: i128,
    ) -> i128 {
        sender.require_auth();
        if amount_in <= 0 {
            panic!("invalid amount");
        }

        let token_a: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenA)
            .expect("not initialized");
        let token_b: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenB)
            .expect("not initialized");

        let is_token_a = if token_in == token_a {
            true
        } else if token_in == token_b {
            false
        } else {
            panic!("unsupported token");
        };

        let reserve_a: i128 = env
            .storage()
            .instance()
            .get(&DataKey::ReserveA)
            .unwrap_or(0);
        let reserve_b: i128 = env
            .storage()
            .instance()
            .get(&DataKey::ReserveB)
            .unwrap_or(0);

        let (reserve_in, reserve_out, token_out) = if is_token_a {
            (reserve_a, reserve_b, token_b.clone())
        } else {
            (reserve_b, reserve_a, token_a.clone())
        };

        if reserve_in == 0 || reserve_out == 0 {
            panic!("insufficient liquidity");
        }

        // Constant Product Math: amount_out = reserve_out - (reserve_in * reserve_out) / (reserve_in + amount_in)
        let amount_out = reserve_out - (reserve_in * reserve_out) / (reserve_in + amount_in);

        if amount_out < min_amount_out {
            panic!("slippage exceeded");
        }

        let current_contract = env.current_contract_address();

        // 1. Cross-contract call: Deposit token_in from sender into pool
        env.invoke_contract::<()>(
            &token_in,
            &Symbol::new(&env, "transfer"),
            vec![
                &env,
                sender.to_val(),
                current_contract.to_val(),
                amount_in.into_val(&env),
            ],
        );

        // 2. Cross-contract call: Transfer token_out from pool to sender
        env.invoke_contract::<()>(
            &token_out,
            &Symbol::new(&env, "transfer"),
            vec![
                &env,
                current_contract.to_val(),
                sender.to_val(),
                amount_out.into_val(&env),
            ],
        );

        // Update Reserves
        if is_token_a {
            env.storage()
                .instance()
                .set(&DataKey::ReserveA, &(reserve_a + amount_in));
            env.storage()
                .instance()
                .set(&DataKey::ReserveB, &(reserve_b - amount_out));
        } else {
            env.storage()
                .instance()
                .set(&DataKey::ReserveB, &(reserve_b + amount_in));
            env.storage()
                .instance()
                .set(&DataKey::ReserveA, &(reserve_a - amount_out));
        }

        env.events()
            .publish((Symbol::new(&env, "swap"), sender), amount_out);

        amount_out
    }

    pub fn reclaim_liquidity(env: Env, provider: Address, share_amount: i128) -> (i128, i128) {
        provider.require_auth();
        if share_amount <= 0 {
            panic!("invalid share amount");
        }

        let user_shares: i128 = env
            .storage()
            .instance()
            .get(&DataKey::LpBalance(provider.clone()))
            .unwrap_or(0);
        if user_shares < share_amount {
            panic!("insufficient LP shares");
        }

        let total_shares: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalLpShares)
            .unwrap_or(0);
        let reserve_a: i128 = env
            .storage()
            .instance()
            .get(&DataKey::ReserveA)
            .unwrap_or(0);
        let reserve_b: i128 = env
            .storage()
            .instance()
            .get(&DataKey::ReserveB)
            .unwrap_or(0);

        let amount_a = (share_amount * reserve_a) / total_shares;
        let amount_b = (share_amount * reserve_b) / total_shares;

        let token_a: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenA)
            .expect("not initialized");
        let token_b: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenB)
            .expect("not initialized");
        let current_contract = env.current_contract_address();

        // Cross-contract call: Transfer token_a back to provider
        env.invoke_contract::<()>(
            &token_a,
            &Symbol::new(&env, "transfer"),
            vec![
                &env,
                current_contract.to_val(),
                provider.to_val(),
                amount_a.into_val(&env),
            ],
        );

        // Cross-contract call: Transfer token_b back to provider
        env.invoke_contract::<()>(
            &token_b,
            &Symbol::new(&env, "transfer"),
            vec![
                &env,
                current_contract.to_val(),
                provider.to_val(),
                amount_b.into_val(&env),
            ],
        );

        env.storage()
            .instance()
            .set(&DataKey::ReserveA, &(reserve_a - amount_a));
        env.storage()
            .instance()
            .set(&DataKey::ReserveB, &(reserve_b - amount_b));
        env.storage()
            .instance()
            .set(&DataKey::TotalLpShares, &(total_shares - share_amount));
        env.storage().instance().set(
            &DataKey::LpBalance(provider.clone()),
            &(user_shares - share_amount),
        );

        env.events()
            .publish((symbol_short!("withdraw"), provider), share_amount);

        (amount_a, amount_b)
    }

    pub fn get_reserves(env: Env) -> (i128, i128) {
        let r_a: i128 = env
            .storage()
            .instance()
            .get(&DataKey::ReserveA)
            .unwrap_or(0);
        let r_b: i128 = env
            .storage()
            .instance()
            .get(&DataKey::ReserveB)
            .unwrap_or(0);
        (r_a, r_b)
    }

    pub fn get_lp_balance(env: Env, provider: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::LpBalance(provider))
            .unwrap_or(0)
    }

    pub fn get_price(env: Env) -> i128 {
        let (r_a, r_b) = Self::get_reserves(env);
        if r_a == 0 {
            0
        } else {
            (r_b * 1_000_000) / r_a
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use aether_token::{AetherToken, AetherTokenClient};
    use soroban_sdk::{testutils::Address as _, Env, String};

    fn setup_test_tokens(
        env: &Env,
        admin: &Address,
    ) -> (
        Address,
        Address,
        AetherTokenClient<'static>,
        AetherTokenClient<'static>,
    ) {
        let token_a_id = env.register_contract(None, AetherToken);
        let token_b_id = env.register_contract(None, AetherToken);

        let client_a = AetherTokenClient::new(env, &token_a_id);
        let client_b = AetherTokenClient::new(env, &token_b_id);

        client_a.initialize(
            admin,
            &7,
            &String::from_str(env, "Aether Token A"),
            &String::from_str(env, "AFTA"),
        );
        client_b.initialize(
            admin,
            &7,
            &String::from_str(env, "Aether Token B"),
            &String::from_str(env, "AFTB"),
        );

        (token_a_id, token_b_id, client_a, client_b)
    }

    #[test]
    fn test_provision_swap_reclaim() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let user = Address::generate(&env);

        let (token_a, token_b, client_a, client_b) = setup_test_tokens(&env, &admin);

        let pool_id = env.register_contract(None, AetherPool);
        let pool_client = AetherPoolClient::new(&env, &pool_id);

        pool_client.initialize(&token_a, &token_b);

        client_a.mint(&user, &1000);
        client_b.mint(&user, &1000);

        let shares = pool_client.provision_liquidity(&user, &1000, &1000);
        assert_eq!(shares, 1000);
        assert_eq!(pool_client.get_reserves(), (1000, 1000));
        assert_eq!(pool_client.get_price(), 1_000_000);

        let trader = Address::generate(&env);
        client_a.mint(&trader, &100);

        let amount_out = pool_client.execute_swap(&trader, &token_a, &100, &1);
        assert!(amount_out > 0);
        assert_eq!(client_b.balance(&trader), amount_out);

        let (rec_a, rec_b) = pool_client.reclaim_liquidity(&user, &1000);
        assert!(rec_a > 0 && rec_b > 0);
    }

    #[test]
    #[should_panic(expected = "slippage exceeded")]
    fn test_slippage_protection() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let user = Address::generate(&env);

        let (token_a, token_b, client_a, client_b) = setup_test_tokens(&env, &admin);
        let pool_id = env.register_contract(None, AetherPool);
        let pool_client = AetherPoolClient::new(&env, &pool_id);

        pool_client.initialize(&token_a, &token_b);
        client_a.mint(&user, &1000);
        client_b.mint(&user, &1000);

        pool_client.provision_liquidity(&user, &1000, &1000);

        let trader = Address::generate(&env);
        client_a.mint(&trader, &100);

        pool_client.execute_swap(&trader, &token_a, &100, &999);
    }
}

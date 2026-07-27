#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, vec, Address, Env, IntoVal, Symbol,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Pool,
    TokenFee,
    ProtocolTreasury,
}

#[contract]
pub struct AetherRouter;

#[contractimpl]
impl AetherRouter {
    pub fn initialize(env: Env, pool: Address, token_fee: Address, protocol_treasury: Address) {
        if env.storage().instance().has(&DataKey::Pool) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Pool, &pool);
        env.storage().instance().set(&DataKey::TokenFee, &token_fee);
        env.storage()
            .instance()
            .set(&DataKey::ProtocolTreasury, &protocol_treasury);
    }

    pub fn batch_swap_with_fee(
        env: Env,
        sender: Address,
        token_in: Address,
        amount_in: i128,
        min_amount_out: i128,
    ) -> i128 {
        sender.require_auth();
        if amount_in <= 0 {
            panic!("amount_in must be positive");
        }

        let pool: Address = env
            .storage()
            .instance()
            .get(&DataKey::Pool)
            .expect("not initialized");
        let token_fee: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenFee)
            .expect("not initialized");
        let protocol_treasury: Address = env
            .storage()
            .instance()
            .get(&DataKey::ProtocolTreasury)
            .expect("not initialized");

        // 1. Nested Cross-Contract Call: Invoke pool.execute_swap
        let amount_out: i128 = env.invoke_contract(
            &pool,
            &Symbol::new(&env, "execute_swap"),
            vec![
                &env,
                sender.to_val(),
                token_in.to_val(),
                amount_in.into_val(&env),
                min_amount_out.into_val(&env),
            ],
        );

        // 2. Nested Cross-Contract Call: Transfer 5% protocol service fee
        let fee = (amount_in * 5) / 100;
        if fee > 0 {
            env.invoke_contract::<()>(
                &token_fee,
                &Symbol::new(&env, "transfer"),
                vec![
                    &env,
                    sender.to_val(),
                    protocol_treasury.to_val(),
                    fee.into_val(&env),
                ],
            );
        }

        env.events()
            .publish((symbol_short!("batch"), sender), amount_out);

        amount_out
    }

    pub fn get_router_config(env: Env) -> (Address, Address, Address) {
        let pool: Address = env
            .storage()
            .instance()
            .get(&DataKey::Pool)
            .expect("not initialized");
        let token_fee: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenFee)
            .expect("not initialized");
        let treasury: Address = env
            .storage()
            .instance()
            .get(&DataKey::ProtocolTreasury)
            .expect("not initialized");
        (pool, token_fee, treasury)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use aether_pool::{AetherPool, AetherPoolClient};
    use aether_token::{AetherToken, AetherTokenClient};
    use soroban_sdk::{testutils::Address as _, Env, String};

    #[test]
    fn test_batch_swap_router() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let treasury = Address::generate(&env);

        let token_a_id = env.register_contract(None, AetherToken);
        let token_b_id = env.register_contract(None, AetherToken);

        let client_a = AetherTokenClient::new(&env, &token_a_id);
        let client_b = AetherTokenClient::new(&env, &token_b_id);

        client_a.initialize(
            &admin,
            &7,
            &String::from_str(&env, "Token A"),
            &String::from_str(&env, "TKNA"),
        );
        client_b.initialize(
            &admin,
            &7,
            &String::from_str(&env, "Token B"),
            &String::from_str(&env, "TKNB"),
        );

        let pool_id = env.register_contract(None, AetherPool);
        let pool_client = AetherPoolClient::new(&env, &pool_id);
        pool_client.initialize(&token_a_id, &token_b_id);

        client_a.mint(&user, &10000);
        client_b.mint(&user, &10000);
        pool_client.provision_liquidity(&user, &5000, &5000);

        let router_id = env.register_contract(None, AetherRouter);
        let router_client = AetherRouterClient::new(&env, &router_id);
        router_client.initialize(&pool_id, &token_a_id, &treasury);

        let (p, t, tr) = router_client.get_router_config();
        assert_eq!(p, pool_id);
        assert_eq!(t, token_a_id);
        assert_eq!(tr, treasury);

        let trader = Address::generate(&env);
        client_a.mint(&trader, &1000);

        let out = router_client.batch_swap_with_fee(&trader, &token_a_id, &100, &1);
        assert!(out > 0);
        assert_eq!(client_a.balance(&treasury), 5); // 5% fee transferred
    }

    #[test]
    #[should_panic(expected = "amount_in must be positive")]
    fn test_zero_amount() {
        let env = Env::default();
        env.mock_all_auths();

        let router_id = env.register_contract(None, AetherRouter);
        let router_client = AetherRouterClient::new(&env, &router_id);

        let pool = Address::generate(&env);
        let token = Address::generate(&env);
        let treasury = Address::generate(&env);
        let user = Address::generate(&env);

        router_client.initialize(&pool, &token, &treasury);
        router_client.batch_swap_with_fee(&user, &token, &0, &1);
    }
}

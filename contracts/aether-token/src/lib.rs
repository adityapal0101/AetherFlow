#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Name,
    Symbol,
    Decimals,
    Balance(Address),
    TotalSupply,
}

#[contract]
pub struct AetherToken;

#[contractimpl]
impl AetherToken {
    pub fn initialize(
        env: Env,
        admin: Address,
        decimal_places: u32,
        token_name: String,
        token_symbol: String,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Decimals, &decimal_places);
        env.storage().instance().set(&DataKey::Name, &token_name);
        env.storage()
            .instance()
            .set(&DataKey::Symbol, &token_symbol);
        env.storage().instance().set(&DataKey::TotalSupply, &0i128);
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized");
        admin.require_auth();
        if amount <= 0 {
            panic!("invalid amount");
        }

        let balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance(to.clone()))
            .unwrap_or(0);
        let new_balance = balance + amount;
        env.storage()
            .instance()
            .set(&DataKey::Balance(to.clone()), &new_balance);

        let supply: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(supply + amount));

        env.events().publish((symbol_short!("mint"), to), amount);
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();
        if amount <= 0 {
            panic!("invalid amount");
        }

        let balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance(from.clone()))
            .unwrap_or(0);
        if balance < amount {
            panic!("insufficient balance");
        }

        let new_balance = balance - amount;
        env.storage()
            .instance()
            .set(&DataKey::Balance(from.clone()), &new_balance);

        let supply: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(supply - amount));

        env.events().publish((symbol_short!("burn"), from), amount);
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        if amount <= 0 {
            panic!("invalid amount");
        }

        let from_balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance(from.clone()))
            .unwrap_or(0);
        if from_balance < amount {
            panic!("insufficient balance");
        }

        env.storage()
            .instance()
            .set(&DataKey::Balance(from.clone()), &(from_balance - amount));

        let to_balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance(to.clone()))
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::Balance(to.clone()), &(to_balance + amount));

        env.events()
            .publish((Symbol::new(&env, "transfer"), from, to), amount);
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Balance(id))
            .unwrap_or(0)
    }

    pub fn total_supply(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }

    pub fn name(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Name)
            .expect("not initialized")
    }

    pub fn symbol(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Symbol)
            .expect("not initialized")
    }

    pub fn decimals(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Decimals)
            .expect("not initialized")
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env, String};

    #[test]
    fn test_mint_transfer_burn() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, AetherToken);
        let client = AetherTokenClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        client.initialize(
            &admin,
            &7,
            &String::from_str(&env, "Aether Token"),
            &String::from_str(&env, "AFT"),
        );

        assert_eq!(client.symbol(), String::from_str(&env, "AFT"));
        assert_eq!(client.decimals(), 7);

        client.mint(&user1, &1000);
        assert_eq!(client.balance(&user1), 1000);
        assert_eq!(client.total_supply(), 1000);

        client.transfer(&user1, &user2, &400);
        assert_eq!(client.balance(&user1), 600);
        assert_eq!(client.balance(&user2), 400);

        client.burn(&user2, &100);
        assert_eq!(client.balance(&user2), 300);
        assert_eq!(client.total_supply(), 900);
    }

    #[test]
    #[should_panic(expected = "insufficient balance")]
    fn test_transfer_insufficient() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, AetherToken);
        let client = AetherTokenClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        client.initialize(
            &admin,
            &7,
            &String::from_str(&env, "Aether Token"),
            &String::from_str(&env, "AFT"),
        );
        client.mint(&user1, &100);
        client.transfer(&user1, &user2, &200);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_init() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, AetherToken);
        let client = AetherTokenClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(
            &admin,
            &7,
            &String::from_str(&env, "Aether Token"),
            &String::from_str(&env, "AFT"),
        );
        client.initialize(
            &admin,
            &7,
            &String::from_str(&env, "Aether Token"),
            &String::from_str(&env, "AFT"),
        );
    }
}

use sha2::{Digest, Sha256};
use std::collections::HashMap;

pub struct MockBlockchain {
    pub chain_id: String,
    pub block_height: u64,
    pub transactions: Vec<MockTransaction>,
    pub contracts: HashMap<String, MockContract>,
    pub accounts: HashMap<String, MockAccount>,
}

#[derive(Clone, Debug)]
pub struct MockTransaction {
    pub tx_hash: String,
    pub from: String,
    pub to: String,
    pub value: u64,
    pub data: Vec<u8>,
    pub status: TransactionStatus,
    pub block_number: u64,
}

#[derive(Clone, Debug, PartialEq)]
pub enum TransactionStatus {
    Pending,
    Confirmed,
    Failed,
}

#[derive(Clone, Debug)]
pub struct MockContract {
    pub address: String,
    pub code: Vec<u8>,
    pub storage: HashMap<String, Vec<u8>>,
}

#[derive(Clone, Debug)]
pub struct MockAccount {
    pub address: String,
    pub balance: u64,
    pub nonce: u64,
}

impl MockBlockchain {
    pub fn new(chain_id: &str) -> Self {
        MockBlockchain {
            chain_id: chain_id.to_string(),
            block_height: 0,
            transactions: Vec::new(),
            contracts: HashMap::new(),
            accounts: HashMap::new(),
        }
    }

    pub fn add_account(&mut self, address: &str, balance: u64) {
        self.accounts.insert(
            address.to_string(),
            MockAccount {
                address: address.to_string(),
                balance,
                nonce: 0,
            },
        );
    }

    pub fn get_balance(&self, address: &str) -> u64 {
        self.accounts.get(address).map(|a| a.balance).unwrap_or(0)
    }

    pub fn transfer(&mut self, from: &str, to: &str, amount: u64) -> Result<String, String> {
        let from_balance = self.get_balance(from);
        if from_balance < amount {
            return Err("Insufficient balance".to_string());
        }

        self.accounts.get_mut(from).unwrap().balance -= amount;
        *self.accounts.get_mut(to).map(|a| &mut a.balance).unwrap() += amount;

        let tx_hash = self.generate_tx_hash(from, to, amount);
        self.transactions.push(MockTransaction {
            tx_hash: tx_hash.clone(),
            from: from.to_string(),
            to: to.to_string(),
            value: amount,
            data: vec![],
            status: TransactionStatus::Confirmed,
            block_number: self.block_height,
        });

        Ok(tx_hash)
    }

    fn generate_tx_hash(&self, from: &str, to: &str, amount: u64) -> String {
        let mut hasher = Sha256::new();
        hasher.update(from.as_bytes());
        hasher.update(to.as_bytes());
        hasher.update(amount.to_le_bytes());
        hex::encode(hasher.finalize())
    }

    pub fn mine_block(&mut self) {
        self.block_height += 1;
    }

    pub fn get_block_height(&self) -> u64 {
        self.block_height
    }
}

pub struct MockStellarNetwork {
    pub network_passphrase: String,
    pub accounts: HashMap<String, MockStellarAccount>,
    pub transactions: Vec<MockStellarTransaction>,
}

#[derive(Clone, Debug)]
pub struct MockStellarAccount {
    pub account_id: String,
    pub sequence: u64,
    pub balances: Vec<MockBalance>,
}

#[derive(Clone, Debug)]
pub struct MockBalance {
    pub asset_type: String,
    pub asset_code: Option<String>,
    pub asset_issuer: Option<String>,
    pub balance: String,
}

#[derive(Clone, Debug)]
pub struct MockStellarTransaction {
    pub tx_hash: String,
    pub source_account: String,
    pub operations: Vec<String>,
    pub result: TransactionResult,
}

#[derive(Clone, Debug)]
pub struct TransactionResult {
    pub success: bool,
    pub fee_charged: u64,
}

impl MockStellarNetwork {
    pub fn new_testnet() -> Self {
        MockStellarNetwork {
            network_passphrase: "Test SDF Future Network ; October 2024".to_string(),
            accounts: HashMap::new(),
            transactions: Vec::new(),
        }
    }

    pub fn new_mainnet() -> Self {
        MockStellarNetwork {
            network_passphrase: "Public Global Stellar Network ; September 2015".to_string(),
            accounts: HashMap::new(),
            transactions: Vec::new(),
        }
    }

    pub fn add_account(&mut self, account_id: &str, xlm_balance: &str) {
        self.accounts.insert(
            account_id.to_string(),
            MockStellarAccount {
                account_id: account_id.to_string(),
                sequence: 0,
                balances: vec![MockBalance {
                    asset_type: "native".to_string(),
                    asset_code: None,
                    asset_issuer: None,
                    balance: xlm_balance.to_string(),
                }],
            },
        );
    }

    pub fn get_xlm_balance(&self, account_id: &str) -> String {
        self.accounts
            .get(account_id)
            .and_then(|a| a.balances.iter().find(|b| b.asset_type == "native"))
            .map(|b| b.balance.clone())
            .unwrap_or_else(|| "0".to_string())
    }
}

pub struct MockBitcoinNetwork {
    pub chain: String,
    pub block_height: u64,
    pub utxos: HashMap<String, Vec<MockUtxo>>,
}

#[derive(Clone, Debug)]
pub struct MockUtxo {
    pub txid: String,
    pub vout: u32,
    pub value: u64,
    pub script_pubkey: String,
}

impl MockBitcoinNetwork {
    pub fn new_testnet() -> Self {
        MockBitcoinNetwork {
            chain: "testnet".to_string(),
            block_height: 0,
            utxos: HashMap::new(),
        }
    }

    pub fn new_mainnet() -> Self {
        MockBitcoinNetwork {
            chain: "mainnet".to_string(),
            block_height: 0,
            utxos: HashMap::new(),
        }
    }

    pub fn add_utxo(&mut self, address: &str, txid: &str, vout: u32, value: u64) {
        let utxo = MockUtxo {
            txid: txid.to_string(),
            vout,
            value,
            script_pubkey: address.to_string(),
        };
        self.utxos
            .entry(address.to_string())
            .or_insert_with(Vec::new)
            .push(utxo);
    }

    pub fn get_balance(&self, address: &str) -> u64 {
        self.utxos
            .get(address)
            .map(|utxos| utxos.iter().map(|u| u.value).sum())
            .unwrap_or(0)
    }
}

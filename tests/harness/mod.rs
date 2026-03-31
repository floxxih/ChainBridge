use soroban_sdk::Env;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

pub struct TestHarness {
    pub env: Env,
    pub contracts: HashMap<String, [u8; 32]>,
    pub accounts: HashMap<String, TestAccount>,
    pub state: Arc<Mutex<TestState>>,
}

#[derive(Clone, Debug)]
pub struct TestAccount {
    pub name: String,
    pub secret_key: [u8; 32],
    pub public_key: [u8; 32],
    pub balances: HashMap<String, i64>,
}

#[derive(Clone, Debug, Default)]
pub struct TestState {
    pub swaps: Vec<SwapState>,
    pub events: Vec<TestEvent>,
    pub current_block: u64,
    pub current_timestamp: u64,
}

#[derive(Clone, Debug)]
pub struct SwapState {
    pub swap_id: String,
    pub initiator: String,
    pub responder: String,
    pub status: SwapStatus,
    pub hashlock: String,
    pub timelock: u64,
    pub secret: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum SwapStatus {
    Pending,
    Initiated,
    LockedInitiator,
    LockedResponder,
    Claimed,
    Cancelled,
    Expired,
}

#[derive(Clone, Debug)]
pub struct TestEvent {
    pub contract: String,
    pub event_type: String,
    pub data: HashMap<String, String>,
    pub timestamp: u64,
}

impl TestHarness {
    pub fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        TestHarness {
            env,
            contracts: HashMap::new(),
            accounts: HashMap::new(),
            state: Arc::new(Mutex::new(TestState::default())),
        }
    }

    pub fn create_account(&mut self, name: &str) -> &TestAccount {
        let (secret, public) = self.generate_keypair();
        let account = TestAccount {
            name: name.to_string(),
            secret_key: secret,
            public_key: public,
            balances: HashMap::new(),
        };
        self.accounts.insert(name.to_string(), account);
        self.accounts.get(name).unwrap()
    }

    fn generate_keypair(&self) -> ([u8; 32], [u8; 32]) {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let mut secret = [0u8; 32];
        let mut public = [0u8; 32];
        rng.fill(&mut secret);
        rng.fill(&mut public);
        (secret, public)
    }

    pub fn advance_time(&self, seconds: u64) {
        let mut state = self.state.lock().unwrap();
        state.current_timestamp += seconds;
        state.current_block += seconds / 5;
    }

    pub fn get_current_timestamp(&self) -> u64 {
        self.state.lock().unwrap().current_timestamp
    }

    pub fn record_event(
        &self,
        contract: String,
        event_type: String,
        data: HashMap<String, String>,
    ) {
        let mut state = self.state.lock().unwrap();
        state.events.push(TestEvent {
            contract,
            event_type,
            data,
            timestamp: state.current_timestamp,
        });
    }

    pub fn get_events(&self) -> Vec<TestEvent> {
        self.state.lock().unwrap().events.clone()
    }
}

impl Default for TestHarness {
    fn default() -> Self {
        Self::new()
    }
}

pub fn setup_test_harness() -> TestHarness {
    TestHarness::new()
}

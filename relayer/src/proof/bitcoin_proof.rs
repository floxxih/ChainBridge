/// Bitcoin SPV proof generation.
///
/// Generates a Simplified Payment Verification proof for a Bitcoin
/// transaction, consisting of the transaction, Merkle branch, and
/// block header. This proof is submitted to the Stellar contract
/// to verify that a Bitcoin HTLC was created or claimed.
use sha2::{Digest, Sha256};

/// An SPV proof for a Bitcoin transaction.
pub struct BitcoinSPVProof {
    pub tx_hash: String,
    pub block_hash: String,
    pub block_height: u64,
    pub merkle_branch: Vec<String>,
    pub tx_index: u32,
}

/// Double-SHA256 hash used in Bitcoin's Merkle tree.
pub fn double_sha256(data: &[u8]) -> Vec<u8> {
    let first = Sha256::digest(data);
    Sha256::digest(&first).to_vec()
}

/// Verify a Merkle branch for a transaction.
pub fn verify_merkle_branch(tx_hash: &[u8], merkle_branch: &[Vec<u8>], tx_index: u32) -> Vec<u8> {
    let mut current = tx_hash.to_vec();
    let mut index = tx_index;

    for branch_hash in merkle_branch {
        let combined = if index % 2 == 0 {
            [current.as_slice(), branch_hash.as_slice()].concat()
        } else {
            [branch_hash.as_slice(), current.as_slice()].concat()
        };
        current = double_sha256(&combined);
        index /= 2;
    }

    current
}

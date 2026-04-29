//! HTLC crypto helpers — secret/preimage generation and hash-lock derivation.

use chrono::{DateTime, Duration, Utc};
use rand::RngCore;
use sha2::{Digest, Sha256};

/// Generate a cryptographically secure hex-encoded secret of `byte_length` bytes (default 32).
pub fn generate_secret(byte_length: usize) -> String {
    let mut buf = vec![0u8; byte_length];
    rand::thread_rng().fill_bytes(&mut buf);
    hex::encode(buf)
}

/// Convenience: 32-byte secret.
pub fn generate_secret_default() -> String {
    generate_secret(32)
}

/// Compute the SHA-256 hash-lock from a hex-encoded secret. Returns hex.
pub fn derive_hash_lock(secret_hex: &str) -> Result<String, hex::FromHexError> {
    let bytes = hex::decode(secret_hex)?;
    let digest = Sha256::digest(&bytes);
    Ok(hex::encode(digest))
}

/// Constant-time check that `secret` hashes to `hash_lock_hex`.
pub fn verify_secret(secret_hex: &str, hash_lock_hex: &str) -> bool {
    match derive_hash_lock(secret_hex) {
        Ok(derived) => constant_time_eq(derived.as_bytes(), hash_lock_hex.to_lowercase().as_bytes()),
        Err(_) => false,
    }
}

/// Compute an absolute UTC expiry timestamp `seconds` in the future.
pub fn expiry_from_now(seconds: i64) -> DateTime<Utc> {
    Utc::now() + Duration::seconds(seconds)
}

/// Recommended timelock split: source receives `total`, destination receives `total / 2`.
pub fn recommended_timelocks(total_seconds: u64) -> (u64, u64) {
    (total_seconds, total_seconds / 2)
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff: u8 = 0;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn secret_is_64_hex_chars() {
        let s = generate_secret_default();
        assert_eq!(s.len(), 64);
        assert!(s.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn hash_lock_round_trips() {
        let s = generate_secret_default();
        let h = derive_hash_lock(&s).unwrap();
        assert!(verify_secret(&s, &h));
    }

    #[test]
    fn hash_lock_rejects_mismatch() {
        let a = generate_secret_default();
        let b = generate_secret_default();
        let hb = derive_hash_lock(&b).unwrap();
        assert!(!verify_secret(&a, &hb));
    }

    #[test]
    fn timelocks_split() {
        assert_eq!(recommended_timelocks(86400), (86400, 43200));
    }

    #[test]
    fn known_sha256_vector() {
        // sha256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
        let h = derive_hash_lock("").unwrap();
        assert_eq!(
            h,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }
}

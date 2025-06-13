use crate::gmail_auth::AuthTokens;
use keyring::{Entry, Error as KeyringError};
use serde::{Deserialize, Serialize};

const SERVICE_NAME: &str = "com.aisle3.app";
const TOKEN_KEY: &str = "gmail_tokens";

/// Secure storage for OAuth tokens using OS keyring
pub struct SecureStorage;

impl SecureStorage {
    /// Save tokens to secure OS keyring
    pub fn save_tokens(tokens: &AuthTokens) -> Result<(), String> {
        let entry = Entry::new(SERVICE_NAME, TOKEN_KEY)
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

        let json = serde_json::to_string(tokens)
            .map_err(|e| format!("Failed to serialize tokens: {}", e))?;

        entry
            .set_password(&json)
            .map_err(|e| format!("Failed to save tokens to keyring: {}", e))?;

        Ok(())
    }

    /// Load tokens from secure OS keyring
    pub fn load_tokens() -> Result<AuthTokens, String> {
        let entry = Entry::new(SERVICE_NAME, TOKEN_KEY)
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

        let json = entry.get_password().map_err(|e| match e {
            KeyringError::NoEntry => "No tokens found in keyring".to_string(),
            _ => format!("Failed to load tokens from keyring: {}", e),
        })?;

        let tokens: AuthTokens = serde_json::from_str(&json)
            .map_err(|e| format!("Failed to deserialize tokens: {}", e))?;

        Ok(tokens)
    }

    /// Delete tokens from secure OS keyring
    pub fn delete_tokens() -> Result<(), String> {
        let entry = Entry::new(SERVICE_NAME, TOKEN_KEY)
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

        entry.delete_password().map_err(|e| match e {
            KeyringError::NoEntry => return Ok(()), // Already deleted
            _ => format!("Failed to delete tokens from keyring: {}", e),
        })?;

        Ok(())
    }

    /// Check if tokens exist in keyring
    pub fn has_tokens() -> bool {
        let entry = match Entry::new(SERVICE_NAME, TOKEN_KEY) {
            Ok(entry) => entry,
            Err(_) => return false,
        };

        entry.get_password().is_ok()
    }

    /// Migrate tokens from old file-based storage to keyring
    pub fn migrate_from_file(file_path: &std::path::Path) -> Result<bool, String> {
        if !file_path.exists() {
            return Ok(false); // No file to migrate
        }

        // Read tokens from file
        let json = std::fs::read_to_string(file_path)
            .map_err(|e| format!("Failed to read token file: {}", e))?;

        let tokens: AuthTokens = serde_json::from_str(&json)
            .map_err(|e| format!("Failed to parse token file: {}", e))?;

        // Save to keyring
        Self::save_tokens(&tokens)?;

        // Delete the old file
        std::fs::remove_file(file_path)
            .map_err(|e| format!("Failed to delete old token file: {}", e))?;

        println!("Migrated tokens from file to secure keyring storage");
        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_storage_lifecycle() {
        // Create test tokens
        let test_tokens = AuthTokens {
            access_token: "test_access_token".to_string(),
            refresh_token: Some("test_refresh_token".to_string()),
            expires_in: Some(3600),
        };

        // Clean up any existing tokens
        let _ = SecureStorage::delete_tokens();

        // Should not have tokens initially
        assert!(!SecureStorage::has_tokens());

        // Save tokens
        SecureStorage::save_tokens(&test_tokens).unwrap();

        // Should have tokens now
        assert!(SecureStorage::has_tokens());

        // Load tokens back
        let loaded_tokens = SecureStorage::load_tokens().unwrap();
        assert_eq!(loaded_tokens.access_token, test_tokens.access_token);
        assert_eq!(loaded_tokens.refresh_token, test_tokens.refresh_token);
        assert_eq!(loaded_tokens.expires_in, test_tokens.expires_in);

        // Clean up
        SecureStorage::delete_tokens().unwrap();
        assert!(!SecureStorage::has_tokens());
    }
}

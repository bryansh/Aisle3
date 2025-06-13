use crate::gmail_auth::AuthTokens;
use keyring::{Entry, Error as KeyringError};

const SERVICE_NAME: &str = "com.aisle3.app";
const TOKEN_KEY: &str = "gmail_tokens";

/// Trait for secure storage backends
pub trait SecureStorageBackend {
    fn save_password(&self, key: &str, password: &str) -> Result<(), String>;
    fn get_password(&self, key: &str) -> Result<String, String>;
    fn delete_password(&self, key: &str) -> Result<(), String>;
    fn has_password(&self, key: &str) -> bool;
}

/// Real keyring implementation
pub struct KeyringBackend;

impl SecureStorageBackend for KeyringBackend {
    fn save_password(&self, _key: &str, password: &str) -> Result<(), String> {
        let entry = Entry::new(SERVICE_NAME, TOKEN_KEY)
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
        entry
            .set_password(password)
            .map_err(|e| format!("Failed to save tokens to keyring: {}", e))?;
        Ok(())
    }

    fn get_password(&self, _key: &str) -> Result<String, String> {
        let entry = Entry::new(SERVICE_NAME, TOKEN_KEY)
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
        entry.get_password().map_err(|e| match e {
            KeyringError::NoEntry => "No tokens found in keyring".to_string(),
            _ => format!("Failed to load tokens from keyring: {}", e),
        })
    }

    fn delete_password(&self, _key: &str) -> Result<(), String> {
        let entry = Entry::new(SERVICE_NAME, TOKEN_KEY)
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
        match entry.delete_password() {
            Ok(()) => Ok(()),
            Err(KeyringError::NoEntry) => Ok(()), // Already deleted
            Err(e) => Err(format!("Failed to delete tokens from keyring: {}", e)),
        }
    }

    fn has_password(&self, _key: &str) -> bool {
        let entry = match Entry::new(SERVICE_NAME, TOKEN_KEY) {
            Ok(entry) => entry,
            Err(_) => return false,
        };
        entry.get_password().is_ok()
    }
}

/// Secure storage for OAuth tokens
pub struct SecureStorage<T: SecureStorageBackend> {
    backend: T,
}

/// Default implementation using real keyring
pub type DefaultSecureStorage = SecureStorage<KeyringBackend>;

impl DefaultSecureStorage {
    pub fn new() -> Self {
        SecureStorage {
            backend: KeyringBackend,
        }
    }
}

impl Default for DefaultSecureStorage {
    fn default() -> Self {
        Self::new()
    }
}

impl<T: SecureStorageBackend> SecureStorage<T> {
    /// Save tokens to secure storage
    pub fn save_tokens(&self, tokens: &AuthTokens) -> Result<(), String> {
        let json = serde_json::to_string(tokens)
            .map_err(|e| format!("Failed to serialize tokens: {}", e))?;

        self.backend.save_password(TOKEN_KEY, &json)
    }

    /// Load tokens from secure storage
    pub fn load_tokens(&self) -> Result<AuthTokens, String> {
        let json = self.backend.get_password(TOKEN_KEY)?;

        let tokens: AuthTokens = serde_json::from_str(&json)
            .map_err(|e| format!("Failed to deserialize tokens: {}", e))?;

        Ok(tokens)
    }

    /// Delete tokens from secure storage
    pub fn delete_tokens(&self) -> Result<(), String> {
        self.backend.delete_password(TOKEN_KEY)
    }

    /// Check if tokens exist in storage
    pub fn has_tokens(&self) -> bool {
        self.backend.has_password(TOKEN_KEY)
    }

    /// Migrate tokens from old file-based storage to keyring
    pub fn migrate_from_file(&self, file_path: &std::path::Path) -> Result<bool, String> {
        if !file_path.exists() {
            return Ok(false); // No file to migrate
        }

        // Read tokens from file
        let json = std::fs::read_to_string(file_path)
            .map_err(|e| format!("Failed to read token file: {}", e))?;

        let tokens: AuthTokens = serde_json::from_str(&json)
            .map_err(|e| format!("Failed to parse token file: {}", e))?;

        // Save to keyring
        self.save_tokens(&tokens)?;

        // Delete the old file
        std::fs::remove_file(file_path)
            .map_err(|e| format!("Failed to delete old token file: {}", e))?;

        println!("Migrated tokens from file to secure keyring storage");
        Ok(true)
    }
}

// Static methods for backward compatibility
impl DefaultSecureStorage {
    /// Save tokens to secure OS keyring (static method for backward compatibility)
    pub fn save_tokens_static(tokens: &AuthTokens) -> Result<(), String> {
        let storage = Self::new();
        storage.save_tokens(tokens)
    }

    /// Load tokens from secure OS keyring (static method for backward compatibility)
    pub fn load_tokens_static() -> Result<AuthTokens, String> {
        let storage = Self::new();
        storage.load_tokens()
    }

    /// Delete tokens from secure OS keyring (static method for backward compatibility)
    pub fn delete_tokens_static() -> Result<(), String> {
        let storage = Self::new();
        storage.delete_tokens()
    }

    /// Check if tokens exist in keyring (static method for backward compatibility)
    pub fn has_tokens_static() -> bool {
        let storage = Self::new();
        storage.has_tokens()
    }

    /// Migrate tokens from old file-based storage to keyring (static method for backward compatibility)
    pub fn migrate_from_file_static(file_path: &std::path::Path) -> Result<bool, String> {
        let storage = Self::new();
        storage.migrate_from_file(file_path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::sync::Mutex;

    /// Mock storage backend for testing
    struct MockStorageBackend {
        storage: Mutex<HashMap<String, String>>,
    }

    impl MockStorageBackend {
        fn new() -> Self {
            Self {
                storage: Mutex::new(HashMap::new()),
            }
        }
    }

    impl SecureStorageBackend for MockStorageBackend {
        fn save_password(&self, key: &str, password: &str) -> Result<(), String> {
            let mut storage = self.storage.lock().unwrap();
            storage.insert(key.to_string(), password.to_string());
            Ok(())
        }

        fn get_password(&self, key: &str) -> Result<String, String> {
            let storage = self.storage.lock().unwrap();
            storage
                .get(key)
                .cloned()
                .ok_or_else(|| "No tokens found in storage".to_string())
        }

        fn delete_password(&self, key: &str) -> Result<(), String> {
            let mut storage = self.storage.lock().unwrap();
            storage.remove(key);
            Ok(())
        }

        fn has_password(&self, key: &str) -> bool {
            let storage = self.storage.lock().unwrap();
            storage.contains_key(key)
        }
    }

    #[test]
    fn test_token_storage_lifecycle() {
        // Use mock storage for testing
        let storage = SecureStorage {
            backend: MockStorageBackend::new(),
        };

        // Create test tokens
        let test_tokens = AuthTokens {
            access_token: "test_access_token".to_string(),
            refresh_token: Some("test_refresh_token".to_string()),
            expires_in: Some(3600),
        };

        // Clean up any existing tokens
        let _ = storage.delete_tokens();

        // Should not have tokens initially
        assert!(!storage.has_tokens());

        // Save tokens
        storage.save_tokens(&test_tokens).unwrap();

        // Should have tokens now
        assert!(storage.has_tokens());

        // Load tokens back
        let loaded_tokens = storage.load_tokens().unwrap();
        assert_eq!(loaded_tokens.access_token, test_tokens.access_token);
        assert_eq!(loaded_tokens.refresh_token, test_tokens.refresh_token);
        assert_eq!(loaded_tokens.expires_in, test_tokens.expires_in);

        // Clean up
        storage.delete_tokens().unwrap();
        assert!(!storage.has_tokens());
    }
}

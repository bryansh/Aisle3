use aisle3::gmail_auth::AuthTokens;

/// Shared test helper to create test auth tokens
pub fn create_test_tokens() -> AuthTokens {
    AuthTokens {
        access_token: "test_access_token".to_string(),
        refresh_token: Some("test_refresh_token".to_string()),
        expires_in: Some(3600), // 1 hour in seconds
    }
}

// Note: create_expired_tokens() was removed as it was unused
// Add it back if needed for future tests

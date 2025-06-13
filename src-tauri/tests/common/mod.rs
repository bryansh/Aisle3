use aisle3::gmail_auth::AuthTokens;

/// Shared test helper to create test auth tokens
pub fn create_test_tokens() -> AuthTokens {
    AuthTokens {
        access_token: "test_access_token".to_string(),
        refresh_token: Some("test_refresh_token".to_string()),
        expires_in: Some(3600), // 1 hour in seconds
    }
}

/// Shared test helper to create expired auth tokens
pub fn create_expired_tokens() -> AuthTokens {
    AuthTokens {
        access_token: "expired_access_token".to_string(),
        refresh_token: Some("expired_refresh_token".to_string()),
        expires_in: Some(0), // Already expired
    }
}

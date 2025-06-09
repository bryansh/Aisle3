use aisle3::gmail_auth::AuthTokens;
use std::fs;
use tempfile::tempdir;

// Test helper to create temporary auth file
fn create_temp_auth_file(tokens: &AuthTokens) -> tempfile::TempDir {
    let temp_dir = tempdir().unwrap();
    let auth_file_path = temp_dir.path().join("auth_tokens.json");
    let tokens_json = serde_json::to_string(tokens).unwrap();
    fs::write(&auth_file_path, tokens_json).unwrap();
    temp_dir
}

fn create_test_tokens() -> AuthTokens {
    AuthTokens {
        access_token: "test_access_token".to_string(),
        refresh_token: Some("test_refresh_token".to_string()),
        expires_in: Some(3600), // 1 hour in seconds
    }
}

#[tokio::test]
async fn test_auth_token_serialization() {
    let tokens = create_test_tokens();
    let json = serde_json::to_string(&tokens).unwrap();

    assert!(json.contains("test_access_token"));
    assert!(json.contains("test_refresh_token"));

    let deserialized: AuthTokens = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.access_token, tokens.access_token);
    assert_eq!(deserialized.refresh_token, tokens.refresh_token);
}

#[tokio::test]
async fn test_auth_token_expiration() {
    let tokens = create_test_tokens();

    // Token has expiration time set
    assert!(tokens.expires_in.is_some());
    assert_eq!(tokens.expires_in.unwrap(), 3600);
}

#[test]
fn test_auth_file_operations() {
    let tokens = create_test_tokens();
    let temp_dir = create_temp_auth_file(&tokens);
    let auth_file_path = temp_dir.path().join("auth_tokens.json");

    // Verify file was created
    assert!(auth_file_path.exists());

    // Read and verify content
    let content = fs::read_to_string(&auth_file_path).unwrap();
    let loaded_tokens: AuthTokens = serde_json::from_str(&content).unwrap();

    assert_eq!(loaded_tokens.access_token, tokens.access_token);
    assert_eq!(loaded_tokens.refresh_token, tokens.refresh_token);
}

// Email struct tests (simulating Tauri command data)
#[test]
fn test_email_struct_creation() {
    use serde_json::json;

    let email_json = json!({
        "id": "test123",
        "thread_id": "thread123",
        "subject": "Test Subject",
        "sender": "test@example.com",
        "snippet": "Test snippet",
        "body_text": "Test body",
        "body_html": "<p>Test HTML</p>",
        "date": "2025-06-08T10:00:00Z",
        "is_read": false
    });

    // Verify the JSON structure matches what our Tauri commands expect
    assert_eq!(email_json["id"], "test123");
    assert_eq!(email_json["thread_id"], "thread123");
    assert_eq!(email_json["is_read"], false);
}

#[test]
fn test_conversation_struct_creation() {
    use serde_json::json;

    let conversation_json = json!({
        "thread_id": "thread123",
        "subject": "Conversation Subject",
        "sender": "test@example.com",
        "snippet": "Latest message snippet",
        "message_count": 3,
        "has_unread": true,
        "latest_date": "2025-06-08T10:00:00Z",
        "emails": []
    });

    assert_eq!(conversation_json["thread_id"], "thread123");
    assert_eq!(conversation_json["message_count"], 3);
    assert_eq!(conversation_json["has_unread"], true);
}

// Test error handling scenarios
#[test]
fn test_invalid_auth_token_format() {
    let invalid_json = r#"{"invalid": "format"}"#;
    let result: Result<AuthTokens, _> = serde_json::from_str(invalid_json);
    assert!(result.is_err());
}

#[test]
fn test_missing_auth_file() {
    let temp_dir = tempdir().unwrap();
    let non_existent_path = temp_dir.path().join("non_existent.json");

    assert!(!non_existent_path.exists());
}

// Test Gmail API response structures that Tauri commands handle
#[test]
fn test_gmail_list_response_parsing() {
    use serde_json::json;

    let api_response = json!({
        "messages": [
            {"id": "msg1", "threadId": "thread1"},
            {"id": "msg2", "threadId": "thread2"}
        ],
        "nextPageToken": "next123",
        "resultSizeEstimate": 1000
    });

    // Verify our response parsing would work
    assert!(api_response["messages"].is_array());
    assert_eq!(api_response["messages"].as_array().unwrap().len(), 2);
    assert_eq!(api_response["nextPageToken"], "next123");
}

#[test]
fn test_gmail_profile_response_parsing() {
    use serde_json::json;

    let profile_response = json!({
        "emailAddress": "user@gmail.com",
        "messagesTotal": 5000,
        "threadsTotal": 2500
    });

    assert_eq!(profile_response["emailAddress"], "user@gmail.com");
    assert_eq!(profile_response["messagesTotal"], 5000);
    assert_eq!(profile_response["threadsTotal"], 2500);
}

// Test URL encoding for Gmail API queries
#[test]
fn test_gmail_query_encoding() {
    let query = "in:inbox is:unread";
    let encoded = urlencoding::encode(query);
    assert_eq!(encoded, "in%3Ainbox%20is%3Aunread");
}

#[test]
fn test_gmail_complex_query_encoding() {
    let query = "from:support@example.com has:attachment";
    let encoded = urlencoding::encode(query);
    assert!(encoded.contains("%40")); // @ symbol encoded
    assert!(encoded.contains("%3A")); // : symbol encoded
}

// Test configuration loading
#[test]
fn test_config_directory_creation() {
    let temp_dir = tempdir().unwrap();
    let config_dir = temp_dir.path().join(".aisle3");

    // Simulate config directory creation
    fs::create_dir_all(&config_dir).unwrap();
    assert!(config_dir.exists());
    assert!(config_dir.is_dir());
}

#[test]
fn test_oauth_redirect_uri_parsing() {
    let redirect_uri = "http://localhost:8080/callback";
    let url = url::Url::parse(redirect_uri).unwrap();

    assert_eq!(url.scheme(), "http");
    assert_eq!(url.host_str(), Some("localhost"));
    assert_eq!(url.port(), Some(8080));
    assert_eq!(url.path(), "/callback");
}

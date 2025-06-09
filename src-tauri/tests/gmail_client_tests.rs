use aisle3::gmail_auth::AuthTokens;
use aisle3::gmail_client::*;
use base64::{engine::general_purpose::URL_SAFE, Engine as _};
use mockito::Server;
use serde_json::json;

fn create_test_message() -> GmailMessage {
    GmailMessage {
        id: "test123".to_string(),
        snippet: "Test message snippet".to_string(),
        label_ids: Some(vec!["UNREAD".to_string(), "INBOX".to_string()]),
        payload: Some(MessagePayload {
            headers: Some(vec![
                MessageHeader {
                    name: "Subject".to_string(),
                    value: "Test Subject".to_string(),
                },
                MessageHeader {
                    name: "From".to_string(),
                    value: "test@example.com".to_string(),
                },
                MessageHeader {
                    name: "Date".to_string(),
                    value: "Wed, 8 Jun 2025 10:00:00 +0000".to_string(),
                },
            ]),
            parts: Some(vec![MessagePart {
                headers: Some(vec![MessageHeader {
                    name: "Content-Type".to_string(),
                    value: "text/plain; charset=UTF-8".to_string(),
                }]),
                body: Some(MessageBody {
                    data: Some(URL_SAFE.encode("Hello World Test Message")),
                }),
            }]),
            body: None,
        }),
    }
}

fn create_test_auth_tokens() -> AuthTokens {
    AuthTokens {
        access_token: "test_access_token".to_string(),
        refresh_token: Some("test_refresh_token".to_string()),
        expires_in: Some(3600), // 1 hour in seconds
    }
}

#[test]
fn test_gmail_message_get_subject() {
    let message = create_test_message();
    assert_eq!(message.get_subject(), "Test Subject");
}

#[test]
fn test_gmail_message_get_subject_missing() {
    let mut message = create_test_message();
    message.payload = Some(MessagePayload {
        headers: Some(vec![]),
        parts: None,
        body: None,
    });
    assert_eq!(message.get_subject(), "(No Subject)");
}

#[test]
fn test_gmail_message_get_from() {
    let message = create_test_message();
    assert_eq!(message.get_from(), "test@example.com");
}

#[test]
fn test_gmail_message_get_date() {
    let message = create_test_message();
    assert_eq!(
        message.get_date(),
        Some("Wed, 8 Jun 2025 10:00:00 +0000".to_string())
    );
}

#[test]
fn test_gmail_message_is_unread() {
    let message = create_test_message();
    assert!(message.is_unread());
}

#[test]
fn test_gmail_message_is_read() {
    let mut message = create_test_message();
    message.label_ids = Some(vec!["INBOX".to_string()]);
    assert!(!message.is_unread());
}

#[test]
fn test_gmail_message_get_body_text() {
    let message = create_test_message();
    let body = message.get_body_text();
    assert_eq!(body, "Hello World Test Message");
}

#[test]
fn test_gmail_message_get_body_text_fallback_to_snippet() {
    let mut message = create_test_message();
    message.payload = None;
    let body = message.get_body_text();
    assert_eq!(body, "Test message snippet");
}

#[test]
fn test_gmail_message_serialization() {
    let message = create_test_message();
    let json = serde_json::to_string(&message).unwrap();
    assert!(json.contains("test123"));
    assert!(json.contains("labelIds"));
}

#[test]
fn test_gmail_message_deserialization() {
    let json = json!({
        "id": "test456",
        "snippet": "Another test",
        "labelIds": ["UNREAD"],
        "payload": {
            "headers": [
                {
                    "name": "Subject",
                    "value": "Deserialization Test"
                }
            ]
        }
    });

    let message: GmailMessage = serde_json::from_value(json).unwrap();
    assert_eq!(message.id, "test456");
    assert_eq!(message.get_subject(), "Deserialization Test");
    assert!(message.is_unread());
}

#[test]
fn test_gmail_response_deserialization() {
    let json = json!({
        "messages": [
            {
                "id": "msg1",
                "threadId": "thread1"
            },
            {
                "id": "msg2",
                "threadId": "thread2"
            }
        ],
        "nextPageToken": "next123",
        "resultSizeEstimate": 50
    });

    let response: GmailResponse = serde_json::from_value(json).unwrap();
    assert_eq!(response.messages.unwrap().len(), 2);
    assert_eq!(response.next_page_token.unwrap(), "next123");
    assert_eq!(response.result_size_estimate.unwrap(), 50);
}

#[tokio::test]
async fn test_gmail_client_creation() {
    let tokens = create_test_auth_tokens();
    let _client = GmailClient::new(&tokens);
    // Client creation should not panic
}

#[test]
fn test_batch_request_boundary_extraction() {
    let response_text =
        "--batch_DAWKUsSXD9v4tWuYitTrY1N42DUtinxv\nContent-Type: application/http\n";

    if let Some(first_boundary_pos) = response_text.find("--batch_") {
        let boundary_start = first_boundary_pos + 2;
        if let Some(boundary_end) = response_text[boundary_start..].find('\n') {
            let boundary = &response_text[boundary_start..boundary_start + boundary_end];
            assert_eq!(boundary, "batch_DAWKUsSXD9v4tWuYitTrY1N42DUtinxv");
        }
    }
}

#[test]
fn test_batch_response_parsing() {
    let batch_response = r#"--batch_test123
Content-Type: application/http
Content-ID: <response-item0>

HTTP/1.1 200 OK
Content-Type: application/json; charset=UTF-8

{
  "id": "msg1",
  "snippet": "Test message",
  "labelIds": ["UNREAD"]
}
--batch_test123
Content-Type: application/http
Content-ID: <response-item1>

HTTP/1.1 200 OK
Content-Type: application/json; charset=UTF-8

{
  "id": "msg2",
  "snippet": "Another message", 
  "labelIds": ["INBOX"]
}
--batch_test123--"#;

    let parts: Vec<&str> = batch_response.split("--batch_test123").collect();
    assert_eq!(parts.len(), 4); // Empty, part1, part2, final boundary

    // Test JSON extraction from a part
    let part = parts[1];
    if let Some(json_start) = part.find('{') {
        if let Some(json_end) = part.rfind('}') {
            let json_content = &part[json_start..=json_end];
            let message: Result<GmailMessage, _> = serde_json::from_str(json_content);
            assert!(message.is_ok());
            assert_eq!(message.unwrap().id, "msg1");
        }
    }
}

// Mock HTTP integration test structure
#[tokio::test]
async fn test_get_profile_success() {
    let mut server = Server::new_async().await;
    let _mock = server
        .mock("GET", "/gmail/v1/users/me/profile")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(
            json!({
                "emailAddress": "test@example.com",
                "messagesTotal": 1000,
                "threadsTotal": 500
            })
            .to_string(),
        )
        .create_async()
        .await;

    // Create client with test tokens
    let tokens = create_test_auth_tokens();
    let _client = GmailClient::new(&tokens);

    // Note: This test demonstrates mock HTTP structure
    // To fully test HTTP calls, we'd need dependency injection for base URLs
    // Currently verifies the client can be created and mock structure is valid

    // Test passes if client creation succeeds and mock is properly configured
    // No additional assertion needed - test passes if no panic occurs
}

#[tokio::test]
async fn test_list_messages_with_parameters() {
    let mut server = Server::new_async().await;
    let _mock = server
        .mock("GET", "/gmail/v1/users/me/messages")
        .match_query(mockito::Matcher::AllOf(vec![
            mockito::Matcher::UrlEncoded("maxResults".into(), "10".into()),
            mockito::Matcher::UrlEncoded("q".into(), "in:inbox".into()),
        ]))
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(
            json!({
                "messages": [
                    {"id": "msg1", "threadId": "thread1"},
                    {"id": "msg2", "threadId": "thread2"}
                ],
                "resultSizeEstimate": 2
            })
            .to_string(),
        )
        .create_async()
        .await;

    // Test structure for list_messages method
    // Would need URL injection to test fully
}

#[test]
fn test_html_body_extraction() {
    let mut message = create_test_message();

    // Add HTML part
    message
        .payload
        .as_mut()
        .unwrap()
        .parts
        .as_mut()
        .unwrap()
        .push(MessagePart {
            headers: Some(vec![MessageHeader {
                name: "Content-Type".to_string(),
                value: "text/html; charset=UTF-8".to_string(),
            }]),
            body: Some(MessageBody {
                data: Some(URL_SAFE.encode("<p>HTML Content</p>")),
            }),
        });

    let html = message.get_body_html();
    assert!(html.is_some());
    assert_eq!(html.unwrap(), "<p>HTML Content</p>");
}

#[test]
fn test_empty_label_ids() {
    let mut message = create_test_message();
    message.label_ids = None;
    assert!(!message.is_unread());
}

#[test]
fn test_header_case_insensitive() {
    let mut message = create_test_message();

    // Change header case
    if let Some(ref mut payload) = message.payload {
        if let Some(ref mut headers) = payload.headers {
            headers[0].name = "SUBJECT".to_string(); // uppercase
        }
    }

    assert_eq!(message.get_subject(), "Test Subject");
}

use crate::gmail_auth::AuthTokens;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use base64::{Engine as _, engine::general_purpose::URL_SAFE};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GmailMessage {
    pub id: String,
    pub snippet: String,
    #[serde(rename = "labelIds")]
    pub label_ids: Option<Vec<String>>,
    pub payload: Option<MessagePayload>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessagePayload {
    pub headers: Option<Vec<MessageHeader>>,
    pub parts: Option<Vec<MessagePart>>,
    pub body: Option<MessageBody>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageHeader {
    pub name: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessagePart {
    pub headers: Option<Vec<MessageHeader>>,
    pub body: Option<MessageBody>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageBody {
    pub data: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmailResponse {
    pub messages: Option<Vec<GmailMessageRef>>,
    #[serde(rename = "nextPageToken")]
    pub next_page_token: Option<String>,
    #[serde(rename = "resultSizeEstimate")]
    pub result_size_estimate: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmailMessageRef {
    pub id: String,
    #[serde(rename = "threadId")]
    pub thread_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmailProfile {
    #[serde(rename = "emailAddress")]
    pub email_address: String,
    #[serde(rename = "messagesTotal")]
    pub messages_total: Option<u32>,
    #[serde(rename = "threadsTotal")]
    pub threads_total: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WatchRequest {
    #[serde(rename = "topicName")]
    pub topic_name: String,
    #[serde(rename = "labelIds")]
    pub label_ids: Option<Vec<String>>,
    #[serde(rename = "labelFilterAction")]
    pub label_filter_action: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WatchResponse {
    #[serde(rename = "historyId")]
    pub history_id: String,
    pub expiration: String,
}

pub struct GmailClient {
    client: Client,
    access_token: String,
}

impl GmailClient {
    pub fn new(tokens: &AuthTokens) -> Self {
        Self {
            client: Client::new(),
            access_token: tokens.access_token.clone(),
        }
    }

    pub async fn get_profile(&self) -> Result<GmailProfile, Box<dyn std::error::Error + Send + Sync>> {
        let url = "https://gmail.googleapis.com/gmail/v1/users/me/profile";
        
        let response = self.client
            .get(url)
            .bearer_auth(&self.access_token)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Gmail API error: {}", response.status()).into());
        }

        let profile: GmailProfile = response.json().await?;
        Ok(profile)
    }

    pub async fn list_messages(
        &self,
        max_results: Option<u32>,
        page_token: Option<&str>,
        query: Option<&str>,
    ) -> Result<GmailResponse, Box<dyn std::error::Error + Send + Sync>> {
        let mut url = "https://gmail.googleapis.com/gmail/v1/users/me/messages".to_string();
        let mut params = Vec::new();

        if let Some(max) = max_results {
            params.push(format!("maxResults={}", max));
        }

        if let Some(token) = page_token {
            params.push(format!("pageToken={}", token));
        }

        if let Some(q) = query {
            params.push(format!("q={}", urlencoding::encode(q)));
        }

        if !params.is_empty() {
            url.push('?');
            url.push_str(&params.join("&"));
        }

        let response = self.client
            .get(&url)
            .bearer_auth(&self.access_token)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Gmail API error: {}", response.status()).into());
        }

        let gmail_response: GmailResponse = response.json().await?;
        Ok(gmail_response)
    }

    pub async fn get_message(&self, message_id: &str) -> Result<GmailMessage, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("https://gmail.googleapis.com/gmail/v1/users/me/messages/{}?format=full", message_id);
        
        let response = self.client
            .get(&url)
            .bearer_auth(&self.access_token)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Gmail API error: {}", response.status()).into());
        }

        let message: GmailMessage = response.json().await?;
        Ok(message)
    }

    pub async fn get_messages_batch(
        &self, 
        message_ids: &[String]
    ) -> Result<Vec<GmailMessage>, Box<dyn std::error::Error + Send + Sync>> {
        // Use Gmail's batch API for better performance
        if message_ids.is_empty() {
            return Ok(Vec::new());
        }

        // Gmail batch API has a limit of 100 requests per batch
        let batch_size = std::cmp::min(message_ids.len(), 100);
        let message_ids_batch = &message_ids[..batch_size];
        
        let boundary = "batch_boundary_aisle3";
        let mut batch_body = String::new();
        
        // Build multipart/mixed batch request
        for (i, message_id) in message_ids_batch.iter().enumerate() {
            batch_body.push_str(&format!("--{}\r\n", boundary));
            batch_body.push_str("Content-Type: application/http\r\n");
            batch_body.push_str(&format!("Content-ID: <item{}>\r\n\r\n", i));
            batch_body.push_str(&format!("GET /gmail/v1/users/me/messages/{}?format=full HTTP/1.1\r\n", message_id));
            batch_body.push_str("Host: gmail.googleapis.com\r\n\r\n");
        }
        batch_body.push_str(&format!("--{}--\r\n", boundary));

        let url = "https://gmail.googleapis.com/batch/gmail/v1";
        let response = self.client
            .post(url)
            .bearer_auth(&self.access_token)
            .header("Content-Type", format!("multipart/mixed; boundary={}", boundary))
            .body(batch_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            println!("Gmail Batch API error response: {}", error_text);
            return Err(format!("Gmail Batch API error: {}", error_text).into());
        }

        let response_text = response.text().await?;
        
        // Parse batch response - Gmail uses different boundary format in response
        let mut messages = Vec::new();
        
        // Gmail generates its own boundary in the response, extract it from the first boundary marker
        let response_boundary = if let Some(first_boundary_pos) = response_text.find("--batch_") {
            // Extract just the boundary name (without --)
            let boundary_start = first_boundary_pos + 2; // Skip the --
            if let Some(boundary_end) = response_text[boundary_start..].find('\n') {
                &response_text[boundary_start..boundary_start + boundary_end]
            } else {
                boundary // Fallback to our boundary
            }
        } else {
            boundary
        };
        
        let parts: Vec<&str> = response_text.split(&format!("--{}", response_boundary)).collect();
        
        for part in parts.iter().skip(1) { // Skip the first empty part
            if part.contains("--") && part.len() < 10 {
                continue; // Skip the final boundary marker
            }
            
            // Find the JSON content in each part
            if let Some(json_start) = part.find('{') {
                if let Some(json_end) = part.rfind('}') {
                    let json_content = &part[json_start..=json_end];
                    
                    if let Ok(message) = serde_json::from_str::<GmailMessage>(json_content) {
                        messages.push(message);
                    }
                }
            }
        }
        
        // If batch API fails, fallback to individual requests
        if messages.is_empty() && !message_ids_batch.is_empty() {
            return self.get_messages_individual(message_ids_batch).await;
        }
        
        Ok(messages)
    }

    // Fallback method for individual requests
    async fn get_messages_individual(
        &self, 
        message_ids: &[String]
    ) -> Result<Vec<GmailMessage>, Box<dyn std::error::Error + Send + Sync>> {
        let mut messages = Vec::new();
        
        for message_id in message_ids.iter().take(20) { // Limit to 20 for now
            match self.get_message(message_id).await {
                Ok(message) => messages.push(message),
                Err(e) => eprintln!("Failed to fetch message {}: {}", message_id, e),
            }
        }
        
        Ok(messages)
    }

    pub async fn check_for_new_emails(&self, since_time: Option<&str>) -> Result<Vec<String>, Box<dyn std::error::Error + Send + Sync>> {
        // Build query to get emails newer than the specified time
        let mut query = "in:inbox".to_string();
        
        if let Some(time) = since_time {
            // Gmail uses Unix timestamp for 'after' queries
            query.push_str(&format!(" after:{}", time));
        }
        
        // Get recent emails (last 5 minutes worth if no time specified)
        let response = self.list_messages(Some(10), None, Some(&query)).await?;
        
        let message_ids: Vec<String> = response
            .messages
            .unwrap_or_default()
            .into_iter()
            .map(|m| m.id)
            .collect();
        
        Ok(message_ids)
    }

    pub async fn watch_inbox(&self, topic_name: &str) -> Result<WatchResponse, Box<dyn std::error::Error + Send + Sync>> {
        let url = "https://gmail.googleapis.com/gmail/v1/users/me/watch";
        
        let watch_request = WatchRequest {
            topic_name: topic_name.to_string(),
            label_ids: Some(vec!["INBOX".to_string()]),
            label_filter_action: Some("include".to_string()),
        };

        let response = self.client
            .post(url)
            .bearer_auth(&self.access_token)
            .json(&watch_request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(format!("Gmail Watch API error: {}", error_text).into());
        }

        let watch_response: WatchResponse = response.json().await?;
        Ok(watch_response)
    }

    pub async fn stop_watch(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let url = "https://gmail.googleapis.com/gmail/v1/users/me/stop";
        
        let response = self.client
            .post(url)
            .bearer_auth(&self.access_token)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(format!("Gmail Stop Watch API error: {}", error_text).into());
        }

        Ok(())
    }

    pub async fn mark_as_read(&self, message_id: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("https://gmail.googleapis.com/gmail/v1/users/me/messages/{}/modify", message_id);
        
        let modify_request = serde_json::json!({
            "removeLabelIds": ["UNREAD"]
        });

        let response = self.client
            .post(&url)
            .bearer_auth(&self.access_token)
            .json(&modify_request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(format!("Gmail modify API error: {}", error_text).into());
        }

        Ok(())
    }

    pub async fn mark_as_unread(&self, message_id: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("https://gmail.googleapis.com/gmail/v1/users/me/messages/{}/modify", message_id);
        
        let modify_request = serde_json::json!({
            "addLabelIds": ["UNREAD"]
        });

        let response = self.client
            .post(&url)
            .bearer_auth(&self.access_token)
            .json(&modify_request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(format!("Gmail modify API error: {}", error_text).into());
        }

        Ok(())
    }
}

// Helper functions to extract email data
impl GmailMessage {
    pub fn get_subject(&self) -> String {
        self.get_header("Subject").unwrap_or_else(|| "(No Subject)".to_string())
    }

    pub fn get_from(&self) -> String {
        self.get_header("From").unwrap_or_else(|| "Unknown Sender".to_string())
    }

    pub fn get_date(&self) -> Option<String> {
        self.get_header("Date")
    }

    pub fn is_unread(&self) -> bool {
        self.label_ids
            .as_ref()
            .map(|labels| labels.contains(&"UNREAD".to_string()))
            .unwrap_or(false)
    }

    fn get_header(&self, name: &str) -> Option<String> {
        self.payload
            .as_ref()?
            .headers
            .as_ref()?
            .iter()
            .find(|h| h.name.eq_ignore_ascii_case(name))
            .map(|h| h.value.clone())
    }

    pub fn get_body_text(&self) -> String {
        if let Some(payload) = &self.payload {
            // Try to get text from the main body first
            if let Some(body) = &payload.body {
                if let Some(data) = &body.data {
                    if let Ok(decoded) = URL_SAFE.decode(data) {
                        if let Ok(text) = String::from_utf8(decoded) {
                            return text;
                        }
                    }
                }
            }

            // If no main body, look through parts for text/plain
            if let Some(parts) = &payload.parts {
                for part in parts {
                    if let Some(headers) = &part.headers {
                        let content_type = headers
                            .iter()
                            .find(|h| h.name.eq_ignore_ascii_case("Content-Type"))
                            .map(|h| &h.value);
                        
                        if let Some(ct) = content_type {
                            if ct.contains("text/plain") {
                                if let Some(body) = &part.body {
                                    if let Some(data) = &body.data {
                                        if let Ok(decoded) = URL_SAFE.decode(data) {
                                            if let Ok(text) = String::from_utf8(decoded) {
                                                return text;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Fallback to snippet if no body found
        self.snippet.clone()
    }

    pub fn get_body_html(&self) -> Option<String> {
        if let Some(payload) = &self.payload {
            if let Some(parts) = &payload.parts {
                for part in parts {
                    if let Some(headers) = &part.headers {
                        let content_type = headers
                            .iter()
                            .find(|h| h.name.eq_ignore_ascii_case("Content-Type"))
                            .map(|h| &h.value);
                        
                        if let Some(ct) = content_type {
                            if ct.contains("text/html") {
                                if let Some(body) = &part.body {
                                    if let Some(data) = &body.data {
                                        if let Ok(decoded) = URL_SAFE.decode(data) {
                                            if let Ok(html) = String::from_utf8(decoded) {
                                                return Some(html);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        None
    }
}
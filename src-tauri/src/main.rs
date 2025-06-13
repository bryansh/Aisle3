// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod gmail_auth;
mod gmail_client;
mod gmail_config;
mod rate_limiter;
mod secure_storage;

use gmail_auth::{parse_callback_url, AuthTokens, GmailAuth};
use gmail_client::GmailClient;
use rate_limiter::RateLimiter;
use secure_storage::SecureStorage;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;
use tauri_plugin_updater::UpdaterExt;

struct AppState {
    gmail_auth: Mutex<Option<GmailAuth>>,
    auth_tokens: Mutex<Option<AuthTokens>>,
    last_check_time: Mutex<Option<String>>, // Store last email check timestamp
    rate_limiter: RateLimiter,
}

#[derive(Debug, Serialize, Deserialize)]
struct Email {
    id: String,
    thread_id: String,
    subject: String,
    sender: String,
    snippet: String,
    is_read: bool,
}

#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<String, String> {
    println!("Install update called");

    let updater = app.updater().map_err(|e| {
        println!("Updater error: {}", e);
        format!("Updater not available: {}", e)
    })?;

    println!("Checking for updates...");
    match updater.check().await {
        Ok(Some(update)) => {
            println!("Update found, attempting to download and install...");

            let on_chunk = |chunk_length: usize, content_length: Option<u64>| {
                println!(
                    "Downloaded chunk: {} bytes, total: {:?}",
                    chunk_length, content_length
                );
            };

            let on_download_finish = || {
                println!("Update download completed!");
            };

            match update
                .download_and_install(on_chunk, on_download_finish)
                .await
            {
                Ok(_) => {
                    println!("Update installed successfully!");
                    Ok("Update installed successfully! Please restart the app.".to_string())
                }
                Err(e) => {
                    println!("Install error: {}", e);
                    Err(format!("Failed to install update: {}", e))
                }
            }
        }
        Ok(None) => {
            println!("No update found during install");
            Err("No update available".to_string())
        }
        Err(e) => {
            println!("Check error: {}", e);
            Err(format!("Failed to check for updates: {}", e))
        }
    }
}

#[tauri::command]
async fn get_emails(state: State<'_, AppState>) -> Result<Vec<Email>, String> {
    // Check rate limit
    state.rate_limiter.check_rate_limit("get_emails")?;
    // This will either return valid tokens or an error
    let tokens = match refresh_tokens_if_needed(&state).await {
        Ok(tokens) => tokens,
        Err(_) => {
            // Return mock data if not authenticated or refresh failed
            let mut emails = Vec::new();
            for i in 1..=20 {
                emails.push(Email {
                    id: format!("email_{}", i),
                    thread_id: format!("thread_{}", (i - 1) / 3 + 1), // Group every 3 emails into a thread
                    subject: format!("Email Subject {}", i),
                    sender: format!("sender{}@example.com", i),
                    snippet: "This is a preview of the email content...".to_string(),
                    is_read: i % 2 == 0,
                });
            }
            return Ok(emails);
        }
    };

    // Create Gmail client and fetch real emails using the refreshed tokens
    let gmail_client = GmailClient::new(&tokens);

    // List messages (get first 20)
    let response = gmail_client
        .list_messages(Some(20), None, None)
        .await
        .map_err(|e| e.to_string())?;

    let message_refs: Vec<(String, String)> = response
        .messages
        .unwrap_or_default()
        .into_iter()
        .map(|m| (m.id, m.thread_id))
        .collect();

    let message_ids: Vec<String> = message_refs.iter().map(|(id, _)| id.clone()).collect();

    // Fetch full message details
    let gmail_messages = gmail_client
        .get_messages_batch(&message_ids)
        .await
        .map_err(|e| e.to_string())?;

    // Convert to our Email format
    let emails: Vec<Email> = gmail_messages
        .into_iter()
        .map(|msg| {
            let thread_id = message_refs
                .iter()
                .find(|(id, _)| *id == msg.id)
                .map(|(_, thread_id)| thread_id.clone())
                .unwrap_or_else(|| msg.id.clone()); // Fallback to message id if not found

            Email {
                id: msg.id.clone(),
                thread_id,
                subject: msg.get_subject(),
                sender: msg.get_from(),
                snippet: msg.snippet.clone(),
                is_read: !msg.is_unread(),
            }
        })
        .collect();

    Ok(emails)
}

#[tauri::command]
async fn get_inbox_stats(state: State<'_, AppState>) -> Result<(u32, u32), String> {
    // This will either return valid tokens or an error
    let tokens = match refresh_tokens_if_needed(&state).await {
        Ok(tokens) => tokens,
        Err(_) => return Ok((6303, 3151)), // Return mock data if not authenticated or refresh failed
    };

    // Create Gmail client and get profile using the refreshed tokens
    let gmail_client = GmailClient::new(&tokens);

    match gmail_client.get_profile().await {
        Ok(profile) => {
            let total = profile.messages_total.unwrap_or(0);

            // Get unread count by querying unread messages
            match gmail_client
                .list_messages(Some(1), None, Some("is:unread"))
                .await
            {
                Ok(unread_response) => {
                    let unread = unread_response.result_size_estimate.unwrap_or(0);
                    Ok((total, unread))
                }
                Err(_) => Ok((total, 0)),
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<String, String> {
    let updater = app
        .updater()
        .map_err(|e| format!("Updater not available: {}", e))?;

    match updater.check().await {
        Ok(Some(update)) => Ok(format!("Update available: {}", update.version)),
        Ok(None) => Ok("No updates available".to_string()),
        Err(e) => Err(format!("Failed to check for updates: {}", e)),
    }
}

#[tauri::command]
async fn start_gmail_auth(state: State<'_, AppState>) -> Result<String, String> {
    let mut gmail_auth = GmailAuth::new().map_err(|e| e.to_string())?;
    let auth_url = gmail_auth.get_auth_url().map_err(|e| e.to_string())?;

    // Store the auth instance
    *state.gmail_auth.lock().unwrap() = Some(gmail_auth);

    Ok(auth_url)
}

#[tauri::command]
async fn get_email_content(
    email_id: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    // Check rate limit
    state.rate_limiter.check_rate_limit("get_email_content")?;
    // Check if we have auth tokens
    let tokens = {
        let tokens_guard = state.auth_tokens.lock().unwrap();
        tokens_guard.clone()
    };

    let tokens = match tokens {
        Some(tokens) => tokens,
        None => return Err("Not authenticated".to_string()),
    };

    // Create Gmail client and fetch the specific email
    let gmail_client = GmailClient::new(&tokens);

    let message = gmail_client
        .get_message(&email_id)
        .await
        .map_err(|e| e.to_string())?;

    // Create a processed response with all the fields we need
    let processed_email = serde_json::json!({
        "id": message.id,
        "subject": message.get_subject(),
        "sender": message.get_from(),
        "date": message.get_date(),
        "body_text": message.get_body_text(),
        "body_html": message.get_body_html(),
        "snippet": message.snippet,
        "is_unread": message.is_unread()
    });

    Ok(processed_email)
}

#[tauri::command]
async fn complete_gmail_auth(
    callback_url: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    // Parse the callback URL
    let (code, _state) = parse_callback_url(&callback_url).map_err(|e| e.to_string())?;

    // Clone the auth instance to avoid holding the lock across await
    let gmail_auth = {
        let auth_guard = state.gmail_auth.lock().unwrap();
        auth_guard.as_ref().ok_or("No auth session found")?.clone()
    };

    // Exchange code for tokens (now we don't hold the lock)
    let tokens = gmail_auth
        .exchange_code(&code)
        .await
        .map_err(|e| e.to_string())?;

    // Store tokens
    *state.auth_tokens.lock().unwrap() = Some(tokens.clone());

    // Save tokens to disk for persistence
    save_tokens(&tokens).map_err(|e| format!("Failed to save tokens: {}", e))?;

    Ok("Authentication successful!".to_string())
}

#[tauri::command]
async fn logout_gmail(state: State<'_, AppState>) -> Result<String, String> {
    *state.auth_tokens.lock().unwrap() = None;

    // Delete saved tokens from secure storage
    SecureStorage::delete_tokens().map_err(|e| e.to_string())?;

    // Also clean up legacy file if it exists
    let token_file = get_token_file_path();
    if token_file.exists() {
        std::fs::remove_file(token_file).map_err(|e| e.to_string())?;
    }

    Ok("Logged out successfully".to_string())
}

#[tauri::command]
async fn get_auth_status(state: State<'_, AppState>) -> Result<bool, String> {
    let tokens = state.auth_tokens.lock().unwrap();
    Ok(tokens.is_some())
}

#[tauri::command]
async fn open_url(url: String) -> Result<(), String> {
    opener::open(&url).map_err(|e| e.to_string())?;
    Ok(())
}

fn get_token_file_path() -> PathBuf {
    let mut path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("aisle3");
    std::fs::create_dir_all(&path).ok();
    path.push("tokens.json");
    path
}

fn save_tokens(tokens: &AuthTokens) -> Result<(), Box<dyn std::error::Error>> {
    SecureStorage::save_tokens(tokens).map_err(|e| e.into())
}

fn load_tokens() -> Option<AuthTokens> {
    // First try to load from secure storage
    if let Ok(tokens) = SecureStorage::load_tokens() {
        return Some(tokens);
    }

    // If no tokens in secure storage, try to migrate from old file
    let token_file = get_token_file_path();
    if token_file.exists() {
        if let Ok(true) = SecureStorage::migrate_from_file(&token_file) {
            // Migration successful, try loading again
            return SecureStorage::load_tokens().ok();
        }
    }

    None
}

async fn refresh_tokens_if_needed(state: &State<'_, AppState>) -> Result<AuthTokens, String> {
    let tokens = {
        let tokens_guard = state.auth_tokens.lock().unwrap();
        tokens_guard.clone()
    };

    let tokens = tokens.ok_or("Not authenticated")?;

    // Try to use the current tokens first
    let gmail_client = GmailClient::new(&tokens);

    // Test if tokens work by trying to get profile
    match gmail_client.get_profile().await {
        Ok(_) => Ok(tokens), // Tokens work fine
        Err(_) => {
            // Tokens expired, try to refresh
            if let Some(refresh_token) = &tokens.refresh_token {
                let gmail_auth = GmailAuth::new().map_err(|e| e.to_string())?;
                let new_tokens = gmail_auth
                    .refresh_access_token(refresh_token)
                    .await
                    .map_err(|e| e.to_string())?;

                // Store the new tokens
                *state.auth_tokens.lock().unwrap() = Some(new_tokens.clone());
                save_tokens(&new_tokens).map_err(|e| format!("Failed to save tokens: {}", e))?;

                Ok(new_tokens)
            } else {
                Err("No refresh token available".to_string())
            }
        }
    }
}

#[tauri::command]
async fn mark_email_as_read(
    email_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let tokens = match refresh_tokens_if_needed(&state).await {
        Ok(tokens) => tokens,
        Err(e) => return Err(format!("Authentication required: {}", e)),
    };

    let gmail_client = GmailClient::new(&tokens);

    match gmail_client.mark_as_read(&email_id).await {
        Ok(_) => Ok("Email marked as read".to_string()),
        Err(e) => Err(format!("Failed to mark email as read: {}", e)),
    }
}

#[tauri::command]
async fn mark_email_as_unread(
    email_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let tokens = match refresh_tokens_if_needed(&state).await {
        Ok(tokens) => tokens,
        Err(e) => return Err(format!("Authentication required: {}", e)),
    };

    let gmail_client = GmailClient::new(&tokens);

    match gmail_client.mark_as_unread(&email_id).await {
        Ok(_) => Ok("Email marked as unread".to_string()),
        Err(e) => Err(format!("Failed to mark email as unread: {}", e)),
    }
}

#[tauri::command]
async fn send_reply(
    original_email_id: String,
    reply_body: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    // Check rate limit
    state.rate_limiter.check_rate_limit("send_reply")?;
    let tokens = match refresh_tokens_if_needed(&state).await {
        Ok(tokens) => tokens,
        Err(e) => return Err(format!("Authentication required: {}", e)),
    };

    let gmail_client = GmailClient::new(&tokens);

    // Get the original email to extract reply information
    let original_email = gmail_client
        .get_message(&original_email_id)
        .await
        .map_err(|e| format!("Failed to get original email: {}", e))?;

    // Extract sender email from "From" header
    let original_sender = original_email.get_from();

    // Parse email from "Name <email@domain.com>" format
    let to_email = if let Some(start) = original_sender.find('<') {
        if let Some(end) = original_sender.find('>') {
            original_sender[start + 1..end].to_string()
        } else {
            original_sender
        }
    } else {
        original_sender
    };

    // Create reply subject
    let original_subject = original_email.get_subject();
    let reply_subject = if original_subject.starts_with("Re: ") {
        original_subject
    } else {
        format!("Re: {}", original_subject)
    };

    // Get message threading headers
    let message_id = original_email.get_message_id();
    let references = original_email.get_references();

    // Build references chain for proper threading
    let reply_references = match (message_id.as_ref(), references.as_ref()) {
        (Some(msg_id), Some(refs)) => Some(format!("{} {}", refs, msg_id)),
        (Some(msg_id), None) => Some(msg_id.clone()),
        _ => None,
    };

    // Send the reply
    match gmail_client
        .send_email(
            &to_email,
            &reply_subject,
            &reply_body,
            message_id.as_deref(),
            reply_references.as_deref(),
        )
        .await
    {
        Ok(message_id) => Ok(format!(
            "Reply sent successfully! Message ID: {}",
            message_id
        )),
        Err(e) => Err(format!("Failed to send reply: {}", e)),
    }
}

#[tauri::command]
async fn check_for_new_emails_since_last_check(
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    // Get auth tokens
    let tokens = match refresh_tokens_if_needed(&state).await {
        Ok(tokens) => tokens,
        Err(e) => return Err(format!("Authentication required: {}", e)),
    };

    // Get last check time
    let last_check = {
        let guard = state.last_check_time.lock().unwrap();
        guard.clone()
    };

    // Create Gmail client
    let gmail_client = GmailClient::new(&tokens);

    // Check for new emails
    match gmail_client
        .check_for_new_emails(last_check.as_deref())
        .await
    {
        Ok(new_email_ids) => {
            // Update last check time to current Unix timestamp
            let current_time = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs()
                .to_string();

            *state.last_check_time.lock().unwrap() = Some(current_time);

            Ok(new_email_ids)
        }
        Err(e) => {
            eprintln!("Error checking for new emails: {}", e);
            Err(e.to_string())
        }
    }
}

fn main() {
    // Load saved tokens on startup
    let saved_tokens = load_tokens();

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState {
            gmail_auth: Mutex::new(None),
            auth_tokens: Mutex::new(saved_tokens),
            last_check_time: Mutex::new(None),
            rate_limiter: RateLimiter::new(),
        })
        .invoke_handler(tauri::generate_handler![
            get_emails,
            get_inbox_stats,
            check_for_updates,
            install_update,
            start_gmail_auth,
            complete_gmail_auth,
            get_auth_status,
            open_url,
            logout_gmail,
            get_email_content,
            check_for_new_emails_since_last_check,
            mark_email_as_read,
            mark_email_as_unread,
            send_reply
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

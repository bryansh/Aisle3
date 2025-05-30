// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, Serialize, Deserialize)]
struct Email {
    id: String,
    subject: String,
    sender: String,
    snippet: String,
    is_read: bool,
}

#[tauri::command]
async fn get_emails() -> Result<Vec<Email>, String> {
    let mut emails = Vec::new();
    
    for i in 1..=20 {
        emails.push(Email {
            id: format!("email_{}", i),
            subject: format!("Email Subject {}", i),
            sender: format!("sender{}@example.com", i),
            snippet: "This is a preview of the email content...".to_string(),
            is_read: i % 2 == 0,
        });
    }
    
    Ok(emails)
}

#[tauri::command]
async fn get_inbox_stats() -> Result<(u32, u32), String> {
    Ok((6303, 3151))
}

#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<String, String> {
    let updater = app.updater().map_err(|e| format!("Updater not available: {}", e))?;
    
    match updater.check().await {
        Ok(Some(update)) => Ok(format!("Update available: {}", update.version)),
        Ok(None) => Ok("No updates available".to_string()),
        Err(e) => Err(format!("Failed to check for updates: {}", e)),
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_emails, 
            get_inbox_stats, 
            check_for_updates
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
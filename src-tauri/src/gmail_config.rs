use serde::{Deserialize};

#[derive(Debug, Deserialize)]
pub struct GoogleCredentials {
    pub installed: InstalledApp,
}

#[derive(Debug, Deserialize)]
pub struct InstalledApp {
    pub client_id: String,
    pub client_secret: String,
    pub auth_uri: String,
    pub token_uri: String,
    pub redirect_uris: Vec<String>,
}

impl GoogleCredentials {
    pub fn from_json() -> Result<Self, Box<dyn std::error::Error>> {
        let credentials_json = include_str!("../credentials.json");
        let credentials: GoogleCredentials = serde_json::from_str(credentials_json)?;
        Ok(credentials)
    }
}

pub const REDIRECT_URI: &str = "http://localhost:8080/callback";
pub const SCOPES: &[&str] = &[
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
];
use serde::Deserialize;

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
}

impl GoogleCredentials {
    pub fn from_json() -> Result<Self, Box<dyn std::error::Error>> {
        let credentials_path = std::path::Path::new("credentials.json");

        if credentials_path.exists() {
            let credentials_json = std::fs::read_to_string(credentials_path)?;
            let credentials: GoogleCredentials = serde_json::from_str(&credentials_json)?;
            Ok(credentials)
        } else {
            // Return test credentials for CI/testing
            Ok(GoogleCredentials {
                installed: InstalledApp {
                    client_id: "test_client_id".to_string(),
                    client_secret: "test_client_secret".to_string(),
                    auth_uri: "https://accounts.google.com/o/oauth2/auth".to_string(),
                    token_uri: "https://oauth2.googleapis.com/token".to_string(),
                },
            })
        }
    }
}

pub const REDIRECT_URI: &str = "http://localhost:8080/callback";
pub const SCOPES: &[&str] = &[
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
];

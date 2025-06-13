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
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        // Load .env file if it exists (for local development)
        let _ = dotenvy::dotenv();

        if std::env::var("CI").is_ok() || std::env::var("TESTING").is_ok() {
            // Explicit test mode for CI/testing
            Ok(Self::test_credentials())
        } else {
            let client_id = std::env::var("GOOGLE_CLIENT_ID")
                .map_err(|_| "GOOGLE_CLIENT_ID environment variable not set")?;
            let client_secret = std::env::var("GOOGLE_CLIENT_SECRET")
                .map_err(|_| "GOOGLE_CLIENT_SECRET environment variable not set")?;

            Self::validate_credentials(&client_id, &client_secret)?;

            Ok(GoogleCredentials {
                installed: InstalledApp {
                    client_id,
                    client_secret,
                    auth_uri: "https://accounts.google.com/o/oauth2/auth".to_string(),
                    token_uri: "https://oauth2.googleapis.com/token".to_string(),
                },
            })
        }
    }

    fn validate_credentials(
        client_id: &str,
        client_secret: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Validate client_id format (Google OAuth client IDs have specific patterns)
        if !client_id.contains(".apps.googleusercontent.com") {
            return Err(format!(
                "Invalid client_id format: '{}' (should contain '.apps.googleusercontent.com')",
                client_id
            )
            .into());
        }

        // Validate client_secret format (Google secrets start with GOCSPX-)
        if !client_secret.starts_with("GOCSPX-") {
            return Err(format!(
                "Invalid client_secret format: starts with '{}...' (should start with 'GOCSPX-')",
                &client_secret[..std::cmp::min(8, client_secret.len())]
            )
            .into());
        }

        // Check minimum lengths
        if client_id.len() < 20 {
            return Err(format!(
                "client_id too short: {} characters (should be at least 20)",
                client_id.len()
            )
            .into());
        }
        if client_secret.len() < 20 {
            return Err(format!(
                "client_secret too short: {} characters (should be at least 20)",
                client_secret.len()
            )
            .into());
        }

        Ok(())
    }

    fn test_credentials() -> Self {
        GoogleCredentials {
            installed: InstalledApp {
                client_id: "test_client_id".to_string(),
                client_secret: "test_client_secret".to_string(),
                auth_uri: "https://accounts.google.com/o/oauth2/auth".to_string(),
                token_uri: "https://oauth2.googleapis.com/token".to_string(),
            },
        }
    }
}

pub const REDIRECT_URI: &str = "http://localhost:8080/callback";
pub const SCOPES: &[&str] = &[
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
];

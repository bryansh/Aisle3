use oauth2::basic::BasicClient;
use oauth2::reqwest::async_http_client;
use oauth2::RefreshToken;
use oauth2::{
    AuthUrl, AuthorizationCode, ClientId, ClientSecret, CsrfToken, RedirectUrl, Scope,
    TokenResponse, TokenUrl,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use url::Url;

use crate::gmail_config::{GoogleCredentials, REDIRECT_URI, SCOPES};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthTokens {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: Option<u64>,
}

#[derive(Clone)]
pub struct GmailAuth {
    client: BasicClient,
    csrf_token: Option<CsrfToken>,
}

impl GmailAuth {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let credentials = GoogleCredentials::from_json()?;

        let client = BasicClient::new(
            ClientId::new(credentials.installed.client_id),
            Some(ClientSecret::new(credentials.installed.client_secret)),
            AuthUrl::new(credentials.installed.auth_uri)?,
            Some(TokenUrl::new(credentials.installed.token_uri)?),
        )
        .set_redirect_uri(RedirectUrl::new(REDIRECT_URI.to_string())?);

        Ok(GmailAuth {
            client,
            csrf_token: None,
        })
    }

    pub fn get_auth_url(&mut self) -> Result<String, Box<dyn std::error::Error>> {
        let mut auth_request = self.client.authorize_url(CsrfToken::new_random);

        // Add scopes
        for scope in SCOPES {
            auth_request = auth_request.add_scope(Scope::new(scope.to_string()));
        }

        let (auth_url, csrf_token) = auth_request.url();
        self.csrf_token = Some(csrf_token);

        Ok(auth_url.to_string())
    }

    pub async fn exchange_code(
        &self,
        code: &str,
    ) -> Result<AuthTokens, Box<dyn std::error::Error>> {
        let token_result = self
            .client
            .exchange_code(AuthorizationCode::new(code.to_string()))
            .request_async(async_http_client)
            .await?;

        let access_token = token_result.access_token().secret().clone();
        let refresh_token = token_result.refresh_token().map(|rt| rt.secret().clone());
        let expires_in = token_result.expires_in().map(|d| d.as_secs());

        Ok(AuthTokens {
            access_token,
            refresh_token,
            expires_in,
        })
    }

    pub async fn refresh_access_token(
        &self,
        refresh_token: &str,
    ) -> Result<AuthTokens, Box<dyn std::error::Error>> {
        let token_result = self
            .client
            .exchange_refresh_token(&RefreshToken::new(refresh_token.to_string()))
            .request_async(async_http_client)
            .await?;

        let access_token = token_result.access_token().secret().clone();
        let new_refresh_token = token_result
            .refresh_token()
            .map(|rt| rt.secret().clone())
            .or_else(|| Some(refresh_token.to_string())); // Keep existing if no new one
        let expires_in = token_result.expires_in().map(|d| d.as_secs());

        Ok(AuthTokens {
            access_token,
            refresh_token: new_refresh_token,
            expires_in,
        })
    }
}

// Helper function to parse callback URL
pub fn parse_callback_url(
    url: &str,
) -> Result<(String, Option<String>), Box<dyn std::error::Error>> {
    let parsed_url = Url::parse(url)?;
    let params: HashMap<String, String> = parsed_url.query_pairs().into_owned().collect();

    if let Some(error) = params.get("error") {
        return Err(format!("OAuth error: {}", error).into());
    }

    let code = params
        .get("code")
        .ok_or("No authorization code found")?
        .clone();

    let state = params.get("state").cloned();

    Ok((code, state))
}

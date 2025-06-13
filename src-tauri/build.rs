fn main() {
    // Embed Google OAuth credentials at build time
    // These will be available as compile-time constants
    if let Ok(client_id) = std::env::var("GOOGLE_CLIENT_ID") {
        println!("cargo:rustc-env=GOOGLE_CLIENT_ID_EMBEDDED={}", client_id);
    }

    if let Ok(client_secret) = std::env::var("GOOGLE_CLIENT_SECRET") {
        println!(
            "cargo:rustc-env=GOOGLE_CLIENT_SECRET_EMBEDDED={}",
            client_secret
        );
    }

    tauri_build::build()
}

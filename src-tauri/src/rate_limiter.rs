use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// Rate limiter for API calls to prevent abuse
#[derive(Debug)]
pub struct RateLimiter {
    limits: Arc<Mutex<HashMap<String, RateLimit>>>,
}

#[derive(Debug, Clone)]
struct RateLimit {
    requests: Vec<Instant>,
    max_requests: u32,
    window_duration: Duration,
}

impl RateLimiter {
    pub fn new() -> Self {
        RateLimiter {
            limits: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Check if a request is allowed for a specific operation
    pub fn check_rate_limit(&self, operation: &str) -> Result<(), String> {
        let mut limits = self.limits.lock().unwrap();

        // Get or create rate limit for this operation
        let limit = limits.entry(operation.to_string()).or_insert_with(|| {
            match operation {
                "get_emails" => RateLimit::new(10, Duration::from_secs(60)), // 10 requests per minute
                "get_email_content" => RateLimit::new(30, Duration::from_secs(60)), // 30 requests per minute
                "send_reply" => RateLimit::new(10, Duration::from_secs(60)), // 10 replies per minute
                "mark_email_as_read" => RateLimit::new(20, Duration::from_secs(60)), // 20 marks per minute
                "mark_email_as_unread" => RateLimit::new(20, Duration::from_secs(60)), // 20 marks per minute
                "get_inbox_stats" => RateLimit::new(20, Duration::from_secs(60)), // 20 stats per minute
                "check_for_new_emails_since_last_check" => {
                    RateLimit::new(30, Duration::from_secs(60))
                } // 30 checks per minute
                _ => RateLimit::new(10, Duration::from_secs(60)), // Default: 10 requests per minute
            }
        });

        if limit.is_allowed() {
            Ok(())
        } else {
            Err(format!(
                "Rate limit exceeded for '{}'. Max {} requests per {} seconds",
                operation,
                limit.max_requests,
                limit.window_duration.as_secs()
            ))
        }
    }

    /// Reset rate limits for all operations (useful for testing)
    #[cfg(test)]
    pub fn reset_all(&self) {
        let mut limits = self.limits.lock().unwrap();
        limits.clear();
    }

    /// Reset rate limit for a specific operation (useful for testing)
    #[cfg(test)]
    pub fn reset_operation(&self, operation: &str) {
        let mut limits = self.limits.lock().unwrap();
        limits.remove(operation);
    }
}

impl RateLimit {
    fn new(max_requests: u32, window_duration: Duration) -> Self {
        RateLimit {
            requests: Vec::new(),
            max_requests,
            window_duration,
        }
    }

    fn is_allowed(&mut self) -> bool {
        let now = Instant::now();

        // Clean up old requests outside the window
        self.requests
            .retain(|&req_time| now.duration_since(req_time) <= self.window_duration);

        // Check if we're under the limit
        if self.requests.len() < self.max_requests as usize {
            self.requests.push(now);
            true
        } else {
            false
        }
    }
}

impl Default for RateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limit_allows_requests_under_limit() {
        let limiter = RateLimiter::new();

        // Should allow first few requests
        for _ in 0..5 {
            assert!(limiter.check_rate_limit("get_emails").is_ok());
        }
    }

    #[test]
    fn test_rate_limit_blocks_requests_over_limit() {
        let limiter = RateLimiter::new();

        // Use up all allowed requests for get_emails (10 per minute)
        for _ in 0..10 {
            assert!(limiter.check_rate_limit("get_emails").is_ok());
        }

        // Next request should be blocked
        assert!(limiter.check_rate_limit("get_emails").is_err());
    }

    #[test]
    fn test_different_operations_have_separate_limits() {
        let limiter = RateLimiter::new();

        // Use up get_emails limit
        for _ in 0..10 {
            assert!(limiter.check_rate_limit("get_emails").is_ok());
        }
        assert!(limiter.check_rate_limit("get_emails").is_err());

        // send_reply should still work (separate limit)
        assert!(limiter.check_rate_limit("send_reply").is_ok());
    }

    #[test]
    fn test_reset_operation_clears_limit() {
        let limiter = RateLimiter::new();

        // Use up limit
        for _ in 0..10 {
            limiter.check_rate_limit("get_emails").unwrap();
        }
        assert!(limiter.check_rate_limit("get_emails").is_err());

        // Reset and try again
        limiter.reset_operation("get_emails");
        assert!(limiter.check_rate_limit("get_emails").is_ok());
    }

    #[test]
    fn test_reset_all_clears_all_limits() {
        let limiter = RateLimiter::new();

        // Use up multiple limits
        for _ in 0..10 {
            limiter.check_rate_limit("get_emails").unwrap();
        }
        for _ in 0..10 {
            limiter.check_rate_limit("send_reply").unwrap();
        }

        assert!(limiter.check_rate_limit("get_emails").is_err());
        assert!(limiter.check_rate_limit("send_reply").is_err());

        // Reset all
        limiter.reset_all();
        assert!(limiter.check_rate_limit("get_emails").is_ok());
        assert!(limiter.check_rate_limit("send_reply").is_ok());
    }
}

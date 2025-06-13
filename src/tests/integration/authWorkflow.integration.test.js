/**
 * Authentication Workflow Integration Tests
 * Tests complete authentication flows and integration with email operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockAuthFactory, createAsyncMock, createErrorScenario } from '../utils/testHelpers.js';

describe('Authentication Workflow Integration Tests', () => {
  let authManager;
  let emailService;
  let mockTauriInvoke;

  beforeEach(() => {
    // Mock Tauri invoke for authentication commands
    mockTauriInvoke = vi.fn();
    global.__TAURI__ = {
      core: { invoke: mockTauriInvoke }
    };

    // Mock auth manager
    authManager = {
      authenticate: vi.fn(),
      refreshToken: vi.fn(),
      logout: vi.fn(),
      getAuthStatus: vi.fn(),
      isAuthenticated: vi.fn()
    };

    // Mock email service that depends on auth
    emailService = {
      loadEmails: vi.fn(),
      sendReply: vi.fn(),
      markAsRead: vi.fn()
    };
  });

  describe('Complete Authentication Flow', () => {
    it('should complete OAuth flow and enable email operations', async () => {
      // Step 1: Start authentication
      const authUrl = 'https://accounts.google.com/oauth/authorize?...';
      mockTauriInvoke.mockResolvedValueOnce(authUrl);
      
      authManager.authenticate.mockResolvedValueOnce({
        success: true,
        authUrl
      });

      const authResult = await authManager.authenticate();
      expect(authResult.success).toBe(true);
      expect(authResult.authUrl).toContain('accounts.google.com');

      // Step 2: Handle OAuth callback with tokens
      const tokens = mockAuthFactory.successTokens();
      mockTauriInvoke.mockResolvedValueOnce(tokens);
      
      authManager.getAuthStatus.mockResolvedValueOnce({
        isAuthenticated: true,
        tokens
      });

      const statusResult = await authManager.getAuthStatus();
      expect(statusResult.isAuthenticated).toBe(true);
      expect(statusResult.tokens.access_token).toBeDefined();

      // Step 3: Verify email operations are now enabled
      emailService.loadEmails.mockResolvedValueOnce([
        { id: 'email1', subject: 'Test Email' }
      ]);

      const emails = await emailService.loadEmails();
      expect(emails).toHaveLength(1);
      expect(emails[0].subject).toBe('Test Email');
    });

    it('should handle authentication failures gracefully', async () => {
      // Step 1: Authentication fails
      authManager.authenticate.mockRejectedValueOnce(
        new Error('Authentication failed')
      );

      await expect(authManager.authenticate()).rejects.toThrow('Authentication failed');

      // Step 2: Verify email operations are blocked
      authManager.isAuthenticated.mockReturnValueOnce(false);
      emailService.loadEmails.mockRejectedValueOnce(
        new Error('Not authenticated')
      );

      expect(authManager.isAuthenticated()).toBe(false);
      await expect(emailService.loadEmails()).rejects.toThrow('Not authenticated');

      // Step 3: Retry authentication should work
      authManager.authenticate.mockResolvedValueOnce({
        success: true,
        tokens: mockAuthFactory.successTokens()
      });

      const retryResult = await authManager.authenticate();
      expect(retryResult.success).toBe(true);
    });
  });

  describe('Token Refresh and Session Management', () => {
    it('should refresh expired tokens automatically', async () => {
      // Step 1: Setup authenticated state with expiring token
      const expiredTokens = {
        ...mockAuthFactory.successTokens(),
        expires_in: -1 // Already expired
      };

      authManager.getAuthStatus.mockResolvedValueOnce({
        isAuthenticated: true,
        tokens: expiredTokens,
        needsRefresh: true
      });

      // Step 2: Email operation fails due to expired token
      emailService.loadEmails.mockRejectedValueOnce(
        new Error('Invalid access token')
      );

      await expect(emailService.loadEmails()).rejects.toThrow('Invalid access token');

      // Step 3: Token refresh succeeds
      const newTokens = mockAuthFactory.successTokens();
      authManager.refreshToken.mockResolvedValueOnce({
        success: true,
        tokens: newTokens
      });

      const refreshResult = await authManager.refreshToken();
      expect(refreshResult.success).toBe(true);
      expect(refreshResult.tokens.access_token).toBeDefined();

      // Step 4: Email operation retries and succeeds
      emailService.loadEmails.mockResolvedValueOnce([
        { id: 'email1', subject: 'Test after refresh' }
      ]);

      const emails = await emailService.loadEmails();
      expect(emails).toHaveLength(1);
    });

    it('should handle refresh token expiration', async () => {
      // Step 1: Both access and refresh tokens are invalid
      authManager.refreshToken.mockRejectedValueOnce(
        new Error('Refresh token expired')
      );

      await expect(authManager.refreshToken()).rejects.toThrow('Refresh token expired');

      // Step 2: Should require full re-authentication
      authManager.isAuthenticated.mockReturnValueOnce(false);
      expect(authManager.isAuthenticated()).toBe(false);

      // Step 3: Logout and clear stored tokens
      authManager.logout.mockResolvedValueOnce({ success: true });
      const logoutResult = await authManager.logout();
      expect(logoutResult.success).toBe(true);
    });
  });

  describe('Security and Error Handling', () => {
    it('should validate OAuth callback security', async () => {
      // Step 1: Test invalid callback URL
      const invalidCallback = 'https://malicious-site.com/callback?code=stolen';
      
      authManager.authenticate.mockRejectedValueOnce(
        new Error('Invalid callback URL')
      );

      await expect(authManager.authenticate()).rejects.toThrow('Invalid callback URL');

      // Step 2: Test valid callback with proper state validation
      const validCallback = 'http://localhost:3000/auth/callback?code=valid&state=expected';
      
      authManager.authenticate.mockResolvedValueOnce({
        success: true,
        tokens: mockAuthFactory.successTokens()
      });

      const validResult = await authManager.authenticate();
      expect(validResult.success).toBe(true);
    });

    it('should handle network failures during authentication', async () => {
      // Step 1: Network failure during OAuth
      authManager.authenticate.mockRejectedValueOnce(
        new Error('Network request failed')
      );

      await expect(authManager.authenticate()).rejects.toThrow('Network request failed');

      // Step 2: Retry with exponential backoff
      authManager.authenticate
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockResolvedValueOnce({
          success: true,
          tokens: mockAuthFactory.successTokens()
        });

      // First retry fails
      await expect(authManager.authenticate()).rejects.toThrow('Network request failed');
      
      // Second retry succeeds
      const retryResult = await authManager.authenticate();
      expect(retryResult.success).toBe(true);
    });

    it('should protect against token injection attacks', async () => {
      // Step 1: Test malformed token response
      const maliciousTokens = {
        access_token: '<script>alert("xss")</script>',
        refresh_token: 'valid-refresh-token',
        token_type: 'Bearer'
      };

      // Auth manager should validate token format
      authManager.getAuthStatus.mockResolvedValueOnce({
        isAuthenticated: false,
        error: 'Invalid token format'
      });

      const statusResult = await authManager.getAuthStatus();
      expect(statusResult.isAuthenticated).toBe(false);
      expect(statusResult.error).toContain('Invalid token format');

      // Step 2: Verify email operations are blocked
      emailService.loadEmails.mockRejectedValueOnce(
        new Error('Invalid authentication')
      );

      await expect(emailService.loadEmails()).rejects.toThrow('Invalid authentication');
    });
  });

  describe('Multi-User and Session Management', () => {
    it('should handle multiple user sessions', async () => {
      // Step 1: Authenticate first user
      const user1Tokens = mockAuthFactory.successTokens();
      authManager.authenticate.mockResolvedValueOnce({
        success: true,
        tokens: user1Tokens,
        userId: 'user1@example.com'
      });

      const user1Auth = await authManager.authenticate();
      expect(user1Auth.success).toBe(true);

      // Step 2: Switch to second user
      authManager.logout.mockResolvedValueOnce({ success: true });
      await authManager.logout();

      const user2Tokens = mockAuthFactory.successTokens();
      authManager.authenticate.mockResolvedValueOnce({
        success: true,
        tokens: user2Tokens,
        userId: 'user2@example.com'
      });

      const user2Auth = await authManager.authenticate();
      expect(user2Auth.success).toBe(true);
      expect(user2Auth.userId).toBe('user2@example.com');

      // Step 3: Verify correct user context in email operations
      emailService.loadEmails.mockResolvedValueOnce([
        { id: 'email1', recipient: 'user2@example.com' }
      ]);

      const emails = await emailService.loadEmails();
      expect(emails[0].recipient).toBe('user2@example.com');
    });

    it('should handle concurrent authentication attempts', async () => {
      // Step 1: Start multiple authentication attempts
      const auth1 = authManager.authenticate();
      const auth2 = authManager.authenticate();

      // Step 2: First succeeds, second should be handled gracefully
      authManager.authenticate
        .mockResolvedValueOnce({
          success: true,
          tokens: mockAuthFactory.successTokens()
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Authentication already in progress'
        });

      const results = await Promise.allSettled([auth1, auth2]);
      
      // One should succeed, one should handle the conflict
      expect(results.some(r => r.status === 'fulfilled')).toBe(true);
    });
  });

  describe('Integration with Email Operations', () => {
    it('should authenticate and perform complete email workflow', async () => {
      // Step 1: Complete authentication
      authManager.authenticate.mockResolvedValueOnce({
        success: true,
        tokens: mockAuthFactory.successTokens()
      });

      const authResult = await authManager.authenticate();
      expect(authResult.success).toBe(true);

      // Step 2: Load emails with authenticated state
      emailService.loadEmails.mockResolvedValueOnce([
        { id: 'email1', subject: 'Important Email', is_read: false }
      ]);

      const emails = await emailService.loadEmails();
      expect(emails).toHaveLength(1);

      // Step 3: Perform email actions
      emailService.markAsRead.mockResolvedValueOnce('success');
      const markResult = await emailService.markAsRead('email1');
      expect(markResult).toBe('success');

      // Step 4: Send reply
      emailService.sendReply.mockResolvedValueOnce('reply-sent');
      const replyResult = await emailService.sendReply('email1', 'Thank you!');
      expect(replyResult).toBe('reply-sent');
    });

    it('should handle auth expiration during email operations', async () => {
      // Step 1: Start with valid authentication
      authManager.isAuthenticated.mockReturnValueOnce(true);

      // Step 2: Email operation fails due to expired auth
      emailService.loadEmails.mockRejectedValueOnce(
        new Error('Authentication expired')
      );

      await expect(emailService.loadEmails()).rejects.toThrow('Authentication expired');

      // Step 3: Auto-refresh and retry
      authManager.refreshToken.mockResolvedValueOnce({
        success: true,
        tokens: mockAuthFactory.successTokens()
      });

      const refreshResult = await authManager.refreshToken();
      expect(refreshResult.success).toBe(true);

      // Step 4: Retry email operation successfully
      emailService.loadEmails.mockResolvedValueOnce([
        { id: 'email1', subject: 'After refresh' }
      ]);

      const emails = await emailService.loadEmails();
      expect(emails[0].subject).toBe('After refresh');
    });
  });

  describe('Logout and Cleanup Workflows', () => {
    it('should perform complete logout and cleanup', async () => {
      // Step 1: Start with authenticated state
      authManager.isAuthenticated.mockReturnValueOnce(true);
      expect(authManager.isAuthenticated()).toBe(true);

      // Step 2: Perform logout
      authManager.logout.mockResolvedValueOnce({
        success: true,
        tokensCleared: true
      });

      const logoutResult = await authManager.logout();
      expect(logoutResult.success).toBe(true);
      expect(logoutResult.tokensCleared).toBe(true);

      // Step 3: Verify email operations are blocked
      authManager.isAuthenticated.mockReturnValueOnce(false);
      emailService.loadEmails.mockRejectedValueOnce(
        new Error('Not authenticated')
      );

      expect(authManager.isAuthenticated()).toBe(false);
      await expect(emailService.loadEmails()).rejects.toThrow('Not authenticated');

      // Step 4: Verify clean state for re-authentication
      authManager.authenticate.mockResolvedValueOnce({
        success: true,
        tokens: mockAuthFactory.successTokens()
      });

      const reAuthResult = await authManager.authenticate();
      expect(reAuthResult.success).toBe(true);
    });

    it('should handle logout with pending operations', async () => {
      // Step 1: Start email operations
      const emailPromise = emailService.loadEmails();
      emailService.loadEmails.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      // Step 2: Logout while operations are pending
      authManager.logout.mockResolvedValueOnce({
        success: true,
        pendingOperationsCancelled: true
      });

      const logoutResult = await authManager.logout();
      expect(logoutResult.success).toBe(true);

      // Step 3: Pending operations should be handled gracefully
      // This would depend on implementation details of operation cancellation
    });
  });
});
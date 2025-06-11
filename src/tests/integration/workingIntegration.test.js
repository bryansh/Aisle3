import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  emails, 
  totalCount, 
  unreadCount,
  emailOperations 
} from '../../lib/stores/emailStore.js';
import { createSanitizationService } from '../../lib/services/sanitizationService.js';
import { createEmailActionUtils } from '../../lib/utils/emailActions.js';

describe('Working Integration Tests', () => {
  let sanitizationService;
  let actionUtils;
  let mockEmailService;

  beforeEach(() => {
    // Reset store state
    emails.set([]);
    totalCount.set(0);
    unreadCount.set(0);
    
    sanitizationService = createSanitizationService();
    
    // Create mock email service
    mockEmailService = {
      markAsRead: vi.fn().mockResolvedValue(true),
      markAsUnread: vi.fn().mockResolvedValue(true),
      sendReply: vi.fn().mockResolvedValue({ success: true, messageId: 'reply123' }),
      loadEmails: vi.fn().mockResolvedValue([
        {
          id: 'email1',
          sender: 'test@example.com',
          subject: 'Test Email',
          body: '<p>Test body content</p>',
          is_read: false,
          timestamp: '2023-01-01T10:00:00Z'
        }
      ]),
      loadEmailsInBackground: vi.fn().mockResolvedValue([]),
      loadStats: vi.fn().mockResolvedValue({ totalCount: 1, unreadCount: 1 }),
      loadStatsInBackground: vi.fn().mockResolvedValue({ totalCount: 1, unreadCount: 0 }),
      checkForNewEmails: vi.fn().mockResolvedValue({
        hasNewEmails: false,
        newEmailCount: 0,
        totalCount: 1,
        unreadCount: 1
      })
    };
    
    actionUtils = createEmailActionUtils(mockEmailService);
  });

  describe('Email Action Utils and Sanitization Integration', () => {
    it('should sanitize reply content before sending through action utils', async () => {
      const unsafeReplyContent = '<p>Thank you for your email!</p><script>alert("xss")</script>';
      
      // Sanitize the content first
      const sanitizationResult = sanitizationService.sanitizeEmailData({
        to: 'test@example.com',
        subject: 'Re: Test Email',
        body: unsafeReplyContent
      });

      expect(sanitizationResult.isValid).toBe(true);
      expect(sanitizationResult.sanitizedData.body).not.toContain('<script>');
      expect(sanitizationResult.sanitizedData.body).toContain('<p>');

      // Send reply using action utils with sanitized content
      const replyResult = await actionUtils.sendReplyWithValidation(
        'email1',
        sanitizationResult.sanitizedData.body
      );

      expect(replyResult.success).toBe(true);
      expect(mockEmailService.sendReply).toHaveBeenCalledWith(
        'email1',
        sanitizationResult.sanitizedData.body
      );
    });

    it('should prevent sending replies with high-risk content', async () => {
      const riskyContent = 'URGENT ACTION REQUIRED! Verify your account immediately!';
      
      const sanitizationResult = sanitizationService.sanitizeEmailData({
        to: 'test@example.com',
        subject: 'Re: Test Email',
        body: riskyContent
      });

      expect(sanitizationResult.isValid).toBe(false);
      expect(sanitizationResult.validationResults.body.riskLevel).toBe('high');

      // Even if we try to send an empty reply, it should fail validation
      const replyResult = await actionUtils.sendReplyWithValidation('email1', '');
      expect(replyResult.success).toBe(false);
      expect(replyResult.error).toContain('Reply body cannot be empty');
    });

    it('should handle bulk operations with integrated error handling', async () => {
      // Simulate some emails failing
      mockEmailService.markAsRead
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(true);

      const result = await actionUtils.markMultipleAsRead(['email1', 'email2', 'email3']);

      expect(result.success).toBe(true); // Bulk operation succeeds even with individual failures
      expect(result.data.successCount).toBe(2);
      expect(result.data.errorCount).toBe(1);
      expect(result.data.totalProcessed).toBe(3);
    });
  });

  describe('Store Integration with Sanitization', () => {
    it('should load and sanitize emails through store operations', async () => {
      // Mock email data with potentially unsafe content
      const emailsWithUnsafeContent = [
        {
          id: 'email1',
          sender: 'sender@example.com',
          subject: 'Test Email <script>alert("xss")</script>',
          body: '<p>Safe content</p><script>document.cookie="stolen"</script>',
          snippet: 'Safe content...',
          is_read: false
        }
      ];

      mockEmailService.loadEmails.mockResolvedValueOnce(emailsWithUnsafeContent);

      // Load emails through store
      const emailsResult = await mockEmailService.loadEmails();
      emails.set(emailsResult);

      // Get current emails from store
      let currentEmails;
      emails.subscribe(value => currentEmails = value)();

      expect(currentEmails).toHaveLength(1);

      // Sanitize each email for display
      const sanitizedEmails = currentEmails.map(email => 
        sanitizationService.sanitizeEmailForDisplay(email)
      );

      expect(sanitizedEmails[0].subject).not.toContain('<script>');
      expect(sanitizedEmails[0].body).not.toContain('<script>');
      expect(sanitizedEmails[0].body).toContain('<p>');
      expect(sanitizedEmails[0].sender).toBe('sender@example.com');
    });

    it('should integrate email actions with store state updates', async () => {
      // Load initial emails
      const initialEmails = await mockEmailService.loadEmails();
      emails.set(initialEmails);

      let currentEmails;
      emails.subscribe(value => currentEmails = value)();
      expect(currentEmails[0].is_read).toBe(false);

      // Use action utils to mark as read
      const result = await actionUtils.markMultipleAsRead(['email1']);
      expect(result.success).toBe(true);
      expect(mockEmailService.markAsRead).toHaveBeenCalledWith('email1');

      // Simulate store update after successful action
      emails.update(emailList => 
        emailList.map(email => 
          email.id === 'email1' ? { ...email, is_read: true } : email
        )
      );

      emails.subscribe(value => currentEmails = value)();
      expect(currentEmails[0].is_read).toBe(true);
    });
  });

  describe('End-to-End Security Workflow', () => {
    it('should prevent XSS throughout the complete email workflow', async () => {
      const maliciousEmail = {
        id: 'malicious-email',
        sender: 'attacker@evil.com',
        subject: 'Innocent Subject',
        body: '<p>Normal content</p><script>document.location="http://evil.com"</script><img src="x" onerror="alert(1)">',
        snippet: 'Normal content...',
        is_read: false
      };

      // 1. Sanitize for display
      const sanitizedForDisplay = sanitizationService.sanitizeEmailForDisplay(maliciousEmail);
      expect(sanitizedForDisplay.body).not.toContain('<script>');
      expect(sanitizedForDisplay.body).not.toContain('onerror');
      expect(sanitizedForDisplay.body).not.toContain('document.location');
      expect(sanitizedForDisplay.body).toContain('<p>');

      // 2. If user tries to reply with malicious content
      const maliciousReply = '<p>Thank you</p><script>steal_cookies()</script>';
      const replyValidation = sanitizationService.sanitizeEmailData({
        to: maliciousEmail.sender,
        subject: `Re: ${maliciousEmail.subject}`,
        body: maliciousReply
      });

      expect(replyValidation.isValid).toBe(true);
      expect(replyValidation.sanitizedData.body).not.toContain('<script>');
      expect(replyValidation.sanitizedData.body).not.toContain('steal_cookies');

      // 3. Send the sanitized reply
      const replyResult = await actionUtils.sendReplyWithValidation(
        maliciousEmail.id,
        replyValidation.sanitizedData.body
      );

      expect(replyResult.success).toBe(true);
      expect(mockEmailService.sendReply).toHaveBeenCalledWith(
        maliciousEmail.id,
        replyValidation.sanitizedData.body
      );
    });

    it('should detect and handle phishing attempts', async () => {
      const phishingEmail = {
        id: 'phishing-email',
        sender: 'noreply@fakebank.com',
        subject: 'URGENT: Account Suspended',
        body: 'URGENT ACTION REQUIRED! Your account will be suspended unless you verify immediately. Click here now!',
        is_read: false
      };

      // Validate the email content
      const contentValidation = sanitizationService.sanitizeEmailData({
        body: phishingEmail.body
      });

      expect(contentValidation.isValid).toBe(false);
      expect(contentValidation.validationResults.body.riskLevel).toBe('high');
      expect(contentValidation.issues[0]).toContain('Potential phishing content detected');

      // The email should still be sanitized for display but flagged as risky
      const sanitizedEmail = sanitizationService.sanitizeEmailForDisplay(phishingEmail);
      expect(sanitizedEmail.body).toBeDefined();
      expect(sanitizedEmail.sender).toBe('noreply@fakebank.com');
    });
  });

  describe('Performance Integration', () => {
    it('should handle large batches efficiently with sanitization', async () => {
      const largeBatch = Array.from({ length: 30 }, (_, i) => `email${i + 1}`);
      
      const start = Date.now();
      const result = await actionUtils.markMultipleAsRead(largeBatch);
      const elapsed = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.data.totalProcessed).toBe(30);
      expect(elapsed).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should sanitize large email content efficiently', () => {
      const largeEmail = {
        id: 'large-email',
        sender: 'sender@example.com',
        subject: 'Large Email',
        body: '<p>' + 'x'.repeat(50000) + '</p><script>malicious_code()</script>',
        is_read: false
      };

      const start = Date.now();
      const sanitized = sanitizationService.sanitizeEmailForDisplay(largeEmail);
      const elapsed = Date.now() - start;

      expect(sanitized.body).not.toContain('<script>');
      expect(sanitized.body).toContain('<p>');
      expect(elapsed).toBeLessThan(200); // Should be very fast
    });
  });

  describe('Error Recovery Integration', () => {
    it('should recover gracefully from service failures across components', async () => {
      // Simulate service failure
      mockEmailService.loadEmails.mockRejectedValueOnce(new Error('Service unavailable'));

      await expect(mockEmailService.loadEmails()).rejects.toThrow('Service unavailable');

      // Service should recover on retry
      mockEmailService.loadEmails.mockResolvedValueOnce([]);
      const emails = await mockEmailService.loadEmails();
      expect(emails).toEqual([]);

      // Sanitization should continue to work
      const testEmail = {
        id: 'test',
        sender: 'test@example.com',
        body: '<p>Test</p>'
      };
      const sanitized = sanitizationService.sanitizeEmailForDisplay(testEmail);
      expect(sanitized.body).toContain('<p>');
    });

    it('should handle validation failures gracefully', () => {
      const invalidEmailData = {
        to: 'not-an-email',
        subject: '',
        body: 'x'.repeat(200000) // Too long
      };

      const result = sanitizationService.sanitizeEmailData(invalidEmailData);
      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('Invalid recipient email');
    });
  });
});
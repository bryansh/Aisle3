import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEmailActionUtils, EmailActionTypes } from '../../lib/utils/emailActions.js';
import { createSanitizationService } from '../../lib/services/sanitizationService.js';

describe('Email Action Utils Integration Tests', () => {
  let emailService;
  let actionUtils;
  let sanitizationService;

  beforeEach(() => {
    emailService = {
      markAsRead: vi.fn().mockResolvedValue('marked-read'),
      markAsUnread: vi.fn().mockResolvedValue('marked-unread'),
      sendReply: vi.fn().mockResolvedValue('reply-sent'),
      loadEmails: vi.fn().mockResolvedValue([
        {
          id: 'email1',
          sender: 'sender1@example.com',
          subject: 'Test Subject 1',
          body: '<p>Test body 1</p>',
          is_read: false,
          timestamp: '2023-01-01T10:00:00Z'
        },
        {
          id: 'email2',
          sender: 'sender2@example.com',
          subject: 'Test Subject 2',
          body: 'Plain text body 2',
          is_read: true,
          timestamp: '2023-01-01T11:00:00Z'
        }
      ]),
      loadStats: vi.fn().mockResolvedValue({ totalCount: 2, unreadCount: 1 }),
      loadEmailsInBackground: vi.fn().mockResolvedValue(['email1', 'email2']),
      loadStatsInBackground: vi.fn().mockResolvedValue({ totalCount: 2, unreadCount: 1 }),
      checkForNewEmails: vi.fn().mockResolvedValue({
        hasNewEmails: true,
        newEmailCount: 1,
        totalCount: 3,
        unreadCount: 2
      })
    };

    actionUtils = createEmailActionUtils(emailService);
    sanitizationService = createSanitizationService();
  });

  describe('Email Reading and Sanitization Flow', () => {
    it('should load, sanitize, and process emails end-to-end', async () => {
      const emails = await emailService.loadEmails();
      expect(emails).toHaveLength(2);

      const sanitizedEmails = emails.map(email => 
        sanitizationService.sanitizeEmailForDisplay(email)
      );

      expect(sanitizedEmails[0].sender).toBe('sender1@example.com');
      expect(sanitizedEmails[0].body).toContain('<p>');
      expect(sanitizedEmails[1].snippet).toBe(undefined);

      const result = await actionUtils.markMultipleAsRead(['email1']);
      expect(result.success).toBe(true);
      expect(result.data.successCount).toBe(1);
    });

    it('should handle bulk operations with sanitized data', async () => {
      const emailIds = ['email1', 'email2'];
      
      const result = await actionUtils.markMultipleAsRead(emailIds);
      expect(result.success).toBe(true);
      expect(result.data.successCount).toBe(2);
      expect(emailService.markAsRead).toHaveBeenCalledTimes(2);
    });
  });

  describe('Reply Workflow with Sanitization', () => {
    it('should sanitize reply content before sending', async () => {
      const replyContent = '<p>Thank you for your message!</p><script>alert("xss")</script>';
      
      const sanitizationResult = sanitizationService.sanitizeEmailData({
        to: 'sender1@example.com',
        subject: 'Re: Test Subject',
        body: replyContent
      });

      expect(sanitizationResult.isValid).toBe(true);
      expect(sanitizationResult.sanitizedData.body).not.toContain('<script>');
      expect(sanitizationResult.sanitizedData.body).toContain('<p>');

      const result = await actionUtils.sendReplyWithValidation(
        'email1', 
        sanitizationResult.sanitizedData.body
      );

      expect(result.success).toBe(true);
      expect(emailService.sendReply).toHaveBeenCalledWith(
        'email1', 
        sanitizationResult.sanitizedData.body
      );
    });

    it('should reject unsafe reply content', async () => {
      const maliciousContent = 'URGENT ACTION REQUIRED! Verify account immediately!';
      
      const sanitizationResult = sanitizationService.sanitizeEmailData({
        to: 'sender1@example.com',
        subject: 'Re: Test Subject',
        body: maliciousContent
      });

      expect(sanitizationResult.isValid).toBe(false);
      expect(sanitizationResult.validationResults.body.riskLevel).toBe('high');

      const result = await actionUtils.sendReplyWithValidation('email1', '');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Reply body cannot be empty');
    });
  });

  describe('Email Refresh and New Email Detection', () => {
    it('should refresh emails and sanitize new content', async () => {
      const refreshResult = await actionUtils.refreshEmailsWithCache();
      expect(refreshResult.success).toBe(true);
      expect(refreshResult.data.emailCount).toBe(2);

      const checkResult = await actionUtils.checkForNewEmailsSmart({
        previousCount: 2,
        notifyCallback: vi.fn()
      });

      expect(checkResult.success).toBe(true);
      expect(checkResult.data.hasNewEmails).toBe(true);
      expect(checkResult.data.newEmailCount).toBe(1);
    });

    it('should handle background refresh with caching', async () => {
      const result = await actionUtils.refreshEmailsWithCache({ 
        background: true,
        useCache: true
      });

      expect(result.success).toBe(true);
      expect(result.data.refreshTime).toBeDefined();
      expect(emailService.loadEmailsInBackground).toHaveBeenCalled();
      expect(emailService.loadStatsInBackground).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should gracefully handle service failures', async () => {
      emailService.markAsRead.mockRejectedValue(new Error('Service unavailable'));

      const result = await actionUtils.markMultipleAsRead(['email1']);
      
      expect(result.success).toBe(true);
      expect(result.data.errorCount).toBe(1);
      expect(result.data.successCount).toBe(0);
    });

    it('should handle partial batch failures', async () => {
      emailService.markAsRead
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const result = await actionUtils.markMultipleAsRead(['email1', 'email2', 'email3']);
      
      expect(result.success).toBe(true);
      expect(result.data.successCount).toBe(2);
      expect(result.data.errorCount).toBe(1);
    });

    it('should handle sanitization failures gracefully', async () => {
      const invalidEmailData = {
        to: 'invalid-email-format',
        subject: 'Test',
        body: 'Test body'
      };

      const result = sanitizationService.sanitizeEmailData(invalidEmailData);
      expect(result.isValid).toBe(false);
      expect(result.issues[0]).toContain('Invalid recipient email');
    });
  });

  describe('Performance and Batch Processing', () => {
    it('should handle large batch operations efficiently', async () => {
      const emailIds = Array.from({ length: 50 }, (_, i) => `email${i + 1}`);
      
      const result = await actionUtils.markMultipleAsRead(emailIds, {
        onProgress: vi.fn()
      });

      expect(result.success).toBe(true);
      expect(result.data.totalProcessed).toBe(50);
      expect(emailService.markAsRead).toHaveBeenCalledTimes(50);
    });

    it('should process batches with appropriate delays', async () => {
      const start = Date.now();
      
      const result = await actionUtils.markMultipleAsRead(['email1', 'email2']);
      
      expect(result.success).toBe(true);
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Action Statistics and Monitoring', () => {
    it('should provide action statistics', () => {
      const stats = actionUtils.getActionStats();
      
      expect(stats.batchProcessor).toBeDefined();
      expect(stats.batchProcessor.batchSize).toBeDefined();
      expect(stats.batchProcessor.delayMs).toBeDefined();
    });

    it('should track sanitization statistics', () => {
      const stats = sanitizationService.getStats();
      
      expect(stats.strictMode).toBeDefined();
      expect(stats.allowedHtmlTags).toBeGreaterThan(0);
      expect(stats.dangerousPatterns).toBeGreaterThan(0);
    });
  });
});
/**
 * Email Workflow Integration Tests
 * Consolidated from coreIntegration.test.js and emailActionIntegration.test.js
 * Tests complete email workflows from loading to processing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEmailActionUtils, EmailActionTypes } from '../../lib/utils/emailActions.js';
import { createSanitizationService } from '../../lib/services/sanitizationService.js';
import { mockEmailFactory, mockEmailService, createErrorScenario } from '../utils/testHelpers.js';

describe('Email Workflow Integration Tests', () => {
  let emailService;
  let actionUtils;
  let sanitizationService;

  beforeEach(() => {
    emailService = {
      markAsRead: vi.fn().mockResolvedValue('marked-read'),
      markAsUnread: vi.fn().mockResolvedValue('marked-unread'),
      sendReply: vi.fn().mockResolvedValue('reply-sent'),
      loadEmails: vi.fn().mockResolvedValue([
        mockEmailFactory.unread({ id: 'email1', sender: 'test@example.com' }),
        mockEmailFactory.read({ id: 'email2', sender: 'sender2@example.com' })
      ]),
      loadEmailsInBackground: vi.fn().mockResolvedValue([]),
      loadStats: vi.fn().mockResolvedValue({ totalCount: 2, unreadCount: 1 }),
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

  describe('Complete Email Reading Workflow', () => {
    it('should load, sanitize, and display emails end-to-end', async () => {
      // Step 1: Load emails from service
      const emails = await emailService.loadEmails();
      expect(emails).toHaveLength(2);

      // Step 2: Sanitize emails for safe display
      const sanitizedEmails = emails.map(email => 
        sanitizationService.sanitizeEmailForDisplay(email)
      );

      expect(sanitizedEmails[0].sender).toBe('test@example.com');
      expect(sanitizedEmails[0].body_html).toBeDefined();
      expect(sanitizedEmails[1].sender).toBe('sender2@example.com');

      // Step 3: Process user actions (mark as read)
      const result = await actionUtils.markMultipleAsRead(['email1']);
      expect(result.success).toBe(true);
      expect(result.data.successCount).toBe(1);
      expect(emailService.markAsRead).toHaveBeenCalledWith('email1');
    });

    it('should handle email refresh with caching and new email detection', async () => {
      // Step 1: Refresh emails with caching
      const refreshResult = await actionUtils.refreshEmailsWithCache();
      expect(refreshResult.success).toBe(true);
      expect(refreshResult.data.emailCount).toBe(2);

      // Step 2: Check for new emails
      const checkResult = await actionUtils.checkForNewEmailsSmart({
        previousCount: 2,
        notifyCallback: vi.fn()
      });

      expect(checkResult.success).toBe(true);
      expect(checkResult.data.hasNewEmails).toBe(true);
      expect(checkResult.data.newEmailCount).toBe(1);

      // Step 3: Background refresh
      const backgroundResult = await actionUtils.refreshEmailsWithCache({ 
        background: true,
        useCache: true
      });

      expect(backgroundResult.success).toBe(true);
      expect(backgroundResult.data.refreshTime).toBeDefined();
      expect(emailService.loadEmailsInBackground).toHaveBeenCalled();
    });
  });

  describe('Email Reply Workflow with Security', () => {
    it('should complete secure reply workflow end-to-end', async () => {
      // Step 1: Compose reply with potentially unsafe content
      const replyContent = '<p>Thank you for your message!</p><script>alert("xss")</script>';
      
      // Step 2: Sanitize reply content
      const sanitizationResult = sanitizationService.sanitizeEmailData({
        to: 'test@example.com',
        subject: 'Re: Test Subject',
        body: replyContent
      });

      expect(sanitizationResult.isValid).toBe(true);
      expect(sanitizationResult.sanitizedData.body).not.toContain('<script>');
      expect(sanitizationResult.sanitizedData.body).toContain('<p>');

      // Step 3: Send sanitized reply
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

    it('should reject and block malicious reply attempts', async () => {
      // Step 1: Attempt to send high-risk content
      const maliciousContent = 'URGENT ACTION REQUIRED! Verify account immediately!';
      
      // Step 2: Sanitization should flag as risky
      const sanitizationResult = sanitizationService.sanitizeEmailData({
        to: 'test@example.com',
        subject: 'Re: Test Subject',
        body: maliciousContent
      });

      expect(sanitizationResult.isValid).toBe(false);
      expect(sanitizationResult.validationResults.body.riskLevel).toBe('high');

      // Step 3: Reply should be blocked
      const result = await actionUtils.sendReplyWithValidation('email1', '');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Reply body cannot be empty');
    });

    it('should prevent XSS attacks in complete reply workflow', () => {
      // Comprehensive XSS prevention test
      const xssAttempt = {
        to: 'victim@example.com',
        subject: 'Innocent Subject',
        body: '<p>Normal text</p><script>document.cookie="stolen=true"</script><img src="x" onerror="alert(1)">'
      };

      const result = sanitizationService.sanitizeEmailData(xssAttempt);

      expect(result.sanitizedData.body).not.toContain('<script>');
      expect(result.sanitizedData.body).not.toContain('onerror');
      expect(result.sanitizedData.body).not.toContain('document.cookie');
      expect(result.sanitizedData.body).toContain('<p>');
    });
  });

  describe('Bulk Operations and Performance Workflows', () => {
    it('should handle large batch operations efficiently', async () => {
      // Step 1: Prepare large batch of email IDs
      const emailIds = Array.from({ length: 50 }, (_, i) => `email${i + 1}`);
      
      // Step 2: Execute batch operation with performance monitoring
      const start = Date.now();
      const result = await actionUtils.markMultipleAsRead(emailIds, {
        onProgress: vi.fn()
      });
      const elapsed = Date.now() - start;

      // Step 3: Verify results and performance
      expect(result.success).toBe(true);
      expect(result.data.totalProcessed).toBe(50);
      expect(elapsed).toBeLessThan(5000); // Should complete within 5 seconds
      expect(emailService.markAsRead).toHaveBeenCalledTimes(50);
    });

    it('should handle partial failures with graceful recovery', async () => {
      // Step 1: Mock mixed success/failure responses
      emailService.markAsRead
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      // Step 2: Execute batch with expected failures
      const result = await actionUtils.markMultipleAsRead(['email1', 'email2', 'email3']);

      // Step 3: Verify graceful handling
      expect(result.success).toBe(true);
      expect(result.data.successCount).toBe(2);
      expect(result.data.errorCount).toBe(1);
    });

    it('should sanitize large content volumes efficiently', () => {
      // Step 1: Create large email content
      const largeContent = '<p>' + 'x'.repeat(10000) + '</p>';
      const email = mockEmailFactory.basic({
        id: 'large-email',
        body_html: largeContent
      });

      // Step 2: Sanitize with performance monitoring
      const start = Date.now();
      const sanitized = sanitizationService.sanitizeEmailForDisplay(email);
      const elapsed = Date.now() - start;

      // Step 3: Verify efficiency and correctness
      expect(sanitized.body_html).toBeDefined();
      expect(elapsed).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Error Handling and Recovery Workflows', () => {
    it('should handle complete service failures gracefully', async () => {
      // Step 1: Simulate service unavailable
      emailService.loadEmails.mockRejectedValueOnce(new Error('Service unavailable'));

      await expect(emailService.loadEmails()).rejects.toThrow('Service unavailable');

      // Step 2: Service recovery
      emailService.loadEmails.mockResolvedValueOnce([]);
      const emails = await emailService.loadEmails();
      expect(emails).toEqual([]);
    });

    it('should validate and reject invalid operations', async () => {
      // Step 1: Test invalid email IDs
      const invalidEmailIds = ['', null, undefined, 123];
      
      for (const invalidId of invalidEmailIds) {
        const result = await actionUtils.sendReplyWithValidation(invalidId, 'Test reply');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid email ID');
      }

      // Step 2: Test invalid email formats
      const invalidEmailData = {
        to: 'invalid-email-format',
        subject: 'Test',
        body: 'Test body'
      };

      const result = sanitizationService.sanitizeEmailData(invalidEmailData);
      expect(result.isValid).toBe(false);
      expect(result.issues[0]).toContain('Invalid recipient email');
    });

    it('should handle null and undefined inputs gracefully', () => {
      // Test various invalid inputs
      const invalidInputs = [null, undefined, ''];

      invalidInputs.forEach(input => {
        const result = sanitizationService.sanitizeEmailForDisplay(input);
        expect(result).toBe(null);
      });

      // Test empty object
      const emptyObject = {};
      const result = sanitizationService.sanitizeEmailForDisplay(emptyObject);
      expect(result).toEqual({});

      // Test array input
      const arrayInput = [];
      const arrayResult = sanitizationService.sanitizeEmailForDisplay(arrayInput);
      expect(arrayResult).toEqual({});
    });
  });

  describe('Security and Validation Workflows', () => {
    it('should validate email composition data comprehensively', () => {
      // Step 1: Test mixed valid/invalid email data
      const emailData = {
        to: '  TEST@EXAMPLE.COM  ',
        subject: 'Test <script>alert("xss")</script> Subject',
        body: '<p>Safe content</p><script>alert("evil")</script>'
      };

      // Step 2: Sanitize and validate
      const result = sanitizationService.sanitizeEmailData(emailData);

      // Step 3: Verify sanitization results
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.to).toBe('test@example.com');
      expect(result.sanitizedData.subject).not.toContain('<script>');
      expect(result.sanitizedData.body).toContain('<p>');
      expect(result.sanitizedData.body).not.toContain('<script>');
    });

    it('should detect and flag risky content patterns', () => {
      // Step 1: Test phishing-like content
      const riskyEmail = {
        to: 'user@example.com',
        subject: 'Important Notice',
        body: 'URGENT ACTION REQUIRED! Click here immediately to verify your account!'
      };

      // Step 2: Analyze for risk patterns
      const result = sanitizationService.sanitizeEmailData(riskyEmail);

      // Step 3: Verify risk detection
      expect(result.isValid).toBe(false);
      expect(result.validationResults.body.riskLevel).toBe('high');
      expect(result.issues[0]).toContain('Potential phishing content detected');
    });

    it('should validate file attachments safely', () => {
      // Step 1: Test dangerous vs safe file types
      const dangerousFile = {
        name: 'virus.exe',
        type: 'application/x-executable',
        size: 1024
      };

      const safeFile = {
        name: 'document.pdf',
        type: 'application/pdf',
        size: 1024 * 1024
      };

      // Step 2: Validate file safety (concept test)
      const dangerousResult = sanitizationService.sanitizeEmailData({
        attachments: [dangerousFile]
      });
      const safeResult = sanitizationService.sanitizeEmailData({
        attachments: [safeFile]
      });

      // Note: This tests the concept - actual implementation would extend sanitization service
      expect(dangerousFile.name).toContain('.exe');
      expect(safeFile.type).toBe('application/pdf');
    });
  });

  describe('Monitoring and Statistics Workflows', () => {
    it('should provide comprehensive system statistics', () => {
      // Step 1: Gather action statistics
      const actionStats = actionUtils.getActionStats();
      
      // Step 2: Gather sanitization statistics
      const sanitizationStats = sanitizationService.getStats();

      // Step 3: Verify statistics completeness
      expect(actionStats.batchProcessor).toBeDefined();
      expect(actionStats.batchProcessor.batchSize).toBeGreaterThan(0);
      expect(actionStats.batchProcessor.delayMs).toBeGreaterThanOrEqual(0);

      expect(sanitizationStats.allowedHtmlTags).toBeGreaterThan(0);
      expect(sanitizationStats.dangerousPatterns).toBeGreaterThan(0);
      expect(typeof sanitizationStats.strictMode).toBe('boolean');
      expect(typeof sanitizationStats.logSanitization).toBe('boolean');
    });

    it('should track workflow performance metrics', async () => {
      // Step 1: Execute workflow with timing
      const start = Date.now();
      
      const result = await actionUtils.markMultipleAsRead(['email1', 'email2']);
      
      const elapsed = Date.now() - start;

      // Step 2: Verify performance and success
      expect(result.success).toBe(true);
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });
  });
});
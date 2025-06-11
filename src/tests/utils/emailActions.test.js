import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  EmailActionTypes,
  EmailValidation,
  EmailActionResult,
  EmailBatchProcessor,
  EmailActionUtils,
  createEmailActionUtils
} from '../../lib/utils/emailActions.js';

describe('EmailValidation', () => {
  describe('isValidEmailId', () => {
    it('should validate valid email IDs', () => {
      expect(EmailValidation.isValidEmailId('email123')).toBe(true);
      expect(EmailValidation.isValidEmailId('valid-email-id')).toBe(true);
    });

    it('should reject invalid email IDs', () => {
      expect(EmailValidation.isValidEmailId('')).toBe(false);
      expect(EmailValidation.isValidEmailId('   ')).toBe(false);
      expect(EmailValidation.isValidEmailId(null)).toBe(false);
      expect(EmailValidation.isValidEmailId(undefined)).toBe(false);
      expect(EmailValidation.isValidEmailId(123)).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should validate valid email objects', () => {
      const validEmail = {
        id: 'email123',
        subject: 'Test Subject',
        sender: 'test@example.com'
      };
      expect(EmailValidation.isValidEmail(validEmail)).toBe(true);
    });

    it('should reject invalid email objects', () => {
      expect(EmailValidation.isValidEmail(null)).toBe(false);
      expect(EmailValidation.isValidEmail({})).toBe(false);
      expect(EmailValidation.isValidEmail({ id: 'test' })).toBe(false);
      expect(EmailValidation.isValidEmail({ 
        id: 'test', 
        subject: 'Test' 
      })).toBe(false);
    });
  });

  describe('validateBulkAction', () => {
    it('should validate correct bulk actions', () => {
      const result = EmailValidation.validateBulkAction(
        ['email1', 'email2'], 
        EmailActionTypes.MARK_READ
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email ID arrays', () => {
      const result = EmailValidation.validateBulkAction(
        'not-an-array', 
        EmailActionTypes.MARK_READ
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email IDs must be an array');
    });

    it('should reject empty arrays', () => {
      const result = EmailValidation.validateBulkAction(
        [], 
        EmailActionTypes.MARK_READ
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one email ID is required');
    });

    it('should reject invalid action types', () => {
      const result = EmailValidation.validateBulkAction(
        ['email1'], 
        'invalid-action'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid action type: invalid-action');
    });

    it('should identify invalid email IDs in array', () => {
      const result = EmailValidation.validateBulkAction(
        ['valid-email', '', null, 'another-valid'], 
        EmailActionTypes.MARK_READ
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid email IDs');
    });
  });
});

describe('EmailActionResult', () => {
  it('should create successful results', () => {
    const result = EmailActionResult.success('test-action', { data: 'test' });
    
    expect(result.action).toBe('test-action');
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ data: 'test' });
    expect(result.error).toBe(null);
    expect(result.timestamp).toBeDefined();
  });

  it('should create error results', () => {
    const error = new Error('Test error');
    const result = EmailActionResult.error('test-action', error, { partial: 'data' });
    
    expect(result.action).toBe('test-action');
    expect(result.success).toBe(false);
    expect(result.data).toEqual({ partial: 'data' });
    expect(result.error).toBe(error);
    expect(result.timestamp).toBeDefined();
  });
});

describe('EmailBatchProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new EmailBatchProcessor(2, 10); // Small batch size and delay for testing
  });

  describe('createBatches', () => {
    it('should create correct batches', () => {
      const emailIds = ['email1', 'email2', 'email3', 'email4', 'email5'];
      const batches = processor.createBatches(emailIds);
      
      expect(batches).toHaveLength(3);
      expect(batches[0]).toEqual(['email1', 'email2']);
      expect(batches[1]).toEqual(['email3', 'email4']);
      expect(batches[2]).toEqual(['email5']);
    });

    it('should handle empty arrays', () => {
      const batches = processor.createBatches([]);
      expect(batches).toHaveLength(0);
    });
  });

  describe('processBatch', () => {
    it('should process all emails successfully', async () => {
      const emailIds = ['email1', 'email2', 'email3'];
      const mockProcessor = vi.fn().mockResolvedValue('success');
      const mockProgress = vi.fn();

      const results = await processor.processBatch(emailIds, mockProcessor, mockProgress);

      expect(mockProcessor).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockProgress).toHaveBeenCalled();
    });

    it('should handle processor errors gracefully', async () => {
      const emailIds = ['email1', 'email2'];
      const mockProcessor = vi.fn()
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('Process failed'));

      const results = await processor.processBatch(emailIds, mockProcessor);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('delay', () => {
    it('should delay for specified time', async () => {
      const start = Date.now();
      await processor.delay(50);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some variance
    });
  });
});

describe('EmailActionUtils', () => {
  let emailService;
  let logger;
  let actionUtils;

  beforeEach(() => {
    emailService = {
      markAsRead: vi.fn().mockResolvedValue('marked-read'),
      markAsUnread: vi.fn().mockResolvedValue('marked-unread'),
      sendReply: vi.fn().mockResolvedValue('reply-sent'),
      loadEmails: vi.fn().mockResolvedValue(['email1', 'email2']),
      loadEmailsInBackground: vi.fn().mockResolvedValue(['email1', 'email2']),
      loadStats: vi.fn().mockResolvedValue({ totalCount: 10, unreadCount: 3 }),
      loadStatsInBackground: vi.fn().mockResolvedValue({ totalCount: 10, unreadCount: 3 }),
      checkForNewEmails: vi.fn().mockResolvedValue({ 
        hasNewEmails: true, 
        newEmailCount: 2,
        totalCount: 12,
        unreadCount: 5
      })
    };

    logger = {
      info: vi.fn(),
      error: vi.fn()
    };

    actionUtils = new EmailActionUtils(emailService, logger);
  });

  describe('markMultipleAsRead', () => {
    it('should successfully mark multiple emails as read', async () => {
      const emailIds = ['email1', 'email2'];
      const result = await actionUtils.markMultipleAsRead(emailIds);

      expect(result.success).toBe(true);
      expect(result.action).toBe(EmailActionTypes.BULK_ACTION);
      expect(result.data.successCount).toBe(2);
      expect(result.data.errorCount).toBe(0);
      expect(emailService.markAsRead).toHaveBeenCalledTimes(2);
    });

    it('should handle validation errors', async () => {
      const result = await actionUtils.markMultipleAsRead([]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('At least one email ID is required');
    });

    it('should handle service errors', async () => {
      emailService.markAsRead.mockRejectedValue(new Error('Service error'));
      
      const result = await actionUtils.markMultipleAsRead(['email1']);

      expect(result.success).toBe(true); // Bulk operation succeeds even if individual items fail
      expect(result.data.errorCount).toBe(1);
    });
  });

  describe('markMultipleAsUnread', () => {
    it('should successfully mark multiple emails as unread', async () => {
      const emailIds = ['email1', 'email2'];
      const result = await actionUtils.markMultipleAsUnread(emailIds);

      expect(result.success).toBe(true);
      expect(result.data.action).toBe(EmailActionTypes.MARK_UNREAD);
      expect(emailService.markAsUnread).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendReplyWithValidation', () => {
    it('should successfully send a reply', async () => {
      const result = await actionUtils.sendReplyWithValidation('email1', 'Reply body');

      expect(result.success).toBe(true);
      expect(result.action).toBe(EmailActionTypes.SEND_REPLY);
      expect(emailService.sendReply).toHaveBeenCalledWith('email1', 'Reply body');
    });

    it('should validate email ID', async () => {
      const result = await actionUtils.sendReplyWithValidation('', 'Reply body');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email ID');
    });

    it('should validate reply body', async () => {
      const result = await actionUtils.sendReplyWithValidation('email1', '');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Reply body cannot be empty');
    });

    it('should handle service errors', async () => {
      emailService.sendReply.mockRejectedValue(new Error('Send failed'));
      
      const result = await actionUtils.sendReplyWithValidation('email1', 'Reply body');

      expect(result.success).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('refreshEmailsWithCache', () => {
    it('should refresh emails and stats', async () => {
      const result = await actionUtils.refreshEmailsWithCache();

      expect(result.success).toBe(true);
      expect(result.action).toBe(EmailActionTypes.REFRESH);
      expect(result.data.emailCount).toBe(2);
      expect(result.data.unreadCount).toBe(3);
      expect(emailService.loadEmails).toHaveBeenCalled();
      expect(emailService.loadStats).toHaveBeenCalled();
    });

    it('should use background loading when requested', async () => {
      const result = await actionUtils.refreshEmailsWithCache({ background: true });

      expect(result.success).toBe(true);
      expect(emailService.loadEmailsInBackground).toHaveBeenCalled();
      expect(emailService.loadStatsInBackground).toHaveBeenCalled();
    });
  });

  describe('checkForNewEmailsSmart', () => {
    it('should check for new emails and handle notifications', async () => {
      const notifyCallback = vi.fn();
      const result = await actionUtils.checkForNewEmailsSmart({
        notifyCallback,
        previousCount: 10
      });

      expect(result.success).toBe(true);
      expect(result.data.hasNewEmails).toBe(true);
      expect(result.data.newEmailCount).toBe(2);
      expect(notifyCallback).toHaveBeenCalledWith(2, expect.any(Object));
    });

    it('should handle check errors', async () => {
      emailService.checkForNewEmails.mockRejectedValue(new Error('Check failed'));
      
      const result = await actionUtils.checkForNewEmailsSmart();

      expect(result.success).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getActionStats', () => {
    it('should return action statistics', () => {
      const stats = actionUtils.getActionStats();

      expect(stats.batchProcessor).toBeDefined();
      expect(stats.batchProcessor.batchSize).toBeDefined();
      expect(stats.batchProcessor.delayMs).toBeDefined();
    });
  });
});

describe('createEmailActionUtils', () => {
  it('should create EmailActionUtils instance with default logger', () => {
    const mockEmailService = {};
    const utils = createEmailActionUtils(mockEmailService);

    expect(utils).toBeInstanceOf(EmailActionUtils);
    expect(utils.emailService).toBe(mockEmailService);
  });

  it('should create EmailActionUtils instance with custom logger', () => {
    const mockEmailService = {};
    const customLogger = { info: vi.fn(), error: vi.fn() };
    const utils = createEmailActionUtils(mockEmailService, { logger: customLogger });

    expect(utils).toBeInstanceOf(EmailActionUtils);
    expect(utils.logger).toBe(customLogger);
  });
});
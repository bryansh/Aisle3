/**
 * Email Action Utilities - Comprehensive utilities for email operations
 * Provides high-level abstractions for common email actions
 * @fileoverview Email action utilities with enhanced error handling and batch processing
 */

/**
 * Email action types for consistent action tracking
 */
export const EmailActionTypes = {
  MARK_READ: 'mark_read',
  MARK_UNREAD: 'mark_unread',
  SEND_REPLY: 'send_reply',
  DELETE: 'delete',
  ARCHIVE: 'archive',
  REFRESH: 'refresh',
  BULK_ACTION: 'bulk_action'
};

/**
 * Email validation utilities
 */
export class EmailValidation {
  /**
   * Validate email ID format
   * @param {string} emailId - Email ID to validate
   * @returns {boolean} Whether the email ID is valid
   */
  static isValidEmailId(emailId) {
    return typeof emailId === 'string' && emailId.length > 0 && emailId.trim() !== '';
  }

  /**
   * Validate email content structure
   * @param {any} email - Email object to validate
   * @returns {boolean} Whether the email structure is valid
   */
  static isValidEmail(email) {
    if (!email || typeof email !== 'object') {
      return false;
    }
    
    return Boolean(email.id && 
                   typeof email.subject === 'string' &&
                   typeof email.sender === 'string');
  }

  /**
   * Validate bulk action parameters
   * @param {string[]} emailIds - Array of email IDs
   * @param {string} action - Action type
   * @returns {{isValid: boolean, errors: string[]}} Validation result with isValid and errors
   */
  static validateBulkAction(emailIds, action) {
    const errors = [];
    
    if (!Array.isArray(emailIds)) {
      errors.push('Email IDs must be an array');
    } else if (emailIds.length === 0) {
      errors.push('At least one email ID is required');
    } else {
      const invalidIds = emailIds.filter(id => !this.isValidEmailId(id));
      if (invalidIds.length > 0) {
        errors.push(`Invalid email IDs: ${invalidIds.join(', ')}`);
      }
    }

    if (!Object.values(EmailActionTypes).includes(action)) {
      errors.push(`Invalid action type: ${action}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Email action result builder for consistent response format
 */
export class EmailActionResult {
  /**
   * @param {string} action
   * @param {boolean} success
   * @param {any} data
   * @param {string|Error|null} error
   */
  constructor(action, success = true, data = null, error = null) {
    this.action = action;
    this.success = success;
    this.timestamp = new Date().toISOString();
    this.data = data;
    this.error = error;
  }

  /**
   * Create successful result
   * @param {string} action - Action type
   * @param {any} data - Result data
   * @returns {EmailActionResult}
   */
  static success(action, data = null) {
    return new EmailActionResult(action, true, data, null);
  }

  /**
   * Create error result
   * @param {string} action - Action type
   * @param {Error|string} error - Error details
   * @param {any} data - Partial data if any
   * @returns {EmailActionResult}
   */
  static error(action, error, data = null) {
    return new EmailActionResult(action, false, data, error);
  }
}

/**
 * Email batch processor for handling multiple email operations efficiently
 */
export class EmailBatchProcessor {
  constructor(batchSize = 10, delayMs = 100) {
    this.batchSize = batchSize;
    this.delayMs = delayMs;
  }

  /**
   * Process emails in batches with configurable delay
   * @param {string[]} emailIds - Array of email IDs
   * @param {Function} processor - Function to process each email
   * @param {Function|null} onProgress - Progress callback (optional)
   * @returns {Promise<EmailActionResult[]>}
   */
  async processBatch(emailIds, processor, onProgress = null) {
    const results = [];
    const batches = this.createBatches(emailIds);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchPromises = batch.map(async (emailId) => {
        try {
          const result = await processor(emailId);
          return EmailActionResult.success('batch_item', { emailId, result });
        } catch (error) {
          return EmailActionResult.error('batch_item', /** @type {Error} */ (error), { emailId });
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : r.reason));

      // Progress callback
      if (onProgress) {
        onProgress({
          completed: (i + 1) * this.batchSize,
          total: emailIds.length,
          batchIndex: i + 1,
          totalBatches: batches.length
        });
      }

      // Delay between batches to avoid overwhelming the API
      if (i < batches.length - 1 && this.delayMs > 0) {
        await this.delay(this.delayMs);
      }
    }

    return results;
  }

  /**
   * Create batches from array of email IDs
   * @param {string[]} emailIds - Array of email IDs
   * @returns {string[][]} Array of batches
   */
  createBatches(emailIds) {
    const batches = [];
    for (let i = 0; i < emailIds.length; i += this.batchSize) {
      batches.push(emailIds.slice(i, i + this.batchSize));
    }
    return batches;
  }

  /**
   * Delay utility
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Email action utilities with enhanced error handling and logging
 */
export class EmailActionUtils {
  /**
   * @param {any} emailService
   * @param {any} logger
   */
  constructor(emailService, logger = console) {
    this.emailService = emailService;
    this.logger = logger;
    this.batchProcessor = new EmailBatchProcessor();
  }

  /**
   * Mark multiple emails as read with batch processing
   * @param {string[]} emailIds - Array of email IDs
   * @param {any} options - Options for batch processing
   * @returns {Promise<EmailActionResult>}
   */
  async markMultipleAsRead(emailIds, options = {}) {
    const validation = EmailValidation.validateBulkAction(emailIds, EmailActionTypes.MARK_READ);
    if (!validation.isValid) {
      return EmailActionResult.error(EmailActionTypes.BULK_ACTION, validation.errors.join(', '));
    }

    try {
      this.logger.info(`Marking ${emailIds.length} emails as read`);
      
      const results = await this.batchProcessor.processBatch(
        emailIds,
        /** @param {string} emailId */ (emailId) => this.emailService.markAsRead(emailId),
        options.onProgress
      );

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.length - successCount;

      this.logger.info(`Bulk mark as read completed: ${successCount} success, ${errorCount} errors`);

      return EmailActionResult.success(EmailActionTypes.BULK_ACTION, {
        action: EmailActionTypes.MARK_READ,
        totalProcessed: emailIds.length,
        successCount,
        errorCount,
        results
      });
    } catch (error) {
      this.logger.error('Bulk mark as read failed:', error);
      return EmailActionResult.error(EmailActionTypes.BULK_ACTION, /** @type {Error} */ (error));
    }
  }

  /**
   * Mark multiple emails as unread with batch processing
   * @param {string[]} emailIds - Array of email IDs
   * @param {any} options - Options for batch processing
   * @returns {Promise<EmailActionResult>}
   */
  async markMultipleAsUnread(emailIds, options = {}) {
    const validation = EmailValidation.validateBulkAction(emailIds, EmailActionTypes.MARK_UNREAD);
    if (!validation.isValid) {
      return EmailActionResult.error(EmailActionTypes.BULK_ACTION, validation.errors.join(', '));
    }

    try {
      this.logger.info(`Marking ${emailIds.length} emails as unread`);
      
      const results = await this.batchProcessor.processBatch(
        emailIds,
        /** @param {string} emailId */ (emailId) => this.emailService.markAsUnread(emailId),
        options.onProgress
      );

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.length - successCount;

      this.logger.info(`Bulk mark as unread completed: ${successCount} success, ${errorCount} errors`);

      return EmailActionResult.success(EmailActionTypes.BULK_ACTION, {
        action: EmailActionTypes.MARK_UNREAD,
        totalProcessed: emailIds.length,
        successCount,
        errorCount,
        results
      });
    } catch (error) {
      this.logger.error('Bulk mark as unread failed:', error);
      return EmailActionResult.error(EmailActionTypes.BULK_ACTION, /** @type {Error} */ (error));
    }
  }

  /**
   * Enhanced reply with validation and error handling
   * @param {string} originalEmailId - Original email ID
   * @param {string} replyBody - Reply content
   * @param {any} options - Reply options
   * @returns {Promise<EmailActionResult>}
   */
  async sendReplyWithValidation(originalEmailId, replyBody, options = {}) {
    if (!EmailValidation.isValidEmailId(originalEmailId)) {
      return EmailActionResult.error(EmailActionTypes.SEND_REPLY, 'Invalid email ID');
    }

    if (!replyBody || replyBody.trim().length === 0) {
      return EmailActionResult.error(EmailActionTypes.SEND_REPLY, 'Reply body cannot be empty');
    }

    try {
      this.logger.info(`Sending reply to email: ${originalEmailId}`);
      
      const result = await this.emailService.sendReply(originalEmailId, replyBody);
      
      this.logger.info(`Reply sent successfully: ${result}`);
      
      return EmailActionResult.success(EmailActionTypes.SEND_REPLY, {
        originalEmailId,
        replyBody: replyBody.substring(0, 100) + (replyBody.length > 100 ? '...' : ''),
        result
      });
    } catch (error) {
      this.logger.error('Reply failed:', error);
      return EmailActionResult.error(EmailActionTypes.SEND_REPLY, /** @type {Error} */ (error), { originalEmailId });
    }
  }

  /**
   * Refresh emails with enhanced error handling and caching
   * @param {any} options - Refresh options
   * @returns {Promise<EmailActionResult>}
   */
  async refreshEmailsWithCache(options = {}) {
    const { useCache = true, maxCacheAge = 30000 } = options;
    
    try {
      this.logger.info('Refreshing emails');
      
      let emails;
      if (options.background) {
        emails = await this.emailService.loadEmailsInBackground();
      } else {
        emails = await this.emailService.loadEmails();
      }

      const stats = options.background 
        ? await this.emailService.loadStatsInBackground()
        : await this.emailService.loadStats();

      this.logger.info(`Emails refreshed: ${emails.length} emails, ${stats.unreadCount} unread`);

      return EmailActionResult.success(EmailActionTypes.REFRESH, {
        emailCount: emails.length,
        unreadCount: stats.unreadCount,
        totalCount: stats.totalCount,
        refreshTime: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Email refresh failed:', error);
      return EmailActionResult.error(EmailActionTypes.REFRESH, /** @type {Error} */ (error));
    }
  }

  /**
   * Check for new emails with smart polling
   * @param {any} options - Polling options
   * @returns {Promise<EmailActionResult>}
   */
  async checkForNewEmailsSmart(options = {}) {
    const { 
      useBackgroundLoading = true,
      previousCount = 0,
      notifyCallback = null 
    } = options;

    try {
      this.logger.info('Checking for new emails');
      
      const result = await this.emailService.checkForNewEmails(useBackgroundLoading);
      
      if (result.hasNewEmails) {
        const newEmailCount = result.newEmailCount || (result.totalCount - previousCount);
        this.logger.info(`Found ${newEmailCount} new emails`);
        
        if (notifyCallback) {
          notifyCallback(newEmailCount, result);
        }
      }

      return EmailActionResult.success('check_new_emails', {
        hasNewEmails: result.hasNewEmails,
        newEmailCount: result.newEmailCount,
        totalCount: result.totalCount,
        unreadCount: result.unreadCount
      });
    } catch (error) {
      this.logger.error('Check for new emails failed:', error);
      return EmailActionResult.error('check_new_emails', /** @type {Error} */ (error));
    }
  }

  /**
   * Get action statistics
   * @returns {object} Action statistics
   */
  getActionStats() {
    // This could be extended to track action metrics
    return {
      batchProcessor: {
        batchSize: this.batchProcessor.batchSize,
        delayMs: this.batchProcessor.delayMs
      }
    };
  }
}

/**
 * Factory function to create email action utilities
 * @param {any} emailService - Email service instance
 * @param {any} options - Configuration options
 * @returns {EmailActionUtils}
 */
export function createEmailActionUtils(emailService, options = {}) {
  const logger = options.logger || console;
  return new EmailActionUtils(emailService, logger);
}
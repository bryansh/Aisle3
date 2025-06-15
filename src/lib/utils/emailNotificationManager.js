import { createNotificationService } from './notificationService.js';
import { createEmailPollingManager } from './pollingManager.js';

/**
 * EmailNotificationManager - Handles email notifications and polling
 */
export class EmailNotificationManager {
  constructor() {
    this.notificationService = null;
    this.pollingManager = null;
    this.emailOperations = null;
    this.lastNotificationTime = null;
    this.notifiedEmailIds = new Set(); // Track which emails we've already notified about
    this.isInitialized = false;
    /** @type {Function[]} */
    this.inAppNotificationListeners = []; // Listeners for in-app notifications
    
    // Default settings
    this.settings = {
      enabled: true,
      osNotificationsEnabled: true,
      inAppNotificationsEnabled: true, // Fallback when OS notifications disabled
      pollingEnabled: true,
      pollingIntervalSeconds: 30,
      notificationCooldownMinutes: 1, // Minimum time between notifications
      maxEmailsToShow: 3, // Max emails to show details for in notification
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };
  }

  /**
   * Initialize the email notification manager
   * @param {Object} emailOperations - Email operations from store
   * @param {Object} settings - Optional settings override
   */
  async initialize(emailOperations, settings = {}) {
    this.settings = { ...this.settings, ...settings };
    this.emailOperations = emailOperations;

    try {
      // Initialize notification service if OS notifications are enabled
      if (this.settings.osNotificationsEnabled) {
        this.notificationService = await createNotificationService();
        console.log('📧 EmailNotificationManager: Notification service initialized');
      }

      // Initialize polling manager
      this.pollingManager = createEmailPollingManager(emailOperations, {
        intervalSeconds: this.settings.pollingIntervalSeconds,
        enabled: this.settings.pollingEnabled,
        runImmediately: false
      });

      // Set up result listener to detect new emails
      this.pollingManager.addResultListener((result) => {
        this.handlePollingResult(result);
      });

      this.isInitialized = true;
      console.log('📧 EmailNotificationManager: Initialized successfully');
      
      return { success: true };
    } catch (error) {
      console.error('❌ EmailNotificationManager: Failed to initialize:', error);
      this.isInitialized = false;
      return { success: false, error };
    }
  }

  /**
   * Handle polling result and check for new emails to notify about
   * @param {Object} result - Polling result from PollingManager
   * @param {boolean} result.success - Whether the polling was successful
   * @param {Array<string>|Object} [result.data] - Array of new email IDs or object with emailIds and emailDetails
   */
  async handlePollingResult(result) {
    if (!result.success || !result.data) {
      return;
    }

    try {
      // Handle both old format (array) and new format (object with emailIds and emailDetails)
      if (Array.isArray(result.data)) {
        // Legacy format - just email IDs, convert to new format with empty details
        const newEmailIds = result.data;
        if (newEmailIds.length > 0) {
          await this.processNewEmailsWithDetails(newEmailIds, []);
        }
      } else if (result.data && /** @type {any} */ (result.data).emailIds) {
        // New format - has both IDs and details
        const { emailIds, emailDetails } = /** @type {any} */ (result.data);
        if (emailIds.length > 0) {
          await this.processNewEmailsWithDetails(emailIds, emailDetails);
        }
      }
    } catch (error) {
      console.error('❌ EmailNotificationManager: Error processing new emails:', error);
    }
  }


  /**
   * Process new emails with details already available and send notifications
   * @param {Array<string>} newEmailIds - Array of new email IDs
   * @param {Array<Object>} emailDetails - Array of email objects with details
   */
  async processNewEmailsWithDetails(newEmailIds, emailDetails) {
    if (!this.settings.enabled || !this.shouldNotify()) {
      return;
    }

    // Filter out emails we've already notified about
    const emailsToNotify = newEmailIds.filter(id => !this.notifiedEmailIds.has(id));
    
    if (emailsToNotify.length === 0) {
      return;
    }

    // Add to notified set
    emailsToNotify.forEach(id => this.notifiedEmailIds.add(id));

    // Filter email details to match the emails we're notifying about
    const filteredEmailDetails = emailDetails
      .filter(/** @param {any} email */ email => emailsToNotify.includes(email.id))
      .slice(0, this.settings.maxEmailsToShow); // Limit number of emails

    console.log('📧 Using provided email details for notification:', filteredEmailDetails);

    // Send notification
    await this.sendEmailNotification(emailsToNotify.length, filteredEmailDetails);

    // Update last notification time
    this.lastNotificationTime = Date.now();

    console.log(`📧 Notified about ${emailsToNotify.length} new emails with details`);
  }


  /**
   * Add a listener for in-app notifications
   * @param {Function} listener - Callback function for in-app notifications
   * @returns {Function} Unsubscribe function
   */
  addInAppNotificationListener(listener) {
    this.inAppNotificationListeners.push(listener);
    return () => {
      const index = this.inAppNotificationListeners.indexOf(listener);
      if (index > -1) {
        this.inAppNotificationListeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit in-app notification
   * @param {Object} notification - Notification data
   */
  emitInAppNotification(notification) {
    this.inAppNotificationListeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.warn('Error in in-app notification listener:', error);
      }
    });
  }

  /**
   * Send email notification (OS and/or in-app)
   * @param {number} count - Number of new emails
   * @param {Array<Object>} emailDetails - Array of email objects
   */
  async sendEmailNotification(count, emailDetails = []) {
    let osNotificationSent = false;
    let inAppNotificationSent = false;

    // Try OS notification first if enabled
    if (this.settings.osNotificationsEnabled && this.notificationService?.isAvailable()) {
      try {
        await this.notificationService.notifyNewEmails(count, emailDetails);
        osNotificationSent = true;
        console.log('📧 OS notification sent successfully');
      } catch (error) {
        console.error('❌ Failed to send OS notification:', error);
      }
    }

    // Send in-app notification only if OS notification is disabled or failed
    if (this.settings.inAppNotificationsEnabled && !osNotificationSent) {
      try {
        const message = this.formatInAppNotificationMessage(count, emailDetails);
        this.emitInAppNotification({
          type: 'email',
          title: count === 1 && emailDetails.length > 0 
            ? this.formatSingleEmailTitle(emailDetails[0])
            : `${count} New Emails`,
          message,
          count,
          emailDetails
        });
        inAppNotificationSent = true;
        console.log('📧 In-app notification sent as fallback');
      } catch (error) {
        console.error('❌ Failed to send in-app notification:', error);
      }
    }

    if (!osNotificationSent && !inAppNotificationSent) {
      console.log('📧 No notifications sent - all notification types disabled or failed');
    }
  }

  /**
   * Format title for single email notification
   * @param {any} email - Email details
   * @returns {string} Formatted title
   */
  formatSingleEmailTitle(email) {
    const sender = email.sender || 'Unknown Sender';
    const subject = email.subject || 'No subject';
    
    // Truncate sender if too long
    const maxSenderLength = 25;
    const truncatedSender = sender.length > maxSenderLength 
      ? sender.substring(0, maxSenderLength) + '...' 
      : sender;
    
    // Truncate subject if too long
    const maxSubjectLength = 35;
    const truncatedSubject = subject.length > maxSubjectLength 
      ? subject.substring(0, maxSubjectLength) + '...' 
      : subject;
    
    return `**${truncatedSender}** ${truncatedSubject}`;
  }

  /**
   * Format message for in-app notification
   * @param {number} count - Number of emails
   * @param {Array<any>} emailDetails - Email details
   * @returns {string} Formatted message
   */
  formatInAppNotificationMessage(count, emailDetails) {
    if (count === 1 && emailDetails.length > 0) {
      const email = emailDetails[0];
      // For single emails, show a preview of the message content
      const preview = email.preview || email.snippet || email.body || '';
      const maxPreviewLength = 80;
      const truncatedPreview = preview.length > maxPreviewLength 
        ? preview.substring(0, maxPreviewLength) + '...' 
        : preview;
      
      return truncatedPreview || 'No preview available';
    } else if (count > 1) {
      if (emailDetails.length > 0) {
        const senders = emailDetails.slice(0, this.settings.maxEmailsToShow)
          .map(email => email.sender)
          .filter(sender => sender);
        
        if (senders.length > 0) {
          const senderList = senders.join(', ');
          const remainingCount = count - senders.length;
          return remainingCount > 0 
            ? `From: ${senderList} and ${remainingCount} others`
            : `From: ${senderList}`;
        }
      }
      return `You have ${count} new emails`;
    }
    return 'You have new email';
  }

  /**
   * Check if we should send a notification now
   * @returns {boolean} Whether to send notification
   */
  shouldNotify() {
    // Check cooldown period
    if (this.lastNotificationTime) {
      const timeSinceLastNotification = Date.now() - this.lastNotificationTime;
      const cooldownMs = this.settings.notificationCooldownMinutes * 60 * 1000;
      
      if (timeSinceLastNotification < cooldownMs) {
        return false;
      }
    }

    // Check quiet hours
    if (this.settings.quietHours.enabled) {
      if (this.isInQuietHours()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if current time is in quiet hours
   * @returns {boolean} Whether we're in quiet hours
   */
  isInQuietHours() {
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const startTime = this.parseTime(this.settings.quietHours.start);
    const endTime = this.parseTime(this.settings.quietHours.end);

    if (startTime <= endTime) {
      // Same day quiet hours (e.g., 14:00 to 18:00)
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Overnight quiet hours (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  /**
   * Parse time string to minutes
   * @param {string} timeStr - Time string in HH:MM format
   * @returns {number} Time in HHMM format
   */
  parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 100 + minutes;
  }

  /**
   * Start email polling and notifications
   */
  start() {
    if (!this.isInitialized || !this.pollingManager) {
      console.warn('⚠️ EmailNotificationManager not initialized, cannot start');
      return false;
    }

    if (this.settings.pollingEnabled) {
      return this.pollingManager.start();
    }
    return false;
  }

  /**
   * Stop email polling and notifications
   */
  stop() {
    if (this.pollingManager) {
      return this.pollingManager.stop();
    }
    return false;
  }

  /**
   * Update settings
   * @param {Object} newSettings - New settings to apply
   * @param {number} [newSettings.pollingIntervalSeconds] - Polling interval in seconds
   * @param {boolean} [newSettings.pollingEnabled] - Whether polling is enabled
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };

    // Update polling manager if interval changed
    if (this.pollingManager && newSettings.pollingIntervalSeconds) {
      this.pollingManager.setInterval(newSettings.pollingIntervalSeconds);
    }

    // Enable/disable polling
    if (this.pollingManager && newSettings.pollingEnabled !== undefined) {
      this.pollingManager.setEnabled(newSettings.pollingEnabled);
    }
  }

  /**
   * Clear notification history (for testing or reset)
   */
  clearNotificationHistory() {
    this.notifiedEmailIds.clear();
    this.lastNotificationTime = null;
    console.log('📧 Notification history cleared');
  }

  /**
   * Get current status
   * @returns {Object} Current notification manager status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isPolling: this.pollingManager?.isRunning() || false,
      notificationServiceAvailable: this.notificationService?.isAvailable() || false,
      lastNotificationTime: this.lastNotificationTime,
      notifiedEmailCount: this.notifiedEmailIds.size,
      settings: this.settings,
      pollingStats: this.pollingManager?.getStats() || null
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.pollingManager) {
      this.pollingManager.cleanup();
    }
    this.notifiedEmailIds.clear();
    this.inAppNotificationListeners.length = 0;
    this.emailOperations = null;
    this.notificationService = null;
    this.isInitialized = false;
    console.log('🧹 EmailNotificationManager cleaned up');
  }
}

/**
 * Create and initialize email notification manager
 * @param {Object} emailOperations - Email operations from store
 * @param {Object} settings - Optional settings
 * @returns {Promise<EmailNotificationManager>} Initialized notification manager
 */
export async function createEmailNotificationManager(emailOperations, settings = {}) {
  const manager = new EmailNotificationManager();
  await manager.initialize(emailOperations, settings);
  return manager;
}
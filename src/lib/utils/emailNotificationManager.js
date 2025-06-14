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
    
    // Default settings
    this.settings = {
      enabled: true,
      osNotificationsEnabled: true,
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
        // Legacy format - just email IDs
        const newEmailIds = result.data;
        if (newEmailIds.length > 0) {
          await this.processNewEmails(newEmailIds);
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
   * Process new emails and send notifications
   * @param {Array<string>} newEmailIds - Array of new email IDs
   */
  async processNewEmails(newEmailIds) {
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

    // Get email details for notification
    const emailDetails = await this.getEmailDetails(emailsToNotify);
    console.log('📧 Email details for notification:', emailDetails);

    // Send notification
    await this.sendEmailNotification(emailsToNotify.length, emailDetails);

    // Update last notification time
    this.lastNotificationTime = Date.now();

    console.log(`📧 Notified about ${emailsToNotify.length} new emails`);
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
   * Get email details for notification
   * @param {Array<string>} emailIds - Array of email IDs
   * @returns {Promise<Array<Object>>} Array of email objects with details
   */
  async getEmailDetails(emailIds) {
    console.log('📧 Getting email details for IDs:', emailIds);
    
    if (!this.emailOperations) {
      console.log('📧 No email operations available');
      return [];
    }

    try {
      // Debug: Check what methods are available on emailOperations
      console.log('📧 Available emailOperations methods:', Object.keys(this.emailOperations || {}));
      
      // Wait a bit for emails to be loaded into the store after detection
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get current emails from the email operations/store
      const allEmails = /** @type {any} */ (this.emailOperations).getEmails ? /** @type {any} */ (this.emailOperations).getEmails() : [];
      console.log('📧 Total emails available:', allEmails.length);
      console.log('📧 Sample email structure:', allEmails[0] ? Object.keys(allEmails[0]) : 'No emails');
      
      // If still no emails, try different methods to get email data
      if (allEmails.length === 0) {
        console.log('📧 Email store empty, trying alternative approaches...');
        
        // Try different possible method names
        const possibleMethods = ['loadEmails', 'refreshEmails', 'fetchEmails', 'getEmailsList'];
        for (const method of possibleMethods) {
          if (/** @type {any} */ (this.emailOperations)[method]) {
            console.log(`📧 Trying method: ${method}`);
            try {
              await /** @type {any} */ (this.emailOperations)[method]();
              const emails = /** @type {any} */ (this.emailOperations).getEmails ? /** @type {any} */ (this.emailOperations).getEmails() : [];
              console.log(`📧 After ${method}, emails available:`, emails.length);
              if (emails.length > 0) break;
            } catch (error) {
              console.log(`📧 Method ${method} failed:`, error);
            }
          }
        }
      }
      
      // Get final email list
      const finalEmails = /** @type {any} */ (this.emailOperations).getEmails ? /** @type {any} */ (this.emailOperations).getEmails() : [];
      
      // Find the emails that match our IDs
      const emailDetails = emailIds
        .map(id => finalEmails.find(/** @param {any} email */ email => email.id === id))
        .filter(email => email != null)
        .slice(0, this.settings.maxEmailsToShow); // Limit number of emails

      console.log('📧 Found matching emails:', emailDetails.length);
      console.log('📧 Email details:', emailDetails);

      return emailDetails;
    } catch (error) {
      console.error('❌ Failed to get email details:', error);
      return [];
    }
  }

  /**
   * Send email notification
   * @param {number} count - Number of new emails
   * @param {Array<Object>} emailDetails - Array of email objects
   */
  async sendEmailNotification(count, emailDetails = []) {
    if (!this.settings.osNotificationsEnabled || !this.notificationService?.isAvailable()) {
      console.log('📧 OS notifications not available, skipping email notification');
      return;
    }

    try {
      await this.notificationService.notifyNewEmails(count, emailDetails);
    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
    }
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
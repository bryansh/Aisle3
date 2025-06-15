import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

/**
 * NotificationService - Handles OS-level notifications
 */
export class NotificationService {
  constructor() {
    this.permissionGranted = false;
    this.initialized = false;
  }

  /**
   * Initialize the notification service
   */
  async initialize() {
    try {
      // Check if permission is already granted
      this.permissionGranted = await isPermissionGranted();
      
      if (!this.permissionGranted) {
        // Request permission if not granted
        const permission = await requestPermission();
        this.permissionGranted = permission === 'granted';
      }

      this.initialized = true;
      
      if (this.permissionGranted) {
        console.log('🔔 Notification service initialized successfully');
      } else {
        console.warn('⚠️ Notification permission not granted');
      }
      
      return { success: true, permissionGranted: this.permissionGranted };
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
      this.initialized = false;
      return { success: false, error };
    }
  }

  /**
   * Check if notifications are available
   */
  isAvailable() {
    return this.initialized && this.permissionGranted;
  }

  /**
   * Send an OS notification
   * @param {Object} options - Notification options
   * @param {string} options.title - Notification title
   * @param {string} options.body - Notification body text
   * @param {string} [options.icon] - Optional icon (defaults to app icon)
   * @param {string} [options.sound] - Optional sound
   * @param {Array<Object>} [options.actions] - Optional action buttons
   * @returns {Promise<Object>} Result of notification send
   */
  async notify({ title, body, icon, sound, actions }) {
    if (!this.isAvailable()) {
      console.warn('⚠️ Notifications not available - permission not granted or service not initialized');
      return { success: false, reason: 'not_available' };
    }

    try {
      /** @type {any} */
      const notificationOptions = { title, body };
      if (icon) notificationOptions.icon = icon;
      if (sound) notificationOptions.sound = sound;
      if (actions) notificationOptions.actions = actions;

      await sendNotification(notificationOptions);

      console.log(`✅ OS notification sent: ${title}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return { success: false, error };
    }
  }

  /**
   * Send an update notification
   * @param {string} message - Update message from server
   * @returns {Promise<Object>} Result of notification send
   */
  async notifyUpdate(message) {
    return this.notify({
      title: 'Aisle3 Update Available',
      body: message.includes('Update available') 
        ? message 
        : 'A new version of Aisle3 is ready to install',
      actions: [
        {
          id: 'install',
          title: 'Install Now'
        },
        {
          id: 'dismiss',
          title: 'Later'
        }
      ]
    });
  }

  /**
   * Send a new email notification
   * @param {number} count - Number of new emails
   * @param {Array<Object>} emails - Array of new email objects (optional, for preview)
   * @returns {Promise<Object>} Result of notification send
   */
  async notifyNewEmails(count, emails = []) {
    let title = '';
    let body = '';

    if (count === 1) {
      // Single email - show sender and subject if available
      const email = emails[0];
      if (email) {
        title = `New email from ${/** @type {any} */ (email).sender}`;
        body = /** @type {any} */ (email).subject || 'No subject';
      } else {
        title = 'New email received';
        body = 'You have 1 new email';
      }
    } else {
      // Multiple emails
      title = `${count} new emails received`;
      
      if (emails.length > 0) {
        // Show first few senders
        const senders = emails.slice(0, 3).map(email => /** @type {any} */ (email).sender).join(', ');
        body = `From: ${senders}${emails.length > 3 ? ' and others' : ''}`;
      } else {
        body = `You have ${count} new emails`;
      }
    }

    return this.notify({
      title,
      body,
      actions: [
        {
          id: 'view',
          title: 'View Emails'
        },
        {
          id: 'dismiss',
          title: 'Dismiss'
        }
      ]
    });
  }

  /**
   * Send a general notification
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @returns {Promise<Object>} Result of notification send
   */
  async notifyGeneral(title, body) {
    return this.notify({ title, body });
  }

  /**
   * Get current permission status
   * @returns {Promise<boolean>} Whether notification permission is granted
   */
  async getPermissionStatus() {
    try {
      this.permissionGranted = await isPermissionGranted();
      return this.permissionGranted;
    } catch (error) {
      console.error('❌ Failed to check notification permission:', error);
      return false;
    }
  }

  /**
   * Request notification permission
   * @returns {Promise<boolean>} Whether permission was granted
   */
  async requestPermission() {
    try {
      const permission = await requestPermission();
      this.permissionGranted = permission === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('❌ Failed to request notification permission:', error);
      return false;
    }
  }
}

/**
 * Create and initialize notification service instance
 * @returns {Promise<NotificationService>} Initialized notification service
 */
export async function createNotificationService() {
  const service = new NotificationService();
  await service.initialize();
  return service;
}
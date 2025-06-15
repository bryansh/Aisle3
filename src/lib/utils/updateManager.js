import { invoke } from '@tauri-apps/api/core';
import { createNotificationService } from './notificationService.js';

/**
 * UpdateManager - Handles automatic update checking and notifications
 */
export class UpdateManager {
  constructor() {
    this.checkInterval = null;
    /** @type {Array<Function>} */
    this.listeners = [];
    this.isChecking = false;
    this.lastCheckTime = null;
    this.updateAvailable = false;
    this.updateInfo = null;
    this.notificationService = null;
    
    // Default settings
    this.settings = {
      autoCheckEnabled: true,
      checkIntervalHours: 1,
      notifyOnStartup: true,
      notifyOnUpdate: true,
      silentCheck: false,
      osNotificationsEnabled: true
    };
  }

  /**
   * Initialize the update manager
   * @param {Object} settings - Optional settings override
   */
  async initialize(settings = {}) {
    this.settings = { ...this.settings, ...settings };
    
    // Initialize notification service
    if (this.settings.osNotificationsEnabled) {
      try {
        this.notificationService = await createNotificationService();
        console.log('🔔 UpdateManager: Notification service initialized');
      } catch (error) {
        console.warn('⚠️ UpdateManager: Failed to initialize notifications:', error);
      }
    }
    
    if (this.settings.autoCheckEnabled) {
      // Check for updates on startup if enabled
      if (this.settings.notifyOnStartup) {
        setTimeout(() => {
          this.checkForUpdates(true); // Silent check on startup
        }, 5000); // Wait 5 seconds after app startup
      }
      
      // Start periodic checking
      this.startPeriodicChecking();
    }
  }

  /**
   * Start periodic update checking
   */
  startPeriodicChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    const intervalMs = this.settings.checkIntervalHours * 60 * 60 * 1000; // Convert hours to milliseconds
    
    this.checkInterval = setInterval(() => {
      this.checkForUpdates(true); // Silent periodic checks
    }, intervalMs);
    
    console.log(`📅 Update checking started - will check every ${this.settings.checkIntervalHours} hour(s)`);
  }

  /**
   * Stop periodic update checking
   */
  stopPeriodicChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🛑 Update checking stopped');
    }
  }

  /**
   * Check for updates
   * @param {boolean} silent - Whether to suppress notifications for "no updates" case
   * @returns {Promise<Object>} Update check result
   */
  async checkForUpdates(silent = false) {
    if (this.isChecking) {
      return { success: false, message: 'Update check already in progress' };
    }

    this.isChecking = true;
    this.lastCheckTime = new Date();
    
    try {
      console.log('🔍 Checking for updates...');
      const result = await invoke('check_for_updates');
      
      const updateAvailable = result.includes('Update available');
      this.updateAvailable = updateAvailable;
      this.updateInfo = result;
      
      // Notify listeners about the update check result
      this.notifyListeners({
        type: 'update-check-complete',
        updateAvailable,
        message: result,
        silent
      });
      
      if (updateAvailable && this.settings.notifyOnUpdate) {
        // Send in-app notification
        this.notifyListeners({
          type: 'update-available',
          message: result,
          updateInfo: this.updateInfo
        });

        // Send OS notification if enabled and available
        if (this.settings.osNotificationsEnabled && this.notificationService?.isAvailable()) {
          await this.notificationService.notifyUpdate(result);
        }
      } else if (!silent) {
        this.notifyListeners({
          type: 'no-update',
          message: result
        });
      }
      
      return {
        success: true,
        updateAvailable,
        message: result,
        lastCheckTime: this.lastCheckTime
      };
      
    } catch (error) {
      console.error('❌ Update check failed:', error);
      const errorMessage = `Update check failed: ${error}`;
      
      this.notifyListeners({
        type: 'update-check-error',
        message: errorMessage,
        error
      });
      
      return {
        success: false,
        message: errorMessage,
        error
      };
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Install available update
   * @returns {Promise<Object>} Install result
   */
  async installUpdate() {
    try {
      console.log('⬇️ Installing update...');
      
      this.notifyListeners({
        type: 'update-install-start',
        message: 'Installing update...'
      });
      
      const result = await invoke('install_update');
      
      this.notifyListeners({
        type: 'update-install-complete',
        message: result
      });
      
      return {
        success: true,
        message: result
      };
      
    } catch (error) {
      console.error('❌ Update install failed:', error);
      const errorMessage = `Update install failed: ${error}`;
      
      this.notifyListeners({
        type: 'update-install-error',
        message: errorMessage,
        error
      });
      
      return {
        success: false,
        message: errorMessage,
        error
      };
    }
  }

  /**
   * Add event listener for update events
   * @param {Function} listener - Event listener function
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   * @param {Function} listener - Event listener function to remove
   */
  removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of an event
   * @param {Object} event - Event object to send to listeners
   */
  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in update listener:', error);
      }
    });
  }

  /**
   * Update settings
   * @param {Object} newSettings - New settings to apply
   * @param {number} [newSettings.checkIntervalHours] - Check interval in hours
   * @param {boolean} [newSettings.autoCheckEnabled] - Whether auto checking is enabled
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    
    // Restart periodic checking if interval changed
    if (newSettings.checkIntervalHours || newSettings.autoCheckEnabled !== undefined) {
      if (this.settings.autoCheckEnabled) {
        this.startPeriodicChecking();
      } else {
        this.stopPeriodicChecking();
      }
    }
  }

  /**
   * Get current status
   * @returns {Object} Current update manager status
   */
  getStatus() {
    return {
      isChecking: this.isChecking,
      lastCheckTime: this.lastCheckTime,
      updateAvailable: this.updateAvailable,
      updateInfo: this.updateInfo,
      settings: this.settings,
      isPeriodicCheckingActive: !!this.checkInterval
    };
  }

  /**
   * Cleanup - stop all timers and clear listeners
   */
  cleanup() {
    this.stopPeriodicChecking();
    this.listeners = [];
    console.log('🧹 UpdateManager cleaned up');
  }
}

/**
 * Create and initialize update manager
 * @param {Object} settings - Optional settings
 * @returns {UpdateManager} Initialized update manager instance
 */
export function createUpdateManager(settings = {}) {
  const updateManager = new UpdateManager();
  updateManager.initialize(settings);
  return updateManager;
}
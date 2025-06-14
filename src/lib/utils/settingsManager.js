/**
 * Settings Manager - Handles localStorage persistence for app settings
 * Extracted from EmailApp.svelte for better testability and separation of concerns
 * @fileoverview Provides type-safe settings management with localStorage persistence
 */

/**
 * @typedef {Object} AppSettings
 * @property {boolean} autoPollingEnabled - Whether auto-polling is enabled
 * @property {number} pollingIntervalSeconds - Polling interval in seconds
 * @property {boolean} autoMarkReadEnabled - Whether auto-mark read is enabled
 * @property {number} autoMarkReadDelay - Auto-mark read delay in milliseconds
 * @property {boolean} osNotificationsEnabled - Whether OS notifications are enabled
 * @property {boolean} inAppNotificationsEnabled - Whether in-app notifications are enabled
 * @property {'default' | 'quick'} notificationAnimationMode - Animation mode for in-app notifications
 * @property {'html' | 'plaintext'} emailCompositionFormat - Default email composition format
 * @property {string} emailFontFamily - Default font family for email composition
 * @property {string} emailFontSize - Default font size for email composition
 * @property {boolean} autoSignatureEnabled - Whether to automatically add signature to emails
 * @property {string} emailSignature - Custom email signature text
 * @property {'above' | 'below'} replyQuotePosition - Position of original message in replies
 * @property {boolean} includeOriginalMessage - Whether to include original message in replies
 */

/**
 * Default application settings
 * @type {AppSettings}
 */
export const DEFAULT_SETTINGS = {
  autoPollingEnabled: false,
  pollingIntervalSeconds: 30,
  autoMarkReadEnabled: true,
  autoMarkReadDelay: 1500,
  osNotificationsEnabled: true,
  inAppNotificationsEnabled: true,
  notificationAnimationMode: 'default',
  emailCompositionFormat: 'html',
  emailFontFamily: 'Arial, sans-serif',
  emailFontSize: '14px',
  autoSignatureEnabled: false,
  emailSignature: '',
  replyQuotePosition: 'below',
  includeOriginalMessage: true
};

/**
 * Setting keys used in localStorage
 * @type {Readonly<{AUTO_POLLING_ENABLED: string, POLLING_INTERVAL_SECONDS: string, AUTO_MARK_READ_ENABLED: string, AUTO_MARK_READ_DELAY: string, OS_NOTIFICATIONS_ENABLED: string, IN_APP_NOTIFICATIONS_ENABLED: string, NOTIFICATION_ANIMATION_MODE: string, EMAIL_COMPOSITION_FORMAT: string, EMAIL_FONT_FAMILY: string, EMAIL_FONT_SIZE: string, AUTO_SIGNATURE_ENABLED: string, EMAIL_SIGNATURE: string, REPLY_QUOTE_POSITION: string, INCLUDE_ORIGINAL_MESSAGE: string}>}
 */
export const SETTING_KEYS = /** @type {const} */ ({
  AUTO_POLLING_ENABLED: 'autoPollingEnabled',
  POLLING_INTERVAL_SECONDS: 'pollingIntervalSeconds',
  AUTO_MARK_READ_ENABLED: 'autoMarkReadEnabled',
  AUTO_MARK_READ_DELAY: 'autoMarkReadDelay',
  OS_NOTIFICATIONS_ENABLED: 'osNotificationsEnabled',
  IN_APP_NOTIFICATIONS_ENABLED: 'inAppNotificationsEnabled',
  NOTIFICATION_ANIMATION_MODE: 'notificationAnimationMode',
  EMAIL_COMPOSITION_FORMAT: 'emailCompositionFormat',
  EMAIL_FONT_FAMILY: 'emailFontFamily',
  EMAIL_FONT_SIZE: 'emailFontSize',
  AUTO_SIGNATURE_ENABLED: 'autoSignatureEnabled',
  EMAIL_SIGNATURE: 'emailSignature',
  REPLY_QUOTE_POSITION: 'replyQuotePosition',
  INCLUDE_ORIGINAL_MESSAGE: 'includeOriginalMessage'
});

/**
 * Load all settings from localStorage with fallback to defaults
 * @returns {AppSettings} Settings object with all application settings
 */
export function loadSettings() {
  // Return defaults if not in browser environment
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    /** @type {AppSettings} */
    const settings = { ...DEFAULT_SETTINGS };
    
    // Load auto polling enabled
    const savedAutoPolling = localStorage.getItem(SETTING_KEYS.AUTO_POLLING_ENABLED);
    if (savedAutoPolling !== null) {
      settings.autoPollingEnabled = JSON.parse(savedAutoPolling);
    }
    
    // Load polling interval
    const savedInterval = localStorage.getItem(SETTING_KEYS.POLLING_INTERVAL_SECONDS);
    if (savedInterval !== null) {
      const parsed = parseInt(savedInterval, 10);
      if (!isNaN(parsed) && parsed > 0) {
        settings.pollingIntervalSeconds = parsed;
      }
    }
    
    // Load auto mark read enabled
    const savedAutoMarkRead = localStorage.getItem(SETTING_KEYS.AUTO_MARK_READ_ENABLED);
    if (savedAutoMarkRead !== null) {
      settings.autoMarkReadEnabled = JSON.parse(savedAutoMarkRead);
    }
    
    // Load auto mark read delay
    const savedAutoMarkReadDelay = localStorage.getItem(SETTING_KEYS.AUTO_MARK_READ_DELAY);
    if (savedAutoMarkReadDelay !== null) {
      const parsed = parseInt(savedAutoMarkReadDelay, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        settings.autoMarkReadDelay = parsed;
      }
    }
    
    // Load OS notifications enabled
    const savedOsNotifications = localStorage.getItem(SETTING_KEYS.OS_NOTIFICATIONS_ENABLED);
    if (savedOsNotifications !== null) {
      settings.osNotificationsEnabled = JSON.parse(savedOsNotifications);
    }
    
    // Load in-app notifications enabled
    const savedInAppNotifications = localStorage.getItem(SETTING_KEYS.IN_APP_NOTIFICATIONS_ENABLED);
    if (savedInAppNotifications !== null) {
      settings.inAppNotificationsEnabled = JSON.parse(savedInAppNotifications);
    }
    
    // Load notification animation mode
    const savedAnimationMode = localStorage.getItem(SETTING_KEYS.NOTIFICATION_ANIMATION_MODE);
    if (savedAnimationMode !== null && (savedAnimationMode === 'default' || savedAnimationMode === 'quick')) {
      settings.notificationAnimationMode = savedAnimationMode;
    }

    return settings;
  } catch (error) {
    console.warn('Error loading settings from localStorage:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save all settings to localStorage
 * @param {AppSettings} settings - Settings object to save
 */
export function saveSettings(settings) {
  if (typeof window === 'undefined' || !settings) {
    return;
  }

  try {
    localStorage.setItem(SETTING_KEYS.AUTO_POLLING_ENABLED, JSON.stringify(settings.autoPollingEnabled));
    localStorage.setItem(SETTING_KEYS.POLLING_INTERVAL_SECONDS, settings.pollingIntervalSeconds.toString());
    localStorage.setItem(SETTING_KEYS.AUTO_MARK_READ_ENABLED, JSON.stringify(settings.autoMarkReadEnabled));
    localStorage.setItem(SETTING_KEYS.AUTO_MARK_READ_DELAY, settings.autoMarkReadDelay.toString());
    localStorage.setItem(SETTING_KEYS.OS_NOTIFICATIONS_ENABLED, JSON.stringify(settings.osNotificationsEnabled));
    localStorage.setItem(SETTING_KEYS.IN_APP_NOTIFICATIONS_ENABLED, JSON.stringify(settings.inAppNotificationsEnabled));
    localStorage.setItem(SETTING_KEYS.NOTIFICATION_ANIMATION_MODE, settings.notificationAnimationMode);
  } catch (error) {
    console.warn('Error saving settings to localStorage:', error);
  }
}

/**
 * Save a single setting to localStorage
 * @param {keyof typeof SETTING_KEYS} key - Setting key from SETTING_KEYS
 * @param {string | number | boolean} value - Value to save
 */
export function saveSetting(key, value) {
  if (typeof window === 'undefined' || !key || value === undefined || value === null) {
    return;
  }

  try {
    const settingKey = SETTING_KEYS[key];
    if (!settingKey) {
      console.warn(`Invalid setting key: ${key}`);
      return;
    }

    if (typeof value === 'boolean') {
      localStorage.setItem(settingKey, JSON.stringify(value));
    } else {
      localStorage.setItem(settingKey, value.toString());
    }
  } catch (error) {
    console.warn(`Error saving setting ${key} to localStorage:`, error);
  }
}

/**
 * Load a single setting from localStorage
 * @template T
 * @param {keyof typeof SETTING_KEYS} key - Setting key from SETTING_KEYS
 * @param {T} defaultValue - Default value if not found
 * @returns {T} Setting value or default
 */
export function loadSetting(key, defaultValue) {
  if (typeof window === 'undefined' || !key) {
    return defaultValue;
  }

  try {
    const settingKey = SETTING_KEYS[key];
    if (!settingKey) {
      console.warn(`Invalid setting key: ${key}`);
      return defaultValue;
    }

    const value = localStorage.getItem(settingKey);
    if (value === null) {
      return defaultValue;
    }

    // Handle boolean values
    if (typeof defaultValue === 'boolean') {
      return /** @type {T} */ (JSON.parse(value));
    }
    
    // Handle number values
    if (typeof defaultValue === 'number') {
      const parsed = parseInt(value, 10);
      return /** @type {T} */ (isNaN(parsed) ? defaultValue : parsed);
    }
    
    // Handle string values
    return /** @type {T} */ (value);
  } catch (error) {
    console.warn(`Error loading setting ${key} from localStorage:`, error);
    return defaultValue;
  }
}

/**
 * Clear all application settings from localStorage
 */
export function clearSettings() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    Object.values(SETTING_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('Error clearing settings from localStorage:', error);
  }
}

/**
 * Validate settings object has all required properties
 * @param {any} settings - Settings to validate
 * @returns {settings is AppSettings} Whether settings are valid
 */
export function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  const requiredKeys = /** @type {(keyof AppSettings)[]} */ (Object.keys(DEFAULT_SETTINGS));
  return requiredKeys.every(key => key in settings && typeof settings[key] === typeof DEFAULT_SETTINGS[key]);
}

/**
 * Get settings with validation and error handling
 * @returns {AppSettings} Valid settings object
 */
export function getSettings() {
  const settings = loadSettings();
  
  if (!validateSettings(settings)) {
    console.warn('Invalid settings loaded, using defaults');
    return { ...DEFAULT_SETTINGS };
  }
  
  return settings;
}

/**
 * Settings manager class for more complex operations
 */
export class SettingsManager {
  /** @type {AppSettings} */
  #currentSettings;

  constructor() {
    this.#currentSettings = getSettings();
  }

  /**
   * Get current settings
   * @returns {AppSettings} Current settings
   */
  getSettings() {
    return { ...this.#currentSettings };
  }

  /**
   * Update settings and persist to localStorage
   * @param {Partial<AppSettings>} updates - Settings to update
   * @returns {AppSettings} Updated settings
   */
  updateSettings(updates) {
    this.#currentSettings = { ...this.#currentSettings, ...updates };
    saveSettings(this.#currentSettings);
    return this.getSettings();
  }

  /**
   * Reset settings to defaults
   * @returns {AppSettings} Reset settings
   */
  resetSettings() {
    this.#currentSettings = { ...DEFAULT_SETTINGS };
    saveSettings(this.#currentSettings);
    return this.getSettings();
  }

  /**
   * Get a specific setting value
   * @template {keyof AppSettings} K
   * @param {K} key - Setting key
   * @returns {AppSettings[K]} Setting value
   */
  getSetting(key) {
    return this.#currentSettings[key];
  }

  /**
   * Set a specific setting value
   * @template {keyof AppSettings} K
   * @param {K} key - Setting key
   * @param {AppSettings[K]} value - Setting value
   */
  setSetting(key, value) {
    this.#currentSettings[key] = value;
    saveSettings(this.#currentSettings);
  }
}
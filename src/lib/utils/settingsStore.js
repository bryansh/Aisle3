/**
 * Settings Store using Tauri Store plugin
 * Provides persistent storage that won't be cleared with browser cache
 * @fileoverview Tauri Store-based settings management with migration from localStorage
 */

import { Store } from '@tauri-apps/plugin-store';
import { DEFAULT_SETTINGS, SETTING_KEYS } from './settingsManager.js';

/**
 * @typedef {import('./settingsManager.js').AppSettings} AppSettings
 */

// Store instance - singleton
/** @type {import('@tauri-apps/plugin-store').Store | null} */
let storeInstance = null;
/** @type {Promise<import('@tauri-apps/plugin-store').Store> | null} */
let initPromise = null;

/**
 * Get or create the store instance
 * @returns {Promise<Store>} The store instance
 */
async function getStore() {
  if (!storeInstance) {
    if (!initPromise) {
      initPromise = Store.load('settings.json');
    }
    storeInstance = await initPromise;
  }
  return storeInstance;
}

/**
 * Migrate settings from localStorage to Tauri Store
 * @returns {Promise<boolean>} Whether migration was performed
 */
export async function migrateFromLocalStorage() {
  try {
    // Check if we've already migrated
    const store = await getStore();
    const migrated = await store.get('_migrated_from_localstorage');
    
    if (migrated) {
      return false; // Already migrated
    }

    // Check if localStorage is available and has settings
    if (typeof window === 'undefined' || !window.localStorage) {
      await store.set('_migrated_from_localstorage', true);
      return false;
    }

    console.log('🔄 Migrating settings from localStorage to Tauri Store...');

    // Load settings from localStorage
    const migratedSettings = { ...DEFAULT_SETTINGS };
    let hasSettings = false;

    // Migrate each setting
    Object.entries(SETTING_KEYS).forEach(([key, storageKey]) => {
      const value = localStorage.getItem(storageKey);
      if (value !== null) {
        hasSettings = true;
        try {
          if (key === 'POLLING_INTERVAL_SECONDS' || key === 'AUTO_MARK_READ_DELAY') {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed) && parsed > 0) {
              /** @type {any} */ (migratedSettings)[storageKey] = parsed;
            }
          } else if (key === 'NOTIFICATION_ANIMATION_MODE') {
            if (value === 'default' || value === 'quick') {
              /** @type {any} */ (migratedSettings)[storageKey] = value;
            }
          } else {
            // Boolean values
            /** @type {any} */ (migratedSettings)[storageKey] = JSON.parse(value);
          }
        } catch (e) {
          console.warn(`Failed to migrate setting ${storageKey}:`, e);
        }
      }
    });

    if (hasSettings) {
      // Save migrated settings to Tauri Store
      await store.set('settings', migratedSettings);
      await store.save();
      console.log('✅ Settings migrated successfully');

      // Clear localStorage (optional - we'll keep it as backup for now)
      // Object.values(SETTING_KEYS).forEach(key => localStorage.removeItem(key));
    }

    // Mark as migrated
    await store.set('_migrated_from_localstorage', true);
    await store.save();

    return hasSettings;
  } catch (error) {
    console.error('❌ Error migrating from localStorage:', error);
    return false;
  }
}

/**
 * Load all settings from Tauri Store
 * @returns {Promise<AppSettings>} Settings object with all application settings
 */
export async function loadSettingsFromStore() {
  try {
    const store = await getStore();
    
    // Try to get settings object
    const settings = await store.get('settings');
    
    if (settings && typeof settings === 'object') {
      // Merge with defaults to ensure all keys exist
      return { ...DEFAULT_SETTINGS, ...settings };
    }
    
    // No settings found, use defaults
    return { ...DEFAULT_SETTINGS };
  } catch (error) {
    console.warn('Error loading settings from Tauri Store:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save all settings to Tauri Store
 * @param {AppSettings} settings - Settings object to save
 * @returns {Promise<void>}
 */
export async function saveSettingsToStore(settings) {
  if (!settings) return;

  try {
    const store = await getStore();
    await store.set('settings', settings);
    await store.save();
  } catch (error) {
    console.warn('Error saving settings to Tauri Store:', error);
    throw error;
  }
}

/**
 * Save a single setting to Tauri Store
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 * @returns {Promise<void>}
 */
export async function saveSettingToStore(key, value) {
  if (!key || value === undefined || value === null) return;

  try {
    const store = await getStore();
    const settings = await loadSettingsFromStore();
    /** @type {any} */ (settings)[key] = value;
    await store.set('settings', settings);
    await store.save();
  } catch (error) {
    console.warn(`Error saving setting ${key} to Tauri Store:`, error);
    throw error;
  }
}

/**
 * Clear all settings from Tauri Store
 * @returns {Promise<void>}
 */
export async function clearSettingsFromStore() {
  try {
    const store = await getStore();
    await store.delete('settings');
    await store.save();
  } catch (error) {
    console.warn('Error clearing settings from Tauri Store:', error);
    throw error;
  }
}

/**
 * Settings manager class using Tauri Store
 */
export class TauriSettingsManager {
  /** @type {AppSettings} */
  #currentSettings;
  /** @type {boolean} */
  #initialized = false;

  constructor() {
    this.#currentSettings = { ...DEFAULT_SETTINGS };
  }

  /**
   * Initialize the settings manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.#initialized) return;

    try {
      // Migrate from localStorage if needed
      await migrateFromLocalStorage();
      
      // Load settings from store
      this.#currentSettings = await loadSettingsFromStore();
      this.#initialized = true;
    } catch (error) {
      console.error('Failed to initialize TauriSettingsManager:', error);
      // Use defaults on error
      this.#currentSettings = { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Get current settings
   * @returns {AppSettings} Current settings
   */
  getSettings() {
    return { ...this.#currentSettings };
  }

  /**
   * Update settings and persist to Tauri Store
   * @param {Partial<AppSettings>} updates - Settings to update
   * @returns {Promise<AppSettings>} Updated settings
   */
  async updateSettings(updates) {
    this.#currentSettings = { ...this.#currentSettings, ...updates };
    await saveSettingsToStore(this.#currentSettings);
    return this.getSettings();
  }

  /**
   * Reset settings to defaults
   * @returns {Promise<AppSettings>} Reset settings
   */
  async resetSettings() {
    this.#currentSettings = { ...DEFAULT_SETTINGS };
    await saveSettingsToStore(this.#currentSettings);
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
   * @returns {Promise<void>}
   */
  async setSetting(key, value) {
    this.#currentSettings[key] = value;
    await saveSettingsToStore(this.#currentSettings);
  }
}

// Export a factory function to create and initialize the manager
export async function createTauriSettingsManager() {
  const manager = new TauriSettingsManager();
  await manager.initialize();
  return manager;
}
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTING_KEYS,
  loadSettings,
  saveSettings,
  saveSetting,
  loadSetting,
  clearSettings,
  validateSettings,
  getSettings,
  SettingsManager
} from '../../lib/utils/settingsManager.js';

// Mock localStorage
const localStorageMock = {
  store: new Map(),
  getItem: vi.fn(key => {
    const value = localStorageMock.store.get(key);
    return value !== undefined ? value : null;
  }),
  setItem: vi.fn((key, value) => {
    localStorageMock.store.set(key, String(value));
  }),
  removeItem: vi.fn(key => localStorageMock.store.delete(key)),
  clear: vi.fn(() => localStorageMock.store.clear())
};

// Setup proper environment
vi.stubGlobal('localStorage', localStorageMock);
Object.defineProperty(global, 'window', {
  value: { localStorage: localStorageMock },
  writable: true,
  configurable: true
});

describe('settingsManager', () => {
  beforeEach(() => {
    // Clear localStorage mock before each test
    localStorageMock.store.clear();
    vi.clearAllMocks();
    
    // Reset mock implementations to defaults
    localStorageMock.getItem.mockImplementation(key => {
      const value = localStorageMock.store.get(key);
      return value !== undefined ? value : null;
    });
    localStorageMock.setItem.mockImplementation((key, value) => {
      localStorageMock.store.set(key, String(value));
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('DEFAULT_SETTINGS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_SETTINGS).toEqual({
        autoPollingEnabled: false,
        pollingIntervalSeconds: 30,
        autoMarkReadEnabled: true,
        autoMarkReadDelay: 1500
      });
    });
  });

  describe('SETTING_KEYS', () => {
    it('should have correct setting keys', () => {
      expect(SETTING_KEYS).toEqual({
        AUTO_POLLING_ENABLED: 'autoPollingEnabled',
        POLLING_INTERVAL_SECONDS: 'pollingIntervalSeconds',
        AUTO_MARK_READ_ENABLED: 'autoMarkReadEnabled',
        AUTO_MARK_READ_DELAY: 'autoMarkReadDelay'
      });
    });
  });

  describe('loadSettings', () => {
    it('should return default settings when localStorage is empty', () => {
      const settings = loadSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should load settings from localStorage', () => {
      localStorageMock.setItem('autoPollingEnabled', 'true');
      localStorageMock.setItem('pollingIntervalSeconds', '60');
      localStorageMock.setItem('autoMarkReadEnabled', 'false');
      localStorageMock.setItem('autoMarkReadDelay', '3000');

      const settings = loadSettings();
      
      expect(settings).toEqual({
        autoPollingEnabled: true,
        pollingIntervalSeconds: 60,
        autoMarkReadEnabled: false,
        autoMarkReadDelay: 3000
      });
    });

    it('should use defaults for invalid values', () => {
      localStorageMock.store.set('pollingIntervalSeconds', 'invalid');
      localStorageMock.store.set('autoMarkReadDelay', '-1');

      const settings = loadSettings();
      
      expect(settings.pollingIntervalSeconds).toBe(DEFAULT_SETTINGS.pollingIntervalSeconds);
      expect(settings.autoMarkReadDelay).toBe(DEFAULT_SETTINGS.autoMarkReadDelay);
    });

    it('should return defaults when not in browser environment', () => {
      const originalWindow = global.window;
      Object.defineProperty(global, 'window', { value: undefined, configurable: true });

      const settings = loadSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);

      Object.defineProperty(global, 'window', { value: originalWindow, configurable: true });
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const settings = loadSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('saveSettings', () => {
    it('should save all settings to localStorage', () => {
      const settings = {
        autoPollingEnabled: true,
        pollingIntervalSeconds: 45,
        autoMarkReadEnabled: false,
        autoMarkReadDelay: 2000
      };

      saveSettings(settings);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('autoPollingEnabled', 'true');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('pollingIntervalSeconds', '45');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('autoMarkReadEnabled', 'false');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('autoMarkReadDelay', '2000');
    });

    it('should not save when not in browser environment', () => {
      const originalWindow = global.window;
      Object.defineProperty(global, 'window', { value: undefined, configurable: true });

      saveSettings(DEFAULT_SETTINGS);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      Object.defineProperty(global, 'window', { value: originalWindow, configurable: true });
    });

    it('should not save when settings is null/undefined', () => {
      saveSettings(null);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow();
    });
  });

  describe('saveSetting', () => {
    it('should save boolean setting', () => {
      saveSetting('AUTO_POLLING_ENABLED', true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('autoPollingEnabled', 'true');
    });

    it('should save number setting', () => {
      saveSetting('POLLING_INTERVAL_SECONDS', 60);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('pollingIntervalSeconds', '60');
    });

    it('should handle invalid key', () => {
      saveSetting('INVALID_KEY', true);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should handle null/undefined values', () => {
      saveSetting('AUTO_POLLING_ENABLED', null);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('loadSetting', () => {
    it('should load boolean setting', () => {
      localStorageMock.setItem('autoPollingEnabled', 'true');
      const value = loadSetting('AUTO_POLLING_ENABLED', false);
      expect(value).toBe(true);
    });

    it('should load number setting', () => {
      localStorageMock.setItem('pollingIntervalSeconds', '60');
      const value = loadSetting('POLLING_INTERVAL_SECONDS', 30);
      expect(value).toBe(60);
    });

    it('should return default for missing setting', () => {
      const value = loadSetting('AUTO_POLLING_ENABLED', false);
      expect(value).toBe(false);
    });

    it('should return default for invalid number', () => {
      localStorageMock.store.set('pollingIntervalSeconds', 'invalid');
      const value = loadSetting('POLLING_INTERVAL_SECONDS', 30);
      expect(value).toBe(30);
    });

    it('should handle invalid key', () => {
      const value = loadSetting('INVALID_KEY', 'default');
      expect(value).toBe('default');
    });
  });

  describe('clearSettings', () => {
    it('should remove all settings from localStorage', () => {
      clearSettings();
      
      Object.values(SETTING_KEYS).forEach(key => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith(key);
      });
    });

    it('should not clear when not in browser environment', () => {
      const originalWindow = global.window;
      Object.defineProperty(global, 'window', { value: undefined, configurable: true });

      clearSettings();
      expect(localStorageMock.removeItem).not.toHaveBeenCalled();

      Object.defineProperty(global, 'window', { value: originalWindow, configurable: true });
    });
  });

  describe('validateSettings', () => {
    it('should validate correct settings object', () => {
      expect(validateSettings(DEFAULT_SETTINGS)).toBe(true);
    });

    it('should reject null/undefined', () => {
      expect(validateSettings(null)).toBe(false);
      expect(validateSettings(undefined)).toBe(false);
    });

    it('should reject non-object', () => {
      expect(validateSettings('string')).toBe(false);
      expect(validateSettings(123)).toBe(false);
    });

    it('should reject object with missing properties', () => {
      const incomplete = { autoPollingEnabled: true };
      expect(validateSettings(incomplete)).toBe(false);
    });

    it('should reject object with wrong types', () => {
      const wrongTypes = {
        autoPollingEnabled: 'true', // should be boolean
        pollingIntervalSeconds: 30,
        autoMarkReadEnabled: true,
        autoMarkReadDelay: 1500
      };
      expect(validateSettings(wrongTypes)).toBe(false);
    });
  });

  describe('getSettings', () => {
    it('should return valid settings', () => {
      const settings = getSettings();
      expect(validateSettings(settings)).toBe(true);
    });

    it('should return defaults for invalid stored settings', () => {
      // Mock loadSettings to return invalid settings
      localStorageMock.store.set('autoPollingEnabled', 'invalid');
      
      const settings = getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('SettingsManager', () => {
    let manager;

    beforeEach(() => {
      manager = new SettingsManager();
    });

    it('should initialize with current settings', () => {
      const settings = manager.getSettings();
      expect(validateSettings(settings)).toBe(true);
    });

    it('should update settings', () => {
      const updates = { autoPollingEnabled: true, pollingIntervalSeconds: 60 };
      const updated = manager.updateSettings(updates);
      
      expect(updated.autoPollingEnabled).toBe(true);
      expect(updated.pollingIntervalSeconds).toBe(60);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should reset settings to defaults', () => {
      manager.updateSettings({ autoPollingEnabled: true });
      const reset = manager.resetSettings();
      
      expect(reset).toEqual(DEFAULT_SETTINGS);
    });

    it('should get specific setting', () => {
      const value = manager.getSetting('autoPollingEnabled');
      expect(typeof value).toBe('boolean');
    });

    it('should set specific setting', () => {
      manager.setSetting('autoPollingEnabled', true);
      const value = manager.getSetting('autoPollingEnabled');
      
      expect(value).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should handle partial updates', () => {
      const original = manager.getSettings();
      manager.updateSettings({ autoPollingEnabled: true });
      const updated = manager.getSettings();
      
      expect(updated.autoPollingEnabled).toBe(true);
      expect(updated.pollingIntervalSeconds).toBe(original.pollingIntervalSeconds);
    });

    it('should preserve object integrity', () => {
      const settings1 = manager.getSettings();
      const settings2 = manager.getSettings();
      
      settings1.autoPollingEnabled = true;
      expect(settings2.autoPollingEnabled).toBe(DEFAULT_SETTINGS.autoPollingEnabled);
    });
  });

  describe('edge cases', () => {
    it('should handle JSON.parse errors', () => {
      localStorageMock.store.set('autoPollingEnabled', '{invalid json');
      
      expect(() => loadSettings()).not.toThrow();
      const settings = loadSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should handle very large numbers', () => {
      localStorageMock.setItem('pollingIntervalSeconds', String(Number.MAX_SAFE_INTEGER));
      
      const settings = loadSettings();
      expect(settings.pollingIntervalSeconds).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle zero values correctly', () => {
      localStorageMock.setItem('autoMarkReadDelay', '0');
      
      const settings = loadSettings();
      expect(settings.autoMarkReadDelay).toBe(0);
    });

    it('should handle negative numbers by using defaults', () => {
      localStorageMock.store.set('pollingIntervalSeconds', '-10');
      
      const settings = loadSettings();
      expect(settings.pollingIntervalSeconds).toBe(DEFAULT_SETTINGS.pollingIntervalSeconds);
    });
  });
});
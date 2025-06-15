import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DEFAULT_SETTINGS, SETTING_KEYS } from '../../lib/utils/settingsManager.js';

// Mock @tauri-apps/plugin-store
const mockStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  save: vi.fn(),
  load: vi.fn()
};

vi.mock('@tauri-apps/plugin-store', () => ({
  Store: {
    load: vi.fn().mockResolvedValue(mockStore)
  }
}));

// Import after mocking
const { 
  migrateFromLocalStorage,
  loadSettingsFromStore,
  saveSettingsToStore,
  clearSettingsFromStore,
  TauriSettingsManager
} = await import('../../lib/utils/settingsStore.js');

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

describe('settingsStore', () => {
  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks();
    localStorageMock.store.clear();
    
    // Reset store behavior
    mockStore.get.mockResolvedValue(null);
    mockStore.set.mockResolvedValue(undefined);
    mockStore.save.mockResolvedValue(undefined);
    mockStore.load.mockResolvedValue(undefined);
    mockStore.delete.mockResolvedValue(undefined);
  });

  describe('migrateFromLocalStorage', () => {
    it('should migrate settings from localStorage to Tauri Store', async () => {
      // Set up localStorage with settings
      localStorageMock.setItem(SETTING_KEYS.AUTO_POLLING_ENABLED, 'true');
      localStorageMock.setItem(SETTING_KEYS.POLLING_INTERVAL_SECONDS, '60');
      localStorageMock.setItem(SETTING_KEYS.NOTIFICATION_ANIMATION_MODE, 'quick');

      const migrated = await migrateFromLocalStorage();

      expect(migrated).toBe(true);
      expect(mockStore.set).toHaveBeenCalledWith('settings', expect.objectContaining({
        autoPollingEnabled: true,
        pollingIntervalSeconds: 60,
        notificationAnimationMode: 'quick'
      }));
      expect(mockStore.set).toHaveBeenCalledWith('_migrated_from_localstorage', true);
      expect(mockStore.save).toHaveBeenCalled();
    });

    it('should not migrate if already migrated', async () => {
      mockStore.get.mockImplementation(key => {
        if (key === '_migrated_from_localstorage') return true;
        return null;
      });

      const migrated = await migrateFromLocalStorage();

      expect(migrated).toBe(false);
      expect(mockStore.set).not.toHaveBeenCalledWith('settings', expect.anything());
    });

    it('should handle invalid localStorage values gracefully', async () => {
      localStorageMock.setItem(SETTING_KEYS.POLLING_INTERVAL_SECONDS, 'invalid');
      localStorageMock.setItem(SETTING_KEYS.AUTO_POLLING_ENABLED, 'not-a-boolean');

      const migrated = await migrateFromLocalStorage();

      expect(migrated).toBe(true);
      expect(mockStore.set).toHaveBeenCalledWith('settings', expect.objectContaining({
        pollingIntervalSeconds: 30, // Should use default
      }));
    });
  });

  describe('loadSettingsFromStore', () => {
    it('should load settings from Tauri Store', async () => {
      const savedSettings = {
        autoPollingEnabled: true,
        pollingIntervalSeconds: 45,
        notificationAnimationMode: 'quick'
      };
      mockStore.get.mockResolvedValue(savedSettings);

      const settings = await loadSettingsFromStore();

      expect(settings).toEqual({
        ...DEFAULT_SETTINGS,
        ...savedSettings
      });
    });

    it('should return defaults if no settings found', async () => {
      mockStore.get.mockResolvedValue(null);

      const settings = await loadSettingsFromStore();

      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should handle store errors gracefully', async () => {
      mockStore.get.mockRejectedValue(new Error('Store error'));

      const settings = await loadSettingsFromStore();

      expect(settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('saveSettingsToStore', () => {
    it('should save settings to Tauri Store', async () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        autoPollingEnabled: true,
        pollingIntervalSeconds: 45
      };

      await saveSettingsToStore(settings);

      expect(mockStore.set).toHaveBeenCalledWith('settings', settings);
      expect(mockStore.save).toHaveBeenCalled();
    });

    it('should handle null settings', async () => {
      await saveSettingsToStore(null);

      expect(mockStore.set).not.toHaveBeenCalled();
    });
  });

  describe('clearSettingsFromStore', () => {
    it('should clear settings from store', async () => {
      await clearSettingsFromStore();

      expect(mockStore.delete).toHaveBeenCalledWith('settings');
      expect(mockStore.save).toHaveBeenCalled();
    });
  });

  describe('TauriSettingsManager', () => {
    let manager;

    beforeEach(async () => {
      manager = new TauriSettingsManager();
    });

    it('should initialize with migration', async () => {
      localStorageMock.setItem(SETTING_KEYS.AUTO_POLLING_ENABLED, 'true');
      
      await manager.initialize();

      expect(mockStore.set).toHaveBeenCalledWith('_migrated_from_localstorage', true);
    });

    it('should get current settings', () => {
      const settings = manager.getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should update settings', async () => {
      await manager.initialize();
      
      const updates = { autoPollingEnabled: true };
      const updated = await manager.updateSettings(updates);

      expect(updated).toEqual({
        ...DEFAULT_SETTINGS,
        ...updates
      });
      expect(mockStore.set).toHaveBeenCalledWith('settings', expect.objectContaining(updates));
    });

    it('should reset settings to defaults', async () => {
      await manager.initialize();
      await manager.updateSettings({ autoPollingEnabled: true });
      
      const reset = await manager.resetSettings();

      expect(reset).toEqual(DEFAULT_SETTINGS);
      expect(mockStore.set).toHaveBeenCalledWith('settings', DEFAULT_SETTINGS);
    });

    it('should get specific setting', async () => {
      await manager.initialize();
      
      const value = manager.getSetting('autoPollingEnabled');
      expect(value).toBe(DEFAULT_SETTINGS.autoPollingEnabled);
    });

    it('should set specific setting', async () => {
      await manager.initialize();
      
      await manager.setSetting('autoPollingEnabled', true);
      
      expect(manager.getSetting('autoPollingEnabled')).toBe(true);
      expect(mockStore.set).toHaveBeenCalledWith('settings', expect.objectContaining({
        autoPollingEnabled: true
      }));
    });
  });
});
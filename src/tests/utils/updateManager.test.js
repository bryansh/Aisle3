import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UpdateManager, createUpdateManager } from '../../lib/utils/updateManager.js';

// Mock dependencies
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

vi.mock('../../lib/utils/notificationService.js', () => ({
  createNotificationService: vi.fn()
}));

import { invoke } from '@tauri-apps/api/core';
import { createNotificationService } from '../../lib/utils/notificationService.js';

describe('UpdateManager', () => {
  let updateManager;
  let mockNotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Set up mock notification service
    mockNotificationService = {
      isAvailable: vi.fn().mockReturnValue(true),
      notifyUpdate: vi.fn().mockResolvedValue({ success: true })
    };
    createNotificationService.mockResolvedValue(mockNotificationService);

    updateManager = new UpdateManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (updateManager) {
      updateManager.cleanup();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default settings', async () => {
      await updateManager.initialize();

      expect(updateManager.settings).toMatchObject({
        autoCheckEnabled: true,
        checkIntervalHours: 1,
        notifyOnStartup: true,
        notifyOnUpdate: true,
        silentCheck: false,
        osNotificationsEnabled: true
      });
    });

    it('should accept custom settings during initialization', async () => {
      const customSettings = {
        autoCheckEnabled: false,
        checkIntervalHours: 2,
        notifyOnStartup: false,
        osNotificationsEnabled: false
      };

      await updateManager.initialize(customSettings);

      expect(updateManager.settings).toMatchObject(customSettings);
    });

    it('should initialize notification service when OS notifications enabled', async () => {
      await updateManager.initialize({ osNotificationsEnabled: true });

      expect(createNotificationService).toHaveBeenCalledOnce();
      expect(updateManager.notificationService).toBe(mockNotificationService);
    });

    it('should skip notification service when OS notifications disabled', async () => {
      await updateManager.initialize({ osNotificationsEnabled: false });

      expect(createNotificationService).not.toHaveBeenCalled();
      expect(updateManager.notificationService).toBeNull();
    });

    it('should handle notification service initialization errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      createNotificationService.mockRejectedValue(new Error('Init failed'));

      await updateManager.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️ UpdateManager: Failed to initialize notifications:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should schedule startup check when enabled', async () => {
      const checkSpy = vi.spyOn(updateManager, 'checkForUpdates').mockResolvedValue({});

      await updateManager.initialize({ 
        autoCheckEnabled: true,
        notifyOnStartup: true 
      });

      // Fast-forward past the startup delay
      vi.advanceTimersByTime(6000);

      expect(checkSpy).toHaveBeenCalledWith(true); // Silent check
    });

    it('should start periodic checking when auto-check enabled', async () => {
      const startPeriodicSpy = vi.spyOn(updateManager, 'startPeriodicChecking');

      await updateManager.initialize({ autoCheckEnabled: true });

      expect(startPeriodicSpy).toHaveBeenCalledOnce();
    });

    it('should not start periodic checking when auto-check disabled', async () => {
      const startPeriodicSpy = vi.spyOn(updateManager, 'startPeriodicChecking');

      await updateManager.initialize({ autoCheckEnabled: false });

      expect(startPeriodicSpy).not.toHaveBeenCalled();
    });
  });

  describe('Periodic Checking', () => {
    beforeEach(async () => {
      await updateManager.initialize();
    });

    it('should start periodic checking with correct interval', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      updateManager.startPeriodicChecking();

      expect(updateManager.checkInterval).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        '📅 Update checking started - will check every 1 hour(s)'
      );

      consoleSpy.mockRestore();
    });

    it('should clear existing interval before starting new one', () => {
      const clearSpy = vi.spyOn(global, 'clearInterval');
      
      updateManager.startPeriodicChecking();
      const firstInterval = updateManager.checkInterval;
      
      updateManager.startPeriodicChecking();
      
      expect(clearSpy).toHaveBeenCalledWith(firstInterval);
      expect(updateManager.checkInterval).not.toBe(firstInterval);
    });

    it('should execute periodic checks at correct intervals', () => {
      const checkSpy = vi.spyOn(updateManager, 'checkForUpdates').mockResolvedValue({});
      
      updateManager.settings.checkIntervalHours = 1 / 3600; // 1 second for testing
      updateManager.startPeriodicChecking();

      // Fast-forward through several intervals
      vi.advanceTimersByTime(3000); // 3 seconds = 3 intervals
      
      expect(checkSpy).toHaveBeenCalledTimes(3);
      expect(checkSpy).toHaveBeenCalledWith(true); // Silent checks
    });

    it('should stop periodic checking', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const clearSpy = vi.spyOn(global, 'clearInterval');
      
      updateManager.startPeriodicChecking();
      const interval = updateManager.checkInterval;
      
      updateManager.stopPeriodicChecking();
      
      expect(clearSpy).toHaveBeenCalledWith(interval);
      expect(updateManager.checkInterval).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('🛑 Update checking stopped');

      consoleSpy.mockRestore();
    });
  });

  describe('Update Checking', () => {
    beforeEach(async () => {
      await updateManager.initialize();
    });

    it('should check for updates successfully', async () => {
      const mockResult = 'No updates available';
      invoke.mockResolvedValue(mockResult);

      const result = await updateManager.checkForUpdates();

      expect(invoke).toHaveBeenCalledWith('check_for_updates');
      expect(result).toMatchObject({
        success: true,
        updateAvailable: false,
        message: mockResult,
        lastCheckTime: expect.any(Date)
      });
    });

    it('should detect when update is available', async () => {
      const mockResult = 'Update available: v1.2.3 is ready to install';
      invoke.mockResolvedValue(mockResult);

      const result = await updateManager.checkForUpdates();

      expect(result.updateAvailable).toBe(true);
      expect(updateManager.updateAvailable).toBe(true);
      expect(updateManager.updateInfo).toBe(mockResult);
    });

    it('should prevent concurrent update checks', async () => {
      let resolveFirst;
      invoke.mockImplementation(() => new Promise(resolve => {
        resolveFirst = resolve;
      }));

      const result1Promise = updateManager.checkForUpdates();
      const result2 = await updateManager.checkForUpdates();

      expect(result2).toMatchObject({
        success: false,
        message: 'Update check already in progress'
      });

      // Complete the first check
      resolveFirst('No updates');
      await result1Promise;
    });

    it('should handle update check errors', async () => {
      const error = new Error('Network error');
      invoke.mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await updateManager.checkForUpdates();

      expect(result).toMatchObject({
        success: false,
        message: 'Update check failed: Error: Network error',
        error
      });

      consoleSpy.mockRestore();
    });

    it('should update last check time', async () => {
      const beforeTime = Date.now();
      invoke.mockResolvedValue('No updates');

      await updateManager.checkForUpdates();

      expect(updateManager.lastCheckTime).toBeInstanceOf(Date);
      expect(updateManager.lastCheckTime.getTime()).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should send OS notification when update is available', async () => {
      const mockResult = 'Update available: v1.2.3';
      invoke.mockResolvedValue(mockResult);

      await updateManager.checkForUpdates();

      expect(mockNotificationService.notifyUpdate).toHaveBeenCalledWith(mockResult);
    });

    it('should not send OS notification when service unavailable', async () => {
      mockNotificationService.isAvailable.mockReturnValue(false);
      invoke.mockResolvedValue('Update available: v1.2.3');

      await updateManager.checkForUpdates();

      expect(mockNotificationService.notifyUpdate).not.toHaveBeenCalled();
    });

    it('should not send OS notification when notifications disabled', async () => {
      updateManager.settings.notifyOnUpdate = false;
      invoke.mockResolvedValue('Update available: v1.2.3');

      await updateManager.checkForUpdates();

      expect(mockNotificationService.notifyUpdate).not.toHaveBeenCalled();
    });

    it('should handle silent checks correctly', async () => {
      invoke.mockResolvedValue('No updates available');
      const listener = vi.fn();
      updateManager.addListener(listener);

      await updateManager.checkForUpdates(true);

      // Should receive update-check-complete but not no-update notification
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'update-check-complete',
          silent: true
        })
      );
      expect(listener).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'no-update'
        })
      );
    });
  });

  describe('Update Installation', () => {
    beforeEach(async () => {
      await updateManager.initialize();
    });

    it('should install update successfully', async () => {
      const mockResult = 'Update installed successfully';
      invoke.mockResolvedValue(mockResult);

      const result = await updateManager.installUpdate();

      expect(invoke).toHaveBeenCalledWith('install_update');
      expect(result).toMatchObject({
        success: true,
        message: mockResult
      });
    });

    it('should handle installation errors', async () => {
      const error = new Error('Installation failed');
      invoke.mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await updateManager.installUpdate();

      expect(result).toMatchObject({
        success: false,
        message: 'Update install failed: Error: Installation failed',
        error
      });

      consoleSpy.mockRestore();
    });

    it('should notify listeners about installation start', async () => {
      const listener = vi.fn();
      updateManager.addListener(listener);
      invoke.mockResolvedValue('Success');

      await updateManager.installUpdate();

      expect(listener).toHaveBeenCalledWith({
        type: 'update-install-start',
        message: 'Installing update...'
      });
    });

    it('should notify listeners about installation completion', async () => {
      const listener = vi.fn();
      updateManager.addListener(listener);
      const mockResult = 'Update installed';
      invoke.mockResolvedValue(mockResult);

      await updateManager.installUpdate();

      expect(listener).toHaveBeenCalledWith({
        type: 'update-install-complete',
        message: mockResult
      });
    });

    it('should notify listeners about installation errors', async () => {
      const listener = vi.fn();
      updateManager.addListener(listener);
      const error = new Error('Install failed');
      invoke.mockRejectedValue(error);

      await updateManager.installUpdate();

      expect(listener).toHaveBeenCalledWith({
        type: 'update-install-error',
        message: 'Update install failed: Error: Install failed',
        error
      });
    });
  });

  describe('Event Listeners', () => {
    beforeEach(async () => {
      await updateManager.initialize();
    });

    it('should add and notify listeners', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      updateManager.addListener(listener1);
      updateManager.addListener(listener2);

      invoke.mockResolvedValue('No updates');
      await updateManager.checkForUpdates();

      expect(listener1).toHaveBeenCalledTimes(2); // update-check-complete and no-update
      expect(listener2).toHaveBeenCalledTimes(2);
    });

    it('should remove listeners correctly', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      updateManager.addListener(listener1);
      updateManager.addListener(listener2);
      updateManager.removeListener(listener1);

      updateManager.notifyListeners({ type: 'test' });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith({ type: 'test' });
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      updateManager.addListener(errorListener);
      updateManager.addListener(normalListener);

      updateManager.notifyListeners({ type: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in update listener:',
        expect.any(Error)
      );
      expect(normalListener).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should notify all event types correctly', async () => {
      const listener = vi.fn();
      updateManager.addListener(listener);

      // Test update available
      invoke.mockResolvedValue('Update available: v1.2.3');
      await updateManager.checkForUpdates();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'update-check-complete' })
      );
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'update-available' })
      );

      listener.mockClear();

      // Test no update
      invoke.mockResolvedValue('No updates');
      await updateManager.checkForUpdates();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'no-update' })
      );
    });
  });

  describe('Settings Management', () => {
    beforeEach(async () => {
      await updateManager.initialize();
    });

    it('should update settings', () => {
      const newSettings = {
        checkIntervalHours: 2,
        notifyOnUpdate: false,
        osNotificationsEnabled: false
      };

      updateManager.updateSettings(newSettings);

      expect(updateManager.settings).toMatchObject(newSettings);
    });

    it('should restart periodic checking when interval changes', () => {
      const startSpy = vi.spyOn(updateManager, 'startPeriodicChecking');
      
      updateManager.updateSettings({ checkIntervalHours: 2 });

      expect(startSpy).toHaveBeenCalledOnce();
    });

    it('should start checking when auto-check is enabled', () => {
      updateManager.settings.autoCheckEnabled = false;
      const startSpy = vi.spyOn(updateManager, 'startPeriodicChecking');
      
      updateManager.updateSettings({ autoCheckEnabled: true });

      expect(startSpy).toHaveBeenCalledOnce();
    });

    it('should stop checking when auto-check is disabled', () => {
      const stopSpy = vi.spyOn(updateManager, 'stopPeriodicChecking');
      
      updateManager.updateSettings({ autoCheckEnabled: false });

      expect(stopSpy).toHaveBeenCalledOnce();
    });
  });

  describe('Status and State', () => {
    beforeEach(async () => {
      await updateManager.initialize();
    });

    it('should provide current status', () => {
      updateManager.lastCheckTime = new Date();
      updateManager.updateAvailable = true;
      updateManager.updateInfo = 'Update available';

      const status = updateManager.getStatus();

      expect(status).toMatchObject({
        isChecking: false,
        lastCheckTime: expect.any(Date),
        updateAvailable: true,
        updateInfo: 'Update available',
        settings: expect.objectContaining({
          autoCheckEnabled: true
        }),
        isPeriodicCheckingActive: true
      });
    });

    it('should track checking state correctly', async () => {
      let resolvePending;
      invoke.mockImplementation(() => new Promise(resolve => {
        resolvePending = resolve;
      }));

      const checkPromise = updateManager.checkForUpdates();
      
      expect(updateManager.getStatus().isChecking).toBe(true);

      resolvePending('No updates');
      await checkPromise;

      expect(updateManager.getStatus().isChecking).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup properly', () => {
      const stopSpy = vi.spyOn(updateManager, 'stopPeriodicChecking');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      updateManager.addListener(() => {});
      updateManager.cleanup();

      expect(stopSpy).toHaveBeenCalledOnce();
      expect(updateManager.listeners).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith('🧹 UpdateManager cleaned up');

      consoleSpy.mockRestore();
    });
  });
});

describe('createUpdateManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock notification service
    const mockNotificationService = {
      isAvailable: vi.fn().mockReturnValue(true),
      notifyUpdate: vi.fn().mockResolvedValue({ success: true })
    };
    createNotificationService.mockResolvedValue(mockNotificationService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create and initialize update manager', () => {
    const customSettings = {
      autoCheckEnabled: false,
      checkIntervalHours: 3
    };

    const manager = createUpdateManager(customSettings);

    expect(manager).toBeInstanceOf(UpdateManager);
    expect(manager.settings).toMatchObject(customSettings);
  });

  it('should initialize with default settings when none provided', () => {
    const manager = createUpdateManager();

    expect(manager).toBeInstanceOf(UpdateManager);
    expect(manager.settings.autoCheckEnabled).toBe(true);
    expect(manager.settings.checkIntervalHours).toBe(1);
  });
});
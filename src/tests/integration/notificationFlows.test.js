import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmailNotificationManager } from '../../lib/utils/emailNotificationManager.js';
import { UpdateManager } from '../../lib/utils/updateManager.js';
import { NotificationService } from '../../lib/utils/notificationService.js';

// Mock Tauri
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

// Mock notification plugin
vi.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  sendNotification: vi.fn()
}));

// Mock dependencies
vi.mock('../../lib/utils/notificationService.js', () => ({
  createNotificationService: vi.fn(),
  NotificationService: vi.fn()
}));

vi.mock('../../lib/utils/pollingManager.js', () => ({
  createEmailPollingManager: vi.fn()
}));

import { invoke } from '@tauri-apps/api/core';
import { 
  isPermissionGranted, 
  requestPermission, 
  sendNotification 
} from '@tauri-apps/plugin-notification';
import { createNotificationService } from '../../lib/utils/notificationService.js';
import { createEmailPollingManager } from '../../lib/utils/pollingManager.js';

describe('Notification Flows Integration', () => {
  let mockNotificationService;
  let mockPollingManager;
  let mockEmailOperations;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Set up mock notification service
    mockNotificationService = {
      isAvailable: vi.fn().mockReturnValue(true),
      notifyNewEmails: vi.fn().mockResolvedValue({ success: true }),
      notifyUpdate: vi.fn().mockResolvedValue({ success: true }),
      initialize: vi.fn().mockResolvedValue({ success: true, permissionGranted: true })
    };
    createNotificationService.mockResolvedValue(mockNotificationService);

    // Set up mock polling manager
    mockPollingManager = {
      addResultListener: vi.fn(),
      start: vi.fn().mockReturnValue(true),
      stop: vi.fn().mockReturnValue(true),
      setInterval: vi.fn(),
      setEnabled: vi.fn(),
      isRunning: vi.fn().mockReturnValue(false),
      getStats: vi.fn().mockReturnValue({ runCount: 0 }),
      cleanup: vi.fn()
    };
    createEmailPollingManager.mockReturnValue(mockPollingManager);

    // Set up mock email operations
    mockEmailOperations = {
      getEmails: vi.fn().mockReturnValue([]),
      checkForNewEmails: vi.fn().mockResolvedValue([])
    };

    // Set up Tauri mocks
    invoke.mockResolvedValue('No updates available');
    isPermissionGranted.mockResolvedValue(true);
    requestPermission.mockResolvedValue('granted');
    sendNotification.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Email Notification Manager Integration', () => {
    it('should integrate with notification service and polling manager', async () => {
      const manager = new EmailNotificationManager();
      
      const result = await manager.initialize(mockEmailOperations);
      
      expect(result.success).toBe(true);
      expect(createNotificationService).toHaveBeenCalled();
      expect(createEmailPollingManager).toHaveBeenCalledWith(
        mockEmailOperations,
        expect.objectContaining({
          intervalSeconds: 30,
          enabled: true
        })
      );
      expect(mockPollingManager.addResultListener).toHaveBeenCalled();
    });

    it('should handle new emails through polling integration', async () => {
      const manager = new EmailNotificationManager();
      await manager.initialize(mockEmailOperations);
      
      // Get the polling result handler
      const resultHandler = mockPollingManager.addResultListener.mock.calls[0][0];
      
      // Mock emails for notification
      const newEmails = [
        { id: 'email1', sender: 'test@example.com', subject: 'Test Email' }
      ];
      mockEmailOperations.getEmails.mockReturnValue(newEmails);
      
      // Simulate polling result with new emails
      await resultHandler({ success: true, data: ['email1'] });
      
      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledWith(1, []);
    });

    it('should respect cooldown periods between notifications', async () => {
      const manager = new EmailNotificationManager();
      await manager.initialize(mockEmailOperations, {
        notificationCooldownMinutes: 5
      });
      
      // First notification - should work
      const newEmails1 = [{ id: 'email1', sender: 'test@example.com', subject: 'Test Email 1' }];
      mockEmailOperations.getEmails.mockReturnValue(newEmails1);
      await manager.processNewEmailsWithDetails(['email1'], newEmails1);
      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledTimes(1);
      
      // Second notification immediately with different email (should be blocked by cooldown)
      const newEmails2 = [{ id: 'email2', sender: 'test2@example.com', subject: 'Test Email 2' }];
      mockEmailOperations.getEmails.mockReturnValue(newEmails2);
      await manager.processNewEmailsWithDetails(['email2'], newEmails2);
      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledTimes(1);
      
      // After cooldown period
      vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes
      const newEmails3 = [{ id: 'email3', sender: 'test3@example.com', subject: 'Test Email 3' }];
      mockEmailOperations.getEmails.mockReturnValue(newEmails3);
      await manager.processNewEmailsWithDetails(['email3'], newEmails3);
      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledTimes(2);
    });

    it('should track notified emails to prevent duplicates', async () => {
      const manager = new EmailNotificationManager();
      await manager.initialize(mockEmailOperations);
      
      const resultHandler = mockPollingManager.addResultListener.mock.calls[0][0];
      const email = { id: 'email1', sender: 'test@example.com', subject: 'Test Email' };
      mockEmailOperations.getEmails.mockReturnValue([email]);
      
      // First time seeing this email
      await resultHandler({ success: true, data: ['email1'] });
      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledTimes(1);
      
      // Same email again (should not notify)
      vi.advanceTimersByTime(6 * 60 * 1000); // Past cooldown
      await resultHandler({ success: true, data: ['email1'] });
      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledTimes(1);
    });
  });

  describe('Update Manager Integration', () => {
    it('should integrate with notification service', async () => {
      const manager = new UpdateManager();
      
      await manager.initialize({ osNotificationsEnabled: true });
      
      expect(createNotificationService).toHaveBeenCalled();
      expect(manager.notificationService).toBe(mockNotificationService);
    });

    it('should send OS notifications for available updates', async () => {
      const manager = new UpdateManager();
      await manager.initialize();
      
      invoke.mockResolvedValue('Update available: v1.2.3 is ready to install');
      
      const result = await manager.checkForUpdates();
      
      expect(result.updateAvailable).toBe(true);
      expect(mockNotificationService.notifyUpdate).toHaveBeenCalledWith(
        'Update available: v1.2.3 is ready to install'
      );
    });

    it('should not send notifications when updates not available', async () => {
      const manager = new UpdateManager();
      await manager.initialize();
      
      invoke.mockResolvedValue('No updates available');
      
      await manager.checkForUpdates();
      
      expect(mockNotificationService.notifyUpdate).not.toHaveBeenCalled();
    });

    it('should handle startup and periodic update checks', async () => {
      const manager = new UpdateManager();
      
      await manager.initialize({
        autoCheckEnabled: true,
        notifyOnStartup: true,
        checkIntervalHours: 1
      });
      
      const checkSpy = vi.spyOn(manager, 'checkForUpdates').mockResolvedValue({});
      
      // Startup check (after 5 second delay)
      vi.advanceTimersByTime(6000);
      expect(checkSpy).toHaveBeenCalledTimes(1);
      
      // Periodic check (after 1 hour)
      vi.advanceTimersByTime(60 * 60 * 1000);
      expect(checkSpy).toHaveBeenCalledTimes(2);
    });

    it('should notify listeners about update events', async () => {
      const manager = new UpdateManager();
      await manager.initialize();
      
      const listener = vi.fn();
      manager.addListener(listener);
      
      invoke.mockResolvedValue('Update available: v1.2.3');
      
      await manager.checkForUpdates();
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'update-check-complete',
          updateAvailable: true
        })
      );
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'update-available'
        })
      );
    });
  });

  describe('Cross-Service Integration', () => {
    it('should handle both email and update notifications', async () => {
      const emailManager = new EmailNotificationManager();
      const updateManager = new UpdateManager();
      
      await emailManager.initialize(mockEmailOperations);
      await updateManager.initialize();
      
      // Both should use the same notification service instance
      expect(createNotificationService).toHaveBeenCalledTimes(2);
      expect(mockNotificationService.notifyNewEmails).toBeDefined();
      expect(mockNotificationService.notifyUpdate).toBeDefined();
      
      // Test email notification
      const newEmails = [{ id: 'email1', sender: 'test@example.com' }];
      mockEmailOperations.getEmails.mockReturnValue(newEmails);
      await emailManager.processNewEmailsWithDetails(['email1'], newEmails);
      
      // Test update notification
      invoke.mockResolvedValue('Update available: v1.2.3');
      await updateManager.checkForUpdates();
      
      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledWith(1, newEmails);
      expect(mockNotificationService.notifyUpdate).toHaveBeenCalledWith('Update available: v1.2.3');
    });

    it('should handle notification service unavailability gracefully', async () => {
      // Mock notification service as unavailable
      mockNotificationService.isAvailable.mockReturnValue(false);
      
      const emailManager = new EmailNotificationManager();
      await emailManager.initialize(mockEmailOperations);
      
      const newEmails = [{ id: 'email1', sender: 'test@example.com' }];
      mockEmailOperations.getEmails.mockReturnValue(newEmails);
      
      // Should not crash when service unavailable
      await emailManager.processNewEmailsWithDetails(['email1'], newEmails);
      
      expect(mockNotificationService.notifyNewEmails).not.toHaveBeenCalled();
    });

    it('should handle notification permission denial', async () => {
      // Mock notification service initialization failure
      createNotificationService.mockRejectedValue(new Error('Permission denied'));
      
      const emailManager = new EmailNotificationManager();
      const result = await emailManager.initialize(mockEmailOperations);
      
      expect(result.success).toBe(false);
      expect(emailManager.notificationService).toBeNull();
    });

    it('should cleanup resources properly', () => {
      const emailManager = new EmailNotificationManager();
      const updateManager = new UpdateManager();
      
      emailManager.pollingManager = mockPollingManager;
      updateManager.checkInterval = setInterval(() => {}, 1000);
      
      emailManager.cleanup();
      updateManager.cleanup();
      
      expect(mockPollingManager.cleanup).toHaveBeenCalled();
      expect(updateManager.checkInterval).toBeNull();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle polling errors gracefully', async () => {
      const emailManager = new EmailNotificationManager();
      await emailManager.initialize(mockEmailOperations);
      
      const resultHandler = mockPollingManager.addResultListener.mock.calls[0][0];
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Simulate polling error
      await resultHandler({ success: false, error: 'Network error' });
      
      // Should not crash or call notification service
      expect(mockNotificationService.notifyNewEmails).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle update check errors', async () => {
      const updateManager = new UpdateManager();
      await updateManager.initialize();
      
      const listener = vi.fn();
      updateManager.addListener(listener);
      
      invoke.mockRejectedValue(new Error('Update check failed'));
      
      const result = await updateManager.checkForUpdates();
      
      expect(result.success).toBe(false);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'update-check-error'
        })
      );
    });

    it('should handle notification send failures', async () => {
      mockNotificationService.notifyNewEmails.mockRejectedValue(new Error('Send failed'));
      
      const emailManager = new EmailNotificationManager();
      await emailManager.initialize(mockEmailOperations);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const newEmails = [{ id: 'email1', sender: 'test@example.com' }];
      mockEmailOperations.getEmails.mockReturnValue(newEmails);
      
      // Should not crash when notification fails
      await emailManager.processNewEmailsWithDetails(['email1'], newEmails);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send OS notification:'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Settings Integration', () => {
    it('should respect notification settings', async () => {
      const emailManager = new EmailNotificationManager();
      
      await emailManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: false,
        enabled: true
      });
      
      // Should not initialize notification service when OS notifications disabled
      expect(emailManager.notificationService).toBeNull();
      
      const newEmails = [{ id: 'email1', sender: 'test@example.com' }];
      mockEmailOperations.getEmails.mockReturnValue(newEmails);
      
      await emailManager.processNewEmailsWithDetails(['email1'], newEmails);
      
      // Should not attempt to send notification
      expect(mockNotificationService.notifyNewEmails).not.toHaveBeenCalled();
    });

    it('should update settings dynamically', async () => {
      const updateManager = new UpdateManager();
      await updateManager.initialize({ checkIntervalHours: 1 });
      
      const startSpy = vi.spyOn(updateManager, 'startPeriodicChecking');
      
      updateManager.updateSettings({ checkIntervalHours: 2 });
      
      expect(updateManager.settings.checkIntervalHours).toBe(2);
      expect(startSpy).toHaveBeenCalled();
    });
  });
});
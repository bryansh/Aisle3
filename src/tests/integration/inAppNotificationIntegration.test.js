import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailNotificationManager } from '../../lib/utils/emailNotificationManager.js';

// Mock dependencies
vi.mock('../../lib/utils/notificationService.js', () => ({
  createNotificationService: vi.fn()
}));

vi.mock('../../lib/utils/pollingManager.js', () => ({
  createEmailPollingManager: vi.fn()
}));

import { createNotificationService } from '../../lib/utils/notificationService.js';
import { createEmailPollingManager } from '../../lib/utils/pollingManager.js';

describe('In-App Notification Integration Tests', () => {
  let emailNotificationManager;
  let mockNotificationService;
  let mockPollingManager;
  let mockEmailOperations;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Set up mock notification service
    mockNotificationService = {
      isAvailable: vi.fn().mockReturnValue(true),
      notifyNewEmails: vi.fn().mockResolvedValue({ success: true })
    };
    createNotificationService.mockResolvedValue(mockNotificationService);

    // Set up mock polling manager
    mockPollingManager = {
      addResultListener: vi.fn(),
      start: vi.fn().mockReturnValue(true),
      stop: vi.fn().mockReturnValue(true),
      cleanup: vi.fn()
    };
    createEmailPollingManager.mockReturnValue(mockPollingManager);

    // Set up mock email operations
    mockEmailOperations = {
      getEmails: vi.fn().mockReturnValue([]),
      checkForNewEmails: vi.fn().mockResolvedValue([])
    };

    emailNotificationManager = new EmailNotificationManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (emailNotificationManager) {
      emailNotificationManager.cleanup();
    }
  });

  describe('Notification Fallback Scenarios', () => {
    it('should fallback to in-app when OS notification permission is denied', async () => {
      // Mock permission denied
      createNotificationService.mockRejectedValue(new Error('Permission denied'));

      await emailNotificationManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: true,
        inAppNotificationsEnabled: true
      });

      const inAppListener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(inAppListener);

      // Should still be able to send in-app notifications
      const mockEmails = [{ id: 'email1', sender: 'test@example.com', subject: 'Test' }];
      await emailNotificationManager.processNewEmailsWithDetails(['email1'], mockEmails);

      expect(inAppListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'email',
          title: expect.stringContaining('test@example.com'),
          message: expect.any(String)
        })
      );
    });

    it('should fallback to in-app when OS notification service is unavailable', async () => {
      mockNotificationService.isAvailable.mockReturnValue(false);

      await emailNotificationManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: true,
        inAppNotificationsEnabled: true
      });

      const inAppListener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(inAppListener);

      const mockEmails = [{ id: 'email1', sender: 'test@example.com', subject: 'Test' }];
      await emailNotificationManager.processNewEmailsWithDetails(['email1'], mockEmails);

      expect(mockNotificationService.notifyNewEmails).not.toHaveBeenCalled();
      expect(inAppListener).toHaveBeenCalled();
    });

    it('should fallback to in-app when OS notification sending fails', async () => {
      mockNotificationService.notifyNewEmails.mockRejectedValue(
        new Error('Notification send failed')
      );

      await emailNotificationManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: true,
        inAppNotificationsEnabled: true
      });

      const inAppListener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(inAppListener);

      const mockEmails = [{ id: 'email1', sender: 'test@example.com', subject: 'Test' }];
      await emailNotificationManager.processNewEmailsWithDetails(['email1'], mockEmails);

      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledOnce();
      expect(inAppListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'email',
          title: expect.stringContaining('test@example.com')
        })
      );
    });

    it('should not send any notifications when both are disabled', async () => {
      await emailNotificationManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: false,
        inAppNotificationsEnabled: false
      });

      const inAppListener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(inAppListener);

      const mockEmails = [{ id: 'email1', sender: 'test@example.com', subject: 'Test' }];
      await emailNotificationManager.processNewEmailsWithDetails(['email1'], mockEmails);

      expect(mockNotificationService.notifyNewEmails).not.toHaveBeenCalled();
      expect(inAppListener).not.toHaveBeenCalled();
    });
  });

  describe('Settings Change Integration', () => {
    it('should immediately affect notification behavior when settings change', async () => {
      await emailNotificationManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: true,
        inAppNotificationsEnabled: true
      });

      const inAppListener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(inAppListener);

      // Initial state - both enabled
      const mockEmails = [{ id: 'email1', sender: 'test@example.com', subject: 'Test 1' }];
      await emailNotificationManager.processNewEmailsWithDetails(['email1'], mockEmails);

      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledTimes(1);

      // Disable OS notifications - should switch to in-app only
      emailNotificationManager.updateSettings({
        osNotificationsEnabled: false,
        inAppNotificationsEnabled: true
      });

      // Clear previous calls
      vi.clearAllMocks();
      emailNotificationManager.clearNotificationHistory(); // Reset cooldown

      const mockEmails2 = [{ id: 'email2', sender: 'test2@example.com', subject: 'Test 2' }];
      await emailNotificationManager.processNewEmailsWithDetails(['email2'], mockEmails2);

      expect(mockNotificationService.notifyNewEmails).not.toHaveBeenCalled();
      expect(inAppListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'email',
          title: expect.stringContaining('test2@example.com')
        })
      );
    });

    it('should handle settings changes affecting notification routing', async () => {
      await emailNotificationManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: false,
        inAppNotificationsEnabled: true
      });

      const inAppListener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(inAppListener);

      // Initially disabled OS, enabled in-app
      const mockEmails = [{ id: 'email1', sender: 'test@example.com', subject: 'Test 1' }];
      await emailNotificationManager.processNewEmailsWithDetails(['email1'], mockEmails);

      expect(mockNotificationService.notifyNewEmails).not.toHaveBeenCalled();
      expect(inAppListener).toHaveBeenCalledTimes(1);

      // Change settings to disable in-app
      emailNotificationManager.updateSettings({
        osNotificationsEnabled: false,
        inAppNotificationsEnabled: false
      });

      // Clear previous calls and reset cooldown
      vi.clearAllMocks();
      emailNotificationManager.clearNotificationHistory();

      const mockEmails2 = [{ id: 'email2', sender: 'test2@example.com', subject: 'Test 2' }];
      await emailNotificationManager.processNewEmailsWithDetails(['email2'], mockEmails2);

      // Should not send any notifications now
      expect(mockNotificationService.notifyNewEmails).not.toHaveBeenCalled();
      expect(inAppListener).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Email Notification Formatting', () => {
    it('should format multiple emails correctly for in-app notifications', async () => {
      await emailNotificationManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: false,
        inAppNotificationsEnabled: true
      });

      const inAppListener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(inAppListener);

      const mockEmails = [
        { id: 'email1', sender: 'alice@example.com', subject: 'Meeting Tomorrow' },
        { id: 'email2', sender: 'bob@example.com', subject: 'Project Update' },
        { id: 'email3', sender: 'charlie@example.com', subject: 'Quick Question' }
      ];

      await emailNotificationManager.processNewEmailsWithDetails(
        ['email1', 'email2', 'email3'],
        mockEmails
      );

      expect(inAppListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'email',
          title: '3 New Emails',
          message: 'From: alice@example.com, bob@example.com, charlie@example.com'
        })
      );

      const callArgs = inAppListener.mock.calls[0][0];
      expect(callArgs.message).toContain('alice@example.com');
      expect(callArgs.message).toContain('bob@example.com');
      expect(callArgs.message).toContain('charlie@example.com');
    });

    it('should handle single email correctly for in-app notifications', async () => {
      await emailNotificationManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: false,
        inAppNotificationsEnabled: true
      });

      const inAppListener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(inAppListener);

      const mockEmails = [
        { id: 'email1', sender: 'test@example.com', subject: 'Important Message' }
      ];

      await emailNotificationManager.processNewEmailsWithDetails(['email1'], mockEmails);

      expect(inAppListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'email',
          title: expect.stringContaining('test@example.com'),
          message: expect.any(String)
        })
      );
    });
  });

  describe('Cooldown and Timing Integration', () => {
    it('should respect cooldown for both OS and in-app notifications', async () => {
      await emailNotificationManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
        notificationCooldownMinutes: 5
      });

      const inAppListener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(inAppListener);

      // First notification
      const mockEmails1 = [{ id: 'email1', sender: 'test1@example.com', subject: 'Test 1' }];
      await emailNotificationManager.processNewEmailsWithDetails(['email1'], mockEmails1);

      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledTimes(1);

      // Second notification immediately (should be blocked by cooldown)
      const mockEmails2 = [{ id: 'email2', sender: 'test2@example.com', subject: 'Test 2' }];
      await emailNotificationManager.processNewEmailsWithDetails(['email2'], mockEmails2);

      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledTimes(1); // Still only once
      expect(inAppListener).not.toHaveBeenCalled(); // In-app should also respect cooldown

      // Advance time past cooldown
      vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes

      const mockEmails3 = [{ id: 'email3', sender: 'test3@example.com', subject: 'Test 3' }];
      await emailNotificationManager.processNewEmailsWithDetails(['email3'], mockEmails3);

      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledTimes(2);
    });

    it('should handle cooldown when switching between notification types', async () => {
      await emailNotificationManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
        notificationCooldownMinutes: 5
      });

      const inAppListener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(inAppListener);

      // Send OS notification first
      const mockEmails1 = [{ id: 'email1', sender: 'test1@example.com', subject: 'Test 1' }];
      await emailNotificationManager.processNewEmailsWithDetails(['email1'], mockEmails1);

      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledTimes(1);

      // Disable OS notifications, try in-app (should be blocked by cooldown)
      emailNotificationManager.updateSettings({
        osNotificationsEnabled: false,
        inAppNotificationsEnabled: true
      });

      const mockEmails2 = [{ id: 'email2', sender: 'test2@example.com', subject: 'Test 2' }];
      await emailNotificationManager.processNewEmailsWithDetails(['email2'], mockEmails2);

      expect(inAppListener).not.toHaveBeenCalled(); // Should be blocked by cooldown
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should continue working after OS notification errors', async () => {
      // Start with working OS notifications
      await emailNotificationManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: true,
        inAppNotificationsEnabled: true
      });

      const inAppListener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(inAppListener);

      // First notification succeeds
      const mockEmails1 = [{ id: 'email1', sender: 'test1@example.com', subject: 'Test 1' }];
      await emailNotificationManager.processNewEmailsWithDetails(['email1'], mockEmails1);

      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledTimes(1);
      expect(inAppListener).not.toHaveBeenCalled(); // OS worked, no need for fallback

      // OS notifications start failing
      mockNotificationService.notifyNewEmails.mockRejectedValue(
        new Error('OS notification failed')
      );

      // Clear cooldown for next test
      emailNotificationManager.clearNotificationHistory();

      // Next notification should fallback to in-app
      const mockEmails2 = [{ id: 'email2', sender: 'test2@example.com', subject: 'Test 2' }];
      await emailNotificationManager.processNewEmailsWithDetails(['email2'], mockEmails2);

      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledTimes(2); // Tried again
      expect(inAppListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'email',
          title: expect.stringContaining('test2@example.com')
        })
      );
    });

    it('should handle in-app notification listener errors gracefully', async () => {
      await emailNotificationManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: false,
        inAppNotificationsEnabled: true
      });

      // Add a failing listener
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const workingListener = vi.fn();

      emailNotificationManager.addInAppNotificationListener(errorListener);
      emailNotificationManager.addInAppNotificationListener(workingListener);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockEmails = [{ id: 'email1', sender: 'test@example.com', subject: 'Test' }];
      await emailNotificationManager.processNewEmailsWithDetails(['email1'], mockEmails);

      // Working listener should still be called despite error in first listener
      expect(workingListener).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in in-app notification listener:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
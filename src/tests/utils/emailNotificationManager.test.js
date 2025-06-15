import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailNotificationManager, createEmailNotificationManager } from '../../lib/utils/emailNotificationManager.js';

// Mock dependencies
vi.mock('../../lib/utils/notificationService.js', () => ({
  createNotificationService: vi.fn()
}));

vi.mock('../../lib/utils/pollingManager.js', () => ({
  createEmailPollingManager: vi.fn()
}));

import { createNotificationService } from '../../lib/utils/notificationService.js';
import { createEmailPollingManager } from '../../lib/utils/pollingManager.js';

describe('EmailNotificationManager', () => {
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

    emailNotificationManager = new EmailNotificationManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (emailNotificationManager) {
      emailNotificationManager.cleanup();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully with default settings', async () => {
      const result = await emailNotificationManager.initialize(mockEmailOperations);

      expect(result.success).toBe(true);
      expect(emailNotificationManager.isInitialized).toBe(true);
      expect(createNotificationService).toHaveBeenCalled();
      expect(createEmailPollingManager).toHaveBeenCalledWith(
        mockEmailOperations,
        expect.objectContaining({
          intervalSeconds: 30,
          enabled: true,
          runImmediately: false
        })
      );
    });

    it('should accept custom settings during initialization', async () => {
      const customSettings = {
        pollingIntervalSeconds: 60,
        pollingEnabled: false,
        notificationCooldownMinutes: 10,
        osNotificationsEnabled: false
      };

      await emailNotificationManager.initialize(mockEmailOperations, customSettings);

      expect(emailNotificationManager.settings).toMatchObject(customSettings);
      expect(createEmailPollingManager).toHaveBeenCalledWith(
        mockEmailOperations,
        expect.objectContaining({
          intervalSeconds: 60,
          enabled: false
        })
      );
    });

    it('should skip notification service initialization when OS notifications disabled', async () => {
      await emailNotificationManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: false
      });

      expect(createNotificationService).not.toHaveBeenCalled();
      expect(emailNotificationManager.notificationService).toBeNull();
    });

    it('should handle initialization errors gracefully', async () => {
      createNotificationService.mockRejectedValue(new Error('Init failed'));

      const result = await emailNotificationManager.initialize(mockEmailOperations);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(emailNotificationManager.isInitialized).toBe(false);
    });

    it('should set up polling result listener', async () => {
      await emailNotificationManager.initialize(mockEmailOperations);

      expect(mockPollingManager.addResultListener).toHaveBeenCalledOnce();
      expect(mockPollingManager.addResultListener).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('Polling Result Handling', () => {
    let resultHandler;

    beforeEach(async () => {
      await emailNotificationManager.initialize(mockEmailOperations);
      // Capture the result handler
      resultHandler = mockPollingManager.addResultListener.mock.calls[0][0];
    });

    it('should process new emails from successful polling results', async () => {
      const newEmailIds = ['email1', 'email2'];
      const processSpy = vi.spyOn(emailNotificationManager, 'processNewEmailsWithDetails');

      await resultHandler({ success: true, data: newEmailIds });

      expect(processSpy).toHaveBeenCalledWith(newEmailIds, []);
    });

    it('should ignore failed polling results', async () => {
      const processSpy = vi.spyOn(emailNotificationManager, 'processNewEmailsWithDetails');

      await resultHandler({ success: false, error: 'Network error' });

      expect(processSpy).not.toHaveBeenCalled();
    });

    it('should ignore polling results with no data', async () => {
      const processSpy = vi.spyOn(emailNotificationManager, 'processNewEmailsWithDetails');

      await resultHandler({ success: true, data: null });

      expect(processSpy).not.toHaveBeenCalled();
    });

    it('should handle errors in processing gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(emailNotificationManager, 'processNewEmailsWithDetails').mockRejectedValue(
        new Error('Processing failed')
      );

      await resultHandler({ success: true, data: ['email1'] });

      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ EmailNotificationManager: Error processing new emails:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('New Email Processing', () => {
    beforeEach(async () => {
      await emailNotificationManager.initialize(mockEmailOperations);
      emailNotificationManager.settings.enabled = true;
    });

    it('should notify about new emails not previously seen', async () => {
      const newEmailIds = ['email1', 'email2'];
      const mockEmails = [
        { id: 'email1', sender: 'alice@example.com', subject: 'Test 1' },
        { id: 'email2', sender: 'bob@example.com', subject: 'Test 2' }
      ];

      await emailNotificationManager.processNewEmailsWithDetails(newEmailIds, mockEmails);

      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledWith(
        2,
        mockEmails
      );
      expect(emailNotificationManager.notifiedEmailIds.has('email1')).toBe(true);
      expect(emailNotificationManager.notifiedEmailIds.has('email2')).toBe(true);
    });

    it('should not notify about emails already notified', async () => {
      // Pre-populate notified emails
      emailNotificationManager.notifiedEmailIds.add('email1');

      const newEmailIds = ['email1', 'email2'];
      const mockEmails = [
        { id: 'email1', sender: 'alice@example.com', subject: 'Test 1' },
        { id: 'email2', sender: 'bob@example.com', subject: 'Test 2' }
      ];

      await emailNotificationManager.processNewEmailsWithDetails(newEmailIds, mockEmails);

      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({ id: 'email2' })
        ])
      );
    });

    it('should not notify when disabled', async () => {
      emailNotificationManager.settings.enabled = false;

      await emailNotificationManager.processNewEmailsWithDetails(['email1'], []);

      expect(mockNotificationService.notifyNewEmails).not.toHaveBeenCalled();
    });

    it('should update last notification time', async () => {
      const beforeTime = Date.now();
      
      await emailNotificationManager.processNewEmailsWithDetails(['email1'], []);
      
      expect(emailNotificationManager.lastNotificationTime).toBeGreaterThanOrEqual(beforeTime);
      expect(emailNotificationManager.lastNotificationTime).toBeLessThanOrEqual(Date.now());
    });

    it('should respect notification cooldown', async () => {
      // Send first notification
      await emailNotificationManager.processNewEmailsWithDetails(['email1'], []);
      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledOnce();

      // Try to send another immediately
      await emailNotificationManager.processNewEmailsWithDetails(['email2'], []);
      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledOnce(); // Still only once

      // Advance time past cooldown
      vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes

      // Now it should work
      await emailNotificationManager.processNewEmailsWithDetails(['email3'], []);
      expect(mockNotificationService.notifyNewEmails).toHaveBeenCalledTimes(2);
    });
  });


  describe('Notification Timing', () => {
    beforeEach(async () => {
      await emailNotificationManager.initialize(mockEmailOperations);
      emailNotificationManager.settings.enabled = true;
    });

    it('should respect cooldown period between notifications', async () => {
      // Set cooldown to 5 minutes to match the test expectations
      emailNotificationManager.settings.notificationCooldownMinutes = 5;
      
      const shouldNotify1 = emailNotificationManager.shouldNotify();
      expect(shouldNotify1).toBe(true);

      // Send first notification
      await emailNotificationManager.processNewEmailsWithDetails(['email1'], []);

      // Immediately check again
      const shouldNotify2 = emailNotificationManager.shouldNotify();
      expect(shouldNotify2).toBe(false);

      // Advance time but not enough
      vi.advanceTimersByTime(2 * 60 * 1000); // 2 minutes
      const shouldNotify3 = emailNotificationManager.shouldNotify();
      expect(shouldNotify3).toBe(false);

      // Advance past cooldown
      vi.advanceTimersByTime(4 * 60 * 1000); // 4 more minutes (total 6)
      const shouldNotify4 = emailNotificationManager.shouldNotify();
      expect(shouldNotify4).toBe(true);
    });

    it('should handle quiet hours when enabled', () => {
      emailNotificationManager.settings.quietHours = {
        enabled: true,
        start: '22:00',
        end: '08:00'
      };

      // Mock date to be in quiet hours (23:00)
      const mockDate = new Date('2024-01-01T23:00:00');
      vi.setSystemTime(mockDate);

      const shouldNotify = emailNotificationManager.shouldNotify();
      expect(shouldNotify).toBe(false);

      // Mock date to be outside quiet hours (09:00)
      const mockDate2 = new Date('2024-01-01T09:00:00');
      vi.setSystemTime(mockDate2);

      const shouldNotify2 = emailNotificationManager.shouldNotify();
      expect(shouldNotify2).toBe(true);
    });

    it('should handle overnight quiet hours correctly', () => {
      emailNotificationManager.settings.quietHours = {
        enabled: true,
        start: '22:00',
        end: '08:00'
      };

      // Test various times
      const testCases = [
        { time: '21:59:00', expected: true },  // Before quiet hours
        { time: '22:00:00', expected: false }, // Start of quiet hours
        { time: '23:30:00', expected: false }, // During quiet hours (night)
        { time: '00:30:00', expected: false }, // During quiet hours (after midnight)
        { time: '07:59:00', expected: false }, // Still in quiet hours
        { time: '08:00:00', expected: true },  // End of quiet hours
        { time: '09:00:00', expected: true }   // After quiet hours
      ];

      testCases.forEach(({ time, expected }) => {
        const mockDate = new Date(`2024-01-01T${time}`);
        vi.setSystemTime(mockDate);
        
        const shouldNotify = emailNotificationManager.shouldNotify();
        expect(shouldNotify).toBe(expected);
      });
    });

    it('should handle same-day quiet hours correctly', () => {
      emailNotificationManager.settings.quietHours = {
        enabled: true,
        start: '14:00',
        end: '18:00'
      };

      // Test times
      const testCases = [
        { time: '13:59:00', expected: true },  // Before quiet hours
        { time: '14:00:00', expected: false }, // Start of quiet hours
        { time: '16:00:00', expected: false }, // During quiet hours
        { time: '17:59:00', expected: false }, // Still in quiet hours
        { time: '18:00:00', expected: true },  // End of quiet hours
        { time: '19:00:00', expected: true }   // After quiet hours
      ];

      testCases.forEach(({ time, expected }) => {
        const mockDate = new Date(`2024-01-01T${time}`);
        vi.setSystemTime(mockDate);
        
        const shouldNotify = emailNotificationManager.shouldNotify();
        expect(shouldNotify).toBe(expected);
      });
    });
  });

  describe('Start and Stop Operations', () => {
    beforeEach(async () => {
      await emailNotificationManager.initialize(mockEmailOperations);
    });

    it('should start polling when enabled', () => {
      emailNotificationManager.settings.pollingEnabled = true;
      
      const result = emailNotificationManager.start();

      expect(result).toBe(true);
      expect(mockPollingManager.start).toHaveBeenCalledOnce();
    });

    it('should not start polling when disabled', () => {
      emailNotificationManager.settings.pollingEnabled = false;
      
      const result = emailNotificationManager.start();

      expect(result).toBe(false);
      expect(mockPollingManager.start).not.toHaveBeenCalled();
    });

    it('should not start when not initialized', () => {
      const uninitializedManager = new EmailNotificationManager();
      
      const result = uninitializedManager.start();

      expect(result).toBe(false);
    });

    it('should stop polling', () => {
      mockPollingManager.stop.mockReturnValue(true);
      
      const result = emailNotificationManager.stop();

      expect(result).toBe(true);
      expect(mockPollingManager.stop).toHaveBeenCalledOnce();
    });

    it('should handle stop when polling manager not available', () => {
      emailNotificationManager.pollingManager = null;
      
      const result = emailNotificationManager.stop();

      expect(result).toBe(false);
    });
  });

  describe('Settings Updates', () => {
    beforeEach(async () => {
      await emailNotificationManager.initialize(mockEmailOperations);
    });

    it('should update settings', () => {
      const newSettings = {
        pollingIntervalSeconds: 120,
        notificationCooldownMinutes: 10,
        osNotificationsEnabled: false
      };

      emailNotificationManager.updateSettings(newSettings);

      expect(emailNotificationManager.settings).toMatchObject(newSettings);
    });

    it('should update polling interval when changed', () => {
      emailNotificationManager.updateSettings({ pollingIntervalSeconds: 120 });

      expect(mockPollingManager.setInterval).toHaveBeenCalledWith(120);
    });

    it('should enable/disable polling based on settings', () => {
      emailNotificationManager.updateSettings({ pollingEnabled: false });
      expect(mockPollingManager.setEnabled).toHaveBeenCalledWith(false);

      emailNotificationManager.updateSettings({ pollingEnabled: true });
      expect(mockPollingManager.setEnabled).toHaveBeenCalledWith(true);
    });
  });

  describe('Status and Cleanup', () => {
    beforeEach(async () => {
      await emailNotificationManager.initialize(mockEmailOperations);
    });

    it('should provide current status', () => {
      mockPollingManager.isRunning.mockReturnValue(true);
      mockPollingManager.getStats.mockReturnValue({ runCount: 5 });
      emailNotificationManager.lastNotificationTime = Date.now();
      emailNotificationManager.notifiedEmailIds.add('email1');

      const status = emailNotificationManager.getStatus();

      expect(status).toMatchObject({
        isInitialized: true,
        isPolling: true,
        notificationServiceAvailable: true,
        notifiedEmailCount: 1,
        pollingStats: { runCount: 5 }
      });
      expect(status.lastNotificationTime).toBeDefined();
      expect(status.settings).toBeDefined();
    });

    it('should clear notification history', () => {
      emailNotificationManager.notifiedEmailIds.add('email1');
      emailNotificationManager.notifiedEmailIds.add('email2');
      emailNotificationManager.lastNotificationTime = Date.now();

      emailNotificationManager.clearNotificationHistory();

      expect(emailNotificationManager.notifiedEmailIds.size).toBe(0);
      expect(emailNotificationManager.lastNotificationTime).toBeNull();
    });

    it('should cleanup resources properly', () => {
      emailNotificationManager.notifiedEmailIds.add('email1');

      emailNotificationManager.cleanup();

      expect(mockPollingManager.cleanup).toHaveBeenCalledOnce();
      expect(emailNotificationManager.notifiedEmailIds.size).toBe(0);
      expect(emailNotificationManager.emailOperations).toBeNull();
      expect(emailNotificationManager.notificationService).toBeNull();
      expect(emailNotificationManager.isInitialized).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await emailNotificationManager.initialize(mockEmailOperations);
    });

    it('should handle notification service not available', async () => {
      mockNotificationService.isAvailable.mockReturnValue(false);

      await emailNotificationManager.sendEmailNotification(1, []);

      expect(mockNotificationService.notifyNewEmails).not.toHaveBeenCalled();
    });

    it('should handle notification service errors', async () => {
      mockNotificationService.notifyNewEmails.mockRejectedValue(
        new Error('Notification failed')
      );
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await emailNotificationManager.sendEmailNotification(1, []);

      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Failed to send OS notification:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle in-app notification listener errors gracefully', async () => {
      await emailNotificationManager.initialize(mockEmailOperations, {
        inAppNotificationsEnabled: true
      });

      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      emailNotificationManager.addInAppNotificationListener(errorListener);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Trigger in-app notification
      emailNotificationManager.emitInAppNotification({
        type: 'email',
        title: 'Test',
        message: 'Test message'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in in-app notification listener:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('In-App Notification Functionality', () => {
    beforeEach(async () => {
      await emailNotificationManager.initialize(mockEmailOperations, {
        inAppNotificationsEnabled: true
      });
    });

    it('should emit in-app notifications when enabled', () => {
      const listener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(listener);

      const notification = {
        type: 'email',
        title: 'New Email',
        message: 'You have a new message'
      };

      emailNotificationManager.emitInAppNotification(notification);

      expect(listener).toHaveBeenCalledWith(notification);
    });

    it('should not send in-app notifications when disabled', async () => {
      await emailNotificationManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: false,
        inAppNotificationsEnabled: false
      });

      const listener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(listener);

      // This should not trigger in-app notification because settings disabled it
      await emailNotificationManager.processNewEmailsWithDetails(
        ['email1'],
        [{ id: 'email1', sender: 'test@example.com', subject: 'Test' }]
      );

      expect(listener).not.toHaveBeenCalled();
    });

    it('should format in-app notification messages correctly', () => {
      const result = emailNotificationManager.formatInAppNotificationMessage(
        2,
        [
          { sender: 'alice@example.com', subject: 'Test 1' },
          { sender: 'bob@example.com', subject: 'Test 2' }
        ]
      );

      expect(result).toContain('alice@example.com');
      expect(result).toContain('bob@example.com');
      // Multi-email format only shows senders, not subjects
      expect(result).toMatch(/From: alice@example\.com, bob@example\.com/);
    });

    it('should handle single email in-app notification formatting', () => {
      const result = emailNotificationManager.formatInAppNotificationMessage(
        1,
        [{ sender: 'test@example.com', subject: 'Single Test', preview: 'This is a test message' }]
      );

      expect(result).toContain('This is a test message');
    });

    it('should send in-app notification as fallback when OS notification fails', async () => {
      mockNotificationService.notifyNewEmails.mockRejectedValue(
        new Error('OS notification failed')
      );

      const inAppListener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(inAppListener);

      await emailNotificationManager.processNewEmailsWithDetails(
        ['email1'],
        [{ id: 'email1', sender: 'test@example.com', subject: 'Test' }]
      );

      expect(inAppListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'email',
          title: expect.stringContaining('test@example.com'),
          message: expect.any(String)
        })
      );
    });

    it('should send in-app notification when OS notifications are disabled', async () => {
      await emailNotificationManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: false,
        inAppNotificationsEnabled: true
      });

      const inAppListener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(inAppListener);

      await emailNotificationManager.processNewEmailsWithDetails(
        ['email1'],
        [{ id: 'email1', sender: 'test@example.com', subject: 'Test' }]
      );

      expect(mockNotificationService.notifyNewEmails).not.toHaveBeenCalled();
      expect(inAppListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'email',
          title: expect.stringContaining('test@example.com')
        })
      );
    });

    it('should not send notifications when both OS and in-app are disabled', async () => {
      await emailNotificationManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: false,
        inAppNotificationsEnabled: false
      });

      const inAppListener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(inAppListener);

      await emailNotificationManager.processNewEmailsWithDetails(
        ['email1'],
        [{ id: 'email1', sender: 'test@example.com', subject: 'Test' }]
      );

      expect(mockNotificationService.notifyNewEmails).not.toHaveBeenCalled();
      expect(inAppListener).not.toHaveBeenCalled();
    });

    it('should remove in-app notification listeners using unsubscribe function', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = emailNotificationManager.addInAppNotificationListener(listener1);
      emailNotificationManager.addInAppNotificationListener(listener2);

      unsubscribe1(); // Remove listener1

      emailNotificationManager.emitInAppNotification({
        type: 'email',
        title: 'Test',
        message: 'Test message'
      });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should clear all in-app notification listeners on cleanup', () => {
      const listener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(listener);

      emailNotificationManager.cleanup();

      emailNotificationManager.emitInAppNotification({
        type: 'email',
        title: 'Test',
        message: 'Test message'
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should respect in-app notification settings in email processing', async () => {
      // Start with in-app notifications enabled
      await emailNotificationManager.initialize(mockEmailOperations, {
        osNotificationsEnabled: false,
        inAppNotificationsEnabled: true
      });

      const listener = vi.fn();
      emailNotificationManager.addInAppNotificationListener(listener);

      // Initially enabled - should send notification
      await emailNotificationManager.processNewEmailsWithDetails(
        ['email1'],
        [{ id: 'email1', sender: 'test@example.com', subject: 'Test' }]
      );
      expect(listener).toHaveBeenCalledTimes(1);

      // Disable in-app notifications
      emailNotificationManager.updateSettings({
        inAppNotificationsEnabled: false
      });

      // Clear notification history to avoid cooldown
      emailNotificationManager.clearNotificationHistory();

      // Should not send in-app notification now
      await emailNotificationManager.processNewEmailsWithDetails(
        ['email2'],
        [{ id: 'email2', sender: 'test2@example.com', subject: 'Test 2' }]
      );
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });
});

describe('createEmailNotificationManager', () => {
  let mockNotificationService;
  let mockPollingManager;
  let mockEmailOperations;

  beforeEach(() => {
    vi.clearAllMocks();

    mockNotificationService = {
      isAvailable: vi.fn().mockReturnValue(true),
      notifyNewEmails: vi.fn().mockResolvedValue({ success: true })
    };
    createNotificationService.mockResolvedValue(mockNotificationService);

    mockPollingManager = {
      addResultListener: vi.fn(),
      start: vi.fn().mockReturnValue(true),
      cleanup: vi.fn()
    };
    createEmailPollingManager.mockReturnValue(mockPollingManager);

    mockEmailOperations = {
      getEmails: vi.fn().mockReturnValue([]),
      checkForNewEmails: vi.fn().mockResolvedValue([])
    };
  });

  it('should create and initialize manager with custom settings', async () => {
    const customSettings = {
      pollingIntervalSeconds: 60,
      osNotificationsEnabled: false
    };

    const manager = await createEmailNotificationManager(
      mockEmailOperations,
      customSettings
    );

    expect(manager).toBeInstanceOf(EmailNotificationManager);
    expect(manager.isInitialized).toBe(true);
    expect(manager.settings).toMatchObject(customSettings);
  });

  it('should return manager even if initialization fails', async () => {
    createNotificationService.mockRejectedValue(new Error('Init failed'));

    const manager = await createEmailNotificationManager(mockEmailOperations);

    expect(manager).toBeInstanceOf(EmailNotificationManager);
    expect(manager.isInitialized).toBe(false);
  });
});
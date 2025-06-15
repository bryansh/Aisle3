import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationService, createNotificationService } from '../../lib/utils/notificationService.js';

// Mock the Tauri notification plugin
vi.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  sendNotification: vi.fn()
}));

import { 
  isPermissionGranted, 
  requestPermission, 
  sendNotification 
} from '@tauri-apps/plugin-notification';

describe('NotificationService', () => {
  let notificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    notificationService = new NotificationService();
  });

  afterEach(() => {
    if (notificationService) {
      notificationService = null;
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully when permission is already granted', async () => {
      isPermissionGranted.mockResolvedValue(true);

      const result = await notificationService.initialize();

      expect(result.success).toBe(true);
      expect(result.permissionGranted).toBe(true);
      expect(notificationService.isAvailable()).toBe(true);
      expect(isPermissionGranted).toHaveBeenCalledOnce();
    });

    it('should request permission when not already granted', async () => {
      isPermissionGranted.mockResolvedValue(false);
      requestPermission.mockResolvedValue('granted');

      const result = await notificationService.initialize();

      expect(result.success).toBe(true);
      expect(result.permissionGranted).toBe(true);
      expect(notificationService.isAvailable()).toBe(true);
      expect(requestPermission).toHaveBeenCalledOnce();
    });

    it('should handle permission denied gracefully', async () => {
      isPermissionGranted.mockResolvedValue(false);
      requestPermission.mockResolvedValue('denied');

      const result = await notificationService.initialize();

      expect(result.success).toBe(true);
      expect(result.permissionGranted).toBe(false);
      expect(notificationService.isAvailable()).toBe(false);
    });

    it('should handle initialization errors', async () => {
      isPermissionGranted.mockRejectedValue(new Error('Permission check failed'));

      const result = await notificationService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(notificationService.isAvailable()).toBe(false);
    });
  });

  describe('Notification Sending', () => {
    beforeEach(async () => {
      isPermissionGranted.mockResolvedValue(true);
      await notificationService.initialize();
    });

    it('should send basic notifications successfully', async () => {
      sendNotification.mockResolvedValue(undefined);

      const result = await notificationService.notify({
        title: 'Test Title',
        body: 'Test Body'
      });

      expect(result.success).toBe(true);
      expect(sendNotification).toHaveBeenCalledWith({
        title: 'Test Title',
        body: 'Test Body'
      });
    });

    it('should handle notification send failures', async () => {
      sendNotification.mockRejectedValue(new Error('Send failed'));

      const result = await notificationService.notify({
        title: 'Test Title',
        body: 'Test Body'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should not send notifications when service is not available', async () => {
      // Reinitialize with no permission
      isPermissionGranted.mockResolvedValue(false);
      requestPermission.mockResolvedValue('denied');
      await notificationService.initialize();

      const result = await notificationService.notify({
        title: 'Test Title',
        body: 'Test Body'
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('not_available');
      expect(sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('Update Notifications', () => {
    beforeEach(async () => {
      isPermissionGranted.mockResolvedValue(true);
      sendNotification.mockResolvedValue(undefined);
      await notificationService.initialize();
    });

    it('should format update notifications correctly', async () => {
      const message = 'Update available: v1.2.3 is ready to install';

      await notificationService.notifyUpdate(message);

      expect(sendNotification).toHaveBeenCalledWith({
        title: 'Aisle3 Update Available',
        body: message,
        actions: [
          { id: 'install', title: 'Install Now' },
          { id: 'dismiss', title: 'Later' }
        ]
      });
    });

    it('should handle generic update messages', async () => {
      const message = 'Some generic message';

      await notificationService.notifyUpdate(message);

      expect(sendNotification).toHaveBeenCalledWith({
        title: 'Aisle3 Update Available',
        body: 'A new version of Aisle3 is ready to install',
        actions: [
          { id: 'install', title: 'Install Now' },
          { id: 'dismiss', title: 'Later' }
        ]
      });
    });
  });

  describe('Email Notifications', () => {
    beforeEach(async () => {
      isPermissionGranted.mockResolvedValue(true);
      sendNotification.mockResolvedValue(undefined);
      await notificationService.initialize();
    });

    it('should format single email notifications', async () => {
      const emails = [{
        sender: 'john@example.com',
        subject: 'Meeting Tomorrow'
      }];

      await notificationService.notifyNewEmails(1, emails);

      expect(sendNotification).toHaveBeenCalledWith({
        title: 'New email from john@example.com',
        body: 'Meeting Tomorrow',
        actions: [
          { id: 'view', title: 'View Emails' },
          { id: 'dismiss', title: 'Dismiss' }
        ]
      });
    });

    it('should handle single email without details', async () => {
      await notificationService.notifyNewEmails(1, []);

      expect(sendNotification).toHaveBeenCalledWith({
        title: 'New email received',
        body: 'You have 1 new email',
        actions: [
          { id: 'view', title: 'View Emails' },
          { id: 'dismiss', title: 'Dismiss' }
        ]
      });
    });

    it('should format multiple email notifications with details', async () => {
      const emails = [
        { sender: 'alice@example.com', subject: 'Project Update' },
        { sender: 'bob@example.com', subject: 'Meeting Notes' },
        { sender: 'carol@example.com', subject: 'Status Report' }
      ];

      await notificationService.notifyNewEmails(3, emails);

      expect(sendNotification).toHaveBeenCalledWith({
        title: '3 new emails received',
        body: 'From: alice@example.com, bob@example.com, carol@example.com',
        actions: [
          { id: 'view', title: 'View Emails' },
          { id: 'dismiss', title: 'Dismiss' }
        ]
      });
    });

    it('should limit sender display and show "and others"', async () => {
      const emails = [
        { sender: 'alice@example.com' },
        { sender: 'bob@example.com' },
        { sender: 'carol@example.com' },
        { sender: 'dave@example.com' },
        { sender: 'eve@example.com' }
      ];

      await notificationService.notifyNewEmails(5, emails);

      expect(sendNotification).toHaveBeenCalledWith({
        title: '5 new emails received',
        body: 'From: alice@example.com, bob@example.com, carol@example.com and others',
        actions: [
          { id: 'view', title: 'View Emails' },
          { id: 'dismiss', title: 'Dismiss' }
        ]
      });
    });

    it('should handle multiple emails without details', async () => {
      await notificationService.notifyNewEmails(5, []);

      expect(sendNotification).toHaveBeenCalledWith({
        title: '5 new emails received',
        body: 'You have 5 new emails',
        actions: [
          { id: 'view', title: 'View Emails' },
          { id: 'dismiss', title: 'Dismiss' }
        ]
      });
    });
  });

  describe('Permission Management', () => {
    it('should check current permission status', async () => {
      isPermissionGranted.mockResolvedValue(true);

      const hasPermission = await notificationService.getPermissionStatus();

      expect(hasPermission).toBe(true);
      expect(isPermissionGranted).toHaveBeenCalledOnce();
    });

    it('should handle permission check errors', async () => {
      isPermissionGranted.mockRejectedValue(new Error('Permission check failed'));

      const hasPermission = await notificationService.getPermissionStatus();

      expect(hasPermission).toBe(false);
    });

    it('should request permission manually', async () => {
      requestPermission.mockResolvedValue('granted');

      const granted = await notificationService.requestPermission();

      expect(granted).toBe(true);
      expect(requestPermission).toHaveBeenCalledOnce();
    });

    it('should handle manual permission request denial', async () => {
      requestPermission.mockResolvedValue('denied');

      const granted = await notificationService.requestPermission();

      expect(granted).toBe(false);
    });

    it('should handle permission request errors', async () => {
      requestPermission.mockRejectedValue(new Error('Request failed'));

      const granted = await notificationService.requestPermission();

      expect(granted).toBe(false);
    });
  });

  describe('Service Availability', () => {
    it('should report availability correctly when initialized and permission granted', async () => {
      isPermissionGranted.mockResolvedValue(true);
      await notificationService.initialize();

      expect(notificationService.isAvailable()).toBe(true);
    });

    it('should report unavailable when permission denied', async () => {
      isPermissionGranted.mockResolvedValue(false);
      requestPermission.mockResolvedValue('denied');
      await notificationService.initialize();

      expect(notificationService.isAvailable()).toBe(false);
    });

    it('should report unavailable when not initialized', () => {
      expect(notificationService.isAvailable()).toBe(false);
    });
  });

  describe('General Notifications', () => {
    beforeEach(async () => {
      isPermissionGranted.mockResolvedValue(true);
      sendNotification.mockResolvedValue(undefined);
      await notificationService.initialize();
    });

    it('should send general notifications', async () => {
      await notificationService.notifyGeneral('General Title', 'General Body');

      expect(sendNotification).toHaveBeenCalledWith({
        title: 'General Title',
        body: 'General Body'
      });
    });
  });
});

describe('createNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create and initialize a notification service', async () => {
    isPermissionGranted.mockResolvedValue(true);

    const service = await createNotificationService();

    expect(service).toBeInstanceOf(NotificationService);
    expect(service.isAvailable()).toBe(true);
    expect(isPermissionGranted).toHaveBeenCalledOnce();
  });

  it('should return service even if initialization fails', async () => {
    isPermissionGranted.mockRejectedValue(new Error('Init failed'));

    const service = await createNotificationService();

    expect(service).toBeInstanceOf(NotificationService);
    expect(service.isAvailable()).toBe(false);
  });
});
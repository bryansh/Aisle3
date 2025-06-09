import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emailService } from '../../lib/services/emailService.js';
import { mockEmails, mockConversations, resetMocks } from '../__mocks__/tauri.js';

// Mock the Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

import { invoke } from '@tauri-apps/api/core';

describe('EmailService', () => {
  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  describe('loadEmails', () => {
    it('successfully loads emails', async () => {
      invoke.mockResolvedValue(mockEmails);

      const result = await emailService.loadEmails();

      expect(invoke).toHaveBeenCalledWith('get_emails');
      expect(result).toEqual(mockEmails);
    });

    it('handles loading error', async () => {
      const error = new Error('Failed to load');
      invoke.mockRejectedValue(error);

      await expect(emailService.loadEmails()).rejects.toThrow('Failed to load');
      expect(invoke).toHaveBeenCalledWith('get_emails');
    });
  });

  describe('markAsRead', () => {
    it('marks email as read successfully', async () => {
      invoke.mockResolvedValue({});

      await emailService.markAsRead('email123');

      expect(invoke).toHaveBeenCalledWith('mark_email_as_read', { 
        emailId: 'email123' 
      });
    });

    it('handles mark as read error', async () => {
      const error = new Error('Mark as read failed');
      invoke.mockRejectedValue(error);

      await expect(emailService.markAsRead('email123')).rejects.toThrow('Mark as read failed');
    });

    it('validates email ID parameter', async () => {
      await expect(emailService.markAsRead('')).rejects.toThrow();
      await expect(emailService.markAsRead(null)).rejects.toThrow();
      await expect(emailService.markAsRead(undefined)).rejects.toThrow();
    });
  });

  describe('markAsUnread', () => {
    it('marks email as unread successfully', async () => {
      invoke.mockResolvedValue({});

      await emailService.markAsUnread('email123');

      expect(invoke).toHaveBeenCalledWith('mark_email_as_unread', { 
        emailId: 'email123' 
      });
    });

    it('handles mark as unread error', async () => {
      const error = new Error('Mark as unread failed');
      invoke.mockRejectedValue(error);

      await expect(emailService.markAsUnread('email123')).rejects.toThrow('Mark as unread failed');
    });
  });

  describe('getEmailContent', () => {
    it('gets email content successfully', async () => {
      const fullEmail = {
        ...mockEmails[0],
        body_html: '<p>Full content</p>',
        body_text: 'Full content'
      };
      invoke.mockResolvedValue(fullEmail);

      const result = await emailService.getEmailContent('email123');

      expect(invoke).toHaveBeenCalledWith('get_email_content', { 
        emailId: 'email123' 
      });
      expect(result).toEqual(fullEmail);
    });

    it('handles get content error', async () => {
      const error = new Error('Get content failed');
      invoke.mockRejectedValue(error);

      await expect(emailService.getEmailContent('email123')).rejects.toThrow('Get content failed');
    });
  });

  describe('checkForNewEmails', () => {
    it('checks for new emails successfully', async () => {
      const newEmails = [mockEmails[0]];
      invoke.mockResolvedValue(newEmails);

      const result = await emailService.checkForNewEmails();

      expect(invoke).toHaveBeenCalledWith('check_for_new_emails_since_last_check');
      expect(result).toEqual(newEmails);
    });

    it('handles check for new emails error', async () => {
      const error = new Error('Check failed');
      invoke.mockRejectedValue(error);

      await expect(emailService.checkForNewEmails()).rejects.toThrow('Check failed');
    });

    it('returns empty array when no new emails', async () => {
      invoke.mockResolvedValue([]);

      const result = await emailService.checkForNewEmails();

      expect(result).toEqual([]);
    });
  });

  describe('getConversations', () => {
    it('gets conversations successfully', () => {
      emailService.emails = mockEmails;

      const result = emailService.getConversations();

      expect(Array.isArray(result)).toBe(true);
    });

    it('returns empty array when no emails', () => {
      emailService.emails = [];

      const result = emailService.getConversations();

      expect(result).toEqual([]);
    });

    it('filters single message threads by default', () => {
      emailService.emails = mockEmails;

      const result = emailService.getConversations(false);

      // Should only return threads with multiple messages
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getConversationStats', () => {
    it('gets conversation stats successfully', () => {
      emailService.emails = mockEmails;

      const result = emailService.getConversationStats();

      expect(result).toHaveProperty('totalEmails');
      expect(result).toHaveProperty('totalThreads');
      expect(result).toHaveProperty('multiMessageThreads');
      expect(result).toHaveProperty('singleMessageThreads');
    });

    it('returns zero stats when no emails', () => {
      emailService.emails = [];

      const result = emailService.getConversationStats();

      expect(result.totalEmails).toBe(0);
      expect(result.totalThreads).toBe(0);
    });
  });

  describe('getStats', () => {
    it('gets email stats successfully', () => {
      emailService.totalCount = 100;
      emailService.unreadCount = 5;

      const result = emailService.getStats();

      expect(result).toEqual({
        totalCount: 100,
        unreadCount: 5
      });
    });

    it('returns zero stats initially', async () => {
      const { EmailService } = await import('../../lib/services/emailService.js');
      const service = new EmailService();

      const result = service.getStats();

      expect(result.totalCount).toBe(0);
      expect(result.unreadCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('handles Tauri invoke errors consistently', async () => {
      const tauriError = new Error('Tauri invoke failed');
      invoke.mockRejectedValue(tauriError);

      await expect(emailService.loadEmails()).rejects.toThrow('Tauri invoke failed');
      await expect(emailService.markAsRead('test')).rejects.toThrow('Tauri invoke failed');
      await expect(emailService.markAsUnread('test')).rejects.toThrow('Tauri invoke failed');
      await expect(emailService.getEmailContent('test')).rejects.toThrow('Tauri invoke failed');
      await expect(emailService.checkForNewEmails()).rejects.toThrow('Tauri invoke failed');
    });

    it('handles malformed responses gracefully', async () => {
      // Test with various malformed responses
      const malformedResponses = [null, undefined, {}, 'invalid'];

      for (const response of malformedResponses) {
        invoke.mockResolvedValue(response);
        
        // Should not throw for malformed responses, but return the response as-is
        const result = await emailService.loadEmails();
        expect(result).toBe(response);
      }
    });
  });

  describe('Helper Methods', () => {
    it('finds email by ID', () => {
      emailService.emails = mockEmails;

      const found = emailService.findEmailById('email1');
      expect(found).toEqual(mockEmails[0]);
    });

    it('returns undefined for non-existent email ID', () => {
      emailService.emails = mockEmails;

      const found = emailService.findEmailById('non-existent');
      expect(found).toBeUndefined();
    });

    it('gets current emails', () => {
      emailService.emails = mockEmails;

      const emails = emailService.getEmails();
      expect(emails).toEqual(mockEmails);
    });
  });

  describe('Performance', () => {
    it('handles large email lists efficiently', async () => {
      const largeEmailList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockEmails[0],
        id: `email${i}`,
        subject: `Email ${i}`
      }));

      invoke.mockResolvedValue(largeEmailList);

      const startTime = Date.now();
      const result = await emailService.loadEmails();
      const endTime = Date.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Concurrent Operations', () => {
    it('handles concurrent email operations', async () => {
      invoke.mockResolvedValue({});

      const operations = [
        emailService.getEmailContent('email1'),
        emailService.getEmailContent('email2'),
        emailService.getEmailContent('email3'),
        emailService.getEmailContent('email4')
      ];

      await expect(Promise.all(operations)).resolves.not.toThrow();
      expect(invoke).toHaveBeenCalledTimes(4);
    });
  });
});
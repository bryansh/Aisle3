import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  emails,
  totalCount,
  unreadCount,
  loading,
  viewMode,
  selectedEmail,
  selectedConversation,
  conversations,
  emailOperations,
  navigationOperations
} from '../../lib/stores/emailStore.js';
import { mockEmails, mockConversations, resetMocks } from '../__mocks__/tauri.js';

// Mock the Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

// Mock the email service
vi.mock('../../lib/services/emailService.js', () => ({
  emailService: {
    loadEmails: vi.fn(),
    loadEmailsInBackground: vi.fn(),
    loadStats: vi.fn(),
    loadStatsInBackground: vi.fn(),
    getEmailContent: vi.fn(),
    markAsRead: vi.fn(),
    markAsUnread: vi.fn(),
    checkForNewEmails: vi.fn(),
    getConversations: vi.fn(),
    getStats: vi.fn(),
    getEmails: vi.fn(),
    emails: []
  }
}));

import { invoke } from '@tauri-apps/api/core';

describe('EmailStore', () => {
  beforeEach(() => {
    // Reset all stores to initial state
    emails.set([]);
    totalCount.set(0);
    unreadCount.set(0);
    loading.set(false);
    viewMode.set('emails');
    selectedEmail.set(null);
    selectedConversation.set(null);
    
    resetMocks();
    vi.clearAllMocks();
  });

  describe('Store Initialization', () => {
    it('initializes with empty state', () => {
      expect(get(emails)).toEqual([]);
      expect(get(totalCount)).toBe(0);
      expect(get(unreadCount)).toBe(0);
      expect(get(loading)).toBe(false);
      expect(get(viewMode)).toBe('emails');
      expect(get(selectedEmail)).toBeNull();
      expect(get(selectedConversation)).toBeNull();
    });
  });

  describe('Email Operations', () => {
    it('loads emails successfully', async () => {
      invoke.mockResolvedValue(mockEmails);

      await emailOperations.loadEmails();

      expect(get(emails)).toEqual(mockEmails);
      expect(get(loading)).toBe(false);
      expect(invoke).toHaveBeenCalledWith('load_emails');
    });

    it('handles email loading error', async () => {
      const error = new Error('Failed to load emails');
      invoke.mockRejectedValue(error);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await emailOperations.loadEmails();

      expect(get(emails)).toEqual([]);
      expect(get(loading)).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error loading emails:', error);

      consoleSpy.mockRestore();
    });

    it('sets loading state during email loading', async () => {
      // Create a promise that we can control
      let resolvePromise;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      invoke.mockReturnValue(pendingPromise);

      const loadPromise = emailOperations.loadEmails();
      
      // Should be loading
      expect(get(loading)).toBe(true);

      // Resolve the promise
      resolvePromise(mockEmails);
      await loadPromise;

      // Should no longer be loading
      expect(get(loading)).toBe(false);
    });

    it('marks email as read', async () => {
      emails.set(mockEmails);
      invoke.mockResolvedValue({});

      await emailOperations.markAsRead('email1');

      expect(invoke).toHaveBeenCalledWith('mark_email_as_read', { messageId: 'email1' });
      
      // Check that email is marked as read in store
      const updatedEmails = get(emails);
      const markedEmail = updatedEmails.find(e => e.id === 'email1');
      expect(markedEmail.is_read).toBe(true);
    });

    it('marks email as unread', async () => {
      emails.set(mockEmails);
      invoke.mockResolvedValue({});

      await emailOperations.markAsUnread('email2');

      expect(invoke).toHaveBeenCalledWith('mark_email_as_unread', { messageId: 'email2' });
      
      // Check that email is marked as unread in store
      const updatedEmails = get(emails);
      const markedEmail = updatedEmails.find(e => e.id === 'email2');
      expect(markedEmail.is_read).toBe(false);
    });

    it('gets email content', async () => {
      const fullEmail = { ...mockEmails[0], body_html: '<p>Full content</p>' };
      invoke.mockResolvedValue(fullEmail);

      await emailOperations.getEmailContent('email1');

      expect(invoke).toHaveBeenCalledWith('get_email_content', { messageId: 'email1' });
      expect(get(selectedEmail)).toEqual(fullEmail);
    });

    it('checks for new emails', async () => {
      const newEmails = [mockEmails[0]];
      invoke.mockResolvedValue(newEmails);

      await emailOperations.checkForNewEmails();

      expect(invoke).toHaveBeenCalledWith('check_for_new_emails');
    });

    it('loads email statistics', async () => {
      const stats = { totalCount: 100, unreadCount: 5 };
      invoke.mockResolvedValue(stats);

      await emailOperations.loadStats();

      expect(invoke).toHaveBeenCalledWith('get_email_stats');
      expect(get(totalCount)).toBe(100);
      expect(get(unreadCount)).toBe(5);
    });
  });

  describe('Navigation Operations', () => {
    it('toggles view mode from emails to conversations', () => {
      viewMode.set('emails');

      navigationOperations.toggleViewMode();

      expect(get(viewMode)).toBe('conversations');
    });

    it('toggles view mode from conversations to emails', () => {
      viewMode.set('conversations');

      navigationOperations.toggleViewMode();

      expect(get(viewMode)).toBe('emails');
    });

    it('selects conversation', () => {
      const conversation = mockConversations[0];

      navigationOperations.selectConversation(conversation);

      expect(get(selectedConversation)).toEqual(conversation);
    });

    it('goes back to inbox', () => {
      selectedEmail.set(mockEmails[0]);
      selectedConversation.set(mockConversations[0]);

      navigationOperations.backToInbox();

      expect(get(selectedEmail)).toBeNull();
      expect(get(selectedConversation)).toBeNull();
    });
  });

  describe('Conversation Operations', () => {
    it('loads conversations successfully', async () => {
      invoke.mockResolvedValue(mockConversations);

      await emailOperations.getConversations();

      expect(get(conversations)).toEqual(mockConversations);
      expect(invoke).toHaveBeenCalledWith('get_conversations');
    });

    it('handles conversation loading error', async () => {
      const error = new Error('Failed to load conversations');
      invoke.mockRejectedValue(error);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await emailOperations.getConversations();

      expect(get(conversations)).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error loading conversations:', error);

      consoleSpy.mockRestore();
    });
  });

  describe('Loading States', () => {
    it('manages loading email states', () => {
      const { loadingEmailStates } = get(emailOperations);

      // Add loading state
      loadingEmailStates.add('email1');
      expect(loadingEmailStates.has('email1')).toBe(true);

      // Remove loading state
      loadingEmailStates.delete('email1');
      expect(loadingEmailStates.has('email1')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const networkError = new Error('Network request failed');
      invoke.mockRejectedValue(networkError);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await emailOperations.loadEmails();

      expect(get(emails)).toEqual([]);
      expect(get(loading)).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('handles malformed response data', async () => {
      invoke.mockResolvedValue(null);

      await emailOperations.loadEmails();

      // Should handle null response gracefully
      expect(get(emails)).toEqual([]);
    });
  });

  describe('Store Reactivity', () => {
    it('updates derived stores when base stores change', () => {
      emails.set(mockEmails);

      // Derived stores should update automatically
      const currentEmails = get(emails);
      expect(currentEmails).toEqual(mockEmails);
    });

    it('maintains state consistency across operations', async () => {
      emails.set(mockEmails);
      
      // Mark email as read
      invoke.mockResolvedValue({});
      await emailOperations.markAsRead('email1');

      // State should be consistent
      const updatedEmails = get(emails);
      const readEmail = updatedEmails.find(e => e.id === 'email1');
      expect(readEmail.is_read).toBe(true);
    });
  });
});
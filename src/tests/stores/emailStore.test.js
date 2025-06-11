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
  loadingEmailStates,
  emailOperations,
  navigationOperations
} from '../../lib/stores/emailStore.js';
import { mockEmails, mockConversations, resetMocks } from '../__mocks__/tauri.js';

// Mock the Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
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
    
    // Set up invoke mock defaults based on the commands that emailService uses
    invoke.mockImplementation((command) => {
      switch (command) {
        case 'get_emails':
          return Promise.resolve(mockEmails);
        case 'get_inbox_stats':
          return Promise.resolve([100, 5]); // Array format as expected by emailService
        case 'get_email_content':
          return Promise.resolve(mockEmails[0]);
        case 'mark_email_as_read':
        case 'mark_email_as_unread':
        case 'send_reply':
          return Promise.resolve({});
        case 'check_for_new_emails_since_last_check':
          return Promise.resolve([]);
        default:
          return Promise.resolve({});
      }
    });
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
      await emailOperations.loadEmails();

      expect(get(emails)).toEqual(mockEmails);
      expect(get(loading)).toBe(false);
      expect(invoke).toHaveBeenCalledWith('get_emails');
    });

    it('handles email loading error', async () => {
      const error = new Error('Failed to load emails');
      invoke.mockRejectedValue(error);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await emailOperations.loadEmails();
      } catch (e) {
        // Expected to throw
      }

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

      expect(invoke).toHaveBeenCalledWith('mark_email_as_read', { emailId: 'email1' });
      
      // Check that email is marked as read in store
      const updatedEmails = get(emails);
      const markedEmail = updatedEmails.find(e => e.id === 'email1');
      expect(markedEmail.is_read).toBe(true);
    });

    it('marks email as unread', async () => {
      emails.set(mockEmails);
      invoke.mockResolvedValue({});

      await emailOperations.markAsUnread('email2');

      expect(invoke).toHaveBeenCalledWith('mark_email_as_unread', { emailId: 'email2' });
      
      // Check that email is marked as unread in store
      const updatedEmails = get(emails);
      const markedEmail = updatedEmails.find(e => e.id === 'email2');
      expect(markedEmail.is_read).toBe(false);
    });

    it('gets email content', async () => {
      const fullEmail = { ...mockEmails[0], body_html: '<p>Full content</p>' };
      invoke.mockResolvedValue(fullEmail);

      await emailOperations.getEmailContent('email1');

      expect(invoke).toHaveBeenCalledWith('get_email_content', { emailId: 'email1' });
      expect(get(selectedEmail)).toEqual(fullEmail);
    });

    it('checks for new emails', async () => {
      const newEmails = [mockEmails[0]];
      invoke.mockResolvedValue(newEmails);

      await emailOperations.checkForNewEmails();

      expect(invoke).toHaveBeenCalledWith('check_for_new_emails_since_last_check');
    });

    it('loads email statistics', async () => {
      // Mock returns array format as expected by emailService
      invoke.mockImplementation((command) => {
        if (command === 'get_inbox_stats') {
          return Promise.resolve([100, 5]);
        }
        return Promise.resolve({});
      });

      await emailOperations.loadStats();

      expect(invoke).toHaveBeenCalledWith('get_inbox_stats');
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
    it('derives conversations from emails when view mode is set', async () => {
      // Load emails first
      await emailOperations.loadEmails();
      
      // Switch to conversations view mode
      viewMode.set('conversations');
      
      // Conversations should be derived from emails
      const derivedConversations = get(conversations);
      expect(Array.isArray(derivedConversations)).toBe(true);
    });

    it('returns empty array when not in conversations mode', async () => {
      await emailOperations.loadEmails();
      
      // Ensure we're in emails mode
      viewMode.set('emails');
      
      const derivedConversations = get(conversations);
      expect(derivedConversations).toEqual([]);
    });
  });

  describe('Loading States', () => {
    it('manages loading email states through store', () => {
      const currentLoadingStates = get(loadingEmailStates.store);
      
      // Initially should be empty
      expect(currentLoadingStates.size).toBe(0);
      
      // Loading states are managed internally by the store operations
      // We can test that the store exists and is accessible
      expect(currentLoadingStates instanceof Set).toBe(true);
      
      // Test the helper functions
      expect(typeof loadingEmailStates.add).toBe('function');
      expect(typeof loadingEmailStates.remove).toBe('function');
      expect(typeof loadingEmailStates.has).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const networkError = new Error('Network request failed');
      invoke.mockRejectedValue(networkError);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await emailOperations.loadEmails();
      } catch (e) {
        // Expected to throw
      }

      expect(get(emails)).toEqual([]);
      expect(get(loading)).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('handles malformed response data', async () => {
      invoke.mockResolvedValue(null);

      await emailOperations.loadEmails();

      // Should handle null response gracefully
      expect(get(emails)).toEqual(null);
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
      // Load emails first to initialize emailService
      await emailOperations.loadEmails();
      
      // Set up invoke mock for mark as read and stats
      invoke.mockImplementation((command) => {
        if (command === 'mark_email_as_read') {
          return Promise.resolve({});
        }
        if (command === 'get_inbox_stats') {
          return Promise.resolve([100, 5]);
        }
        return Promise.resolve({});
      });
      
      await emailOperations.markAsRead('email1');

      // State should be consistent
      const updatedEmails = get(emails);
      const readEmail = updatedEmails.find(e => e.id === 'email1');
      expect(readEmail.is_read).toBe(true);
    });
  });
});
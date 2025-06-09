import { vi } from 'vitest';
import { writable } from 'svelte/store';

// Mock email store
export const emails = writable([]);
export const totalCount = writable(0);
export const unreadCount = writable(0);
export const loading = writable(false);
export const viewMode = writable('emails');
export const selectedEmail = writable(null);
export const selectedConversation = writable(null);
export const loadingEmail = writable(false);
export const showEmailView = writable(false);
export const showSettings = writable(false);
export const loadingEmailStates = writable(new Set());
export const conversations = writable([]);
export const conversationStats = writable(null);
export const showSingleMessageThreads = writable(false);

// Mock operations
export const emailOperations = {
  loadEmails: vi.fn(),
  markAsRead: vi.fn(),
  markAsUnread: vi.fn(),
  getEmailContent: vi.fn(),
  checkForNewEmails: vi.fn(),
  getConversations: vi.fn(),
  loadStats: vi.fn()
};

export const navigationOperations = {
  backToInbox: vi.fn(),
  showSettingsView: vi.fn(),
  toggleViewMode: vi.fn(),
  selectConversation: vi.fn()
};
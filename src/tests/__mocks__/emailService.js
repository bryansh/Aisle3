import { vi } from 'vitest';

export const emailService = {
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
};
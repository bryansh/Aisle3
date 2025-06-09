import { vi } from 'vitest';

// Mock Tauri invoke function
export const invoke = vi.fn();

// Mock email data
export const mockEmails = [
  {
    id: 'email1',
    thread_id: 'thread1',
    subject: 'Test Email 1',
    sender: 'sender1@example.com',
    snippet: 'This is a test email snippet',
    is_read: false,
    body_text: 'Test email body',
    body_html: '<p>Test email body</p>',
    date: '2025-06-08T10:00:00Z'
  },
  {
    id: 'email2', 
    thread_id: 'thread2',
    subject: 'Test Email 2',
    sender: 'sender2@example.com',
    snippet: 'Another test email snippet',
    is_read: true,
    body_text: 'Another test email body',
    body_html: '<p>Another test email body</p>',
    date: '2025-06-08T11:00:00Z'
  }
];

// Mock conversation data
export const mockConversations = [
  {
    thread_id: 'thread1',
    subject: 'Test Conversation',
    sender: 'sender1@example.com',
    snippet: 'Latest message in conversation',
    message_count: 3,
    has_unread: true,
    latest_date: '2025-06-08T10:00:00Z',
    emails: [
      {
        id: 'email1',
        thread_id: 'thread1',
        subject: 'Test Conversation',
        sender: 'sender1@example.com',
        snippet: 'First message',
        is_read: true
      },
      {
        id: 'email3',
        thread_id: 'thread1', 
        subject: 'Re: Test Conversation',
        sender: 'sender2@example.com',
        snippet: 'Reply message',
        is_read: false
      }
    ]
  }
];

// Mock auth responses
export const mockAuthSuccess = () => {
  invoke.mockResolvedValue(true);
};

export const mockAuthFailure = () => {
  invoke.mockRejectedValue(new Error('Authentication failed'));
};

// Mock email loading
export const mockLoadEmails = () => {
  invoke.mockResolvedValue(mockEmails);
};

// Mock conversation loading
export const mockLoadConversations = () => {
  invoke.mockResolvedValue(mockConversations);
};

// Reset all mocks
export const resetMocks = () => {
  invoke.mockReset();
};
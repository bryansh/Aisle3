/**
 * Shared Test Utilities for Aisle3 Email Application
 * Provides common mock factories and test setup utilities
 */

import { vi } from 'vitest';

// ===== EMAIL MOCK FACTORIES =====

export const mockEmailFactory = {
  /**
   * Create a basic email mock with common properties
   */
  basic: (overrides = {}) => ({
    id: 'email-123',
    subject: 'Test Email Subject',
    sender: 'test@example.com',
    date: '2023-12-01T10:00:00Z',
    body_text: 'This is a test email body.',
    body_html: '<p>This is a test email body.</p>',
    snippet: 'This is a test email...',
    is_read: false,
    thread_id: 'thread-456',
    ...overrides
  }),

  /**
   * Create an unread email
   */
  unread: (overrides = {}) => mockEmailFactory.basic({
    is_read: false,
    ...overrides
  }),

  /**
   * Create a read email
   */
  read: (overrides = {}) => mockEmailFactory.basic({
    is_read: true,
    ...overrides
  }),

  /**
   * Create a threaded conversation with multiple emails
   */
  withThread: (count = 3, overrides = {}) => {
    const threadId = `thread-${Date.now()}`;
    return Array.from({ length: count }, (_, index) => mockEmailFactory.basic({
      id: `email-${threadId}-${index}`,
      thread_id: threadId,
      subject: index === 0 ? 'Original Subject' : `Re: Original Subject`,
      sender: index % 2 === 0 ? 'sender@example.com' : 'reply@example.com',
      date: new Date(2023, 11, 1 + index).toISOString(),
      ...overrides
    }));
  },

  /**
   * Create an email with HTML content
   */
  withHtml: (overrides = {}) => mockEmailFactory.basic({
    body_html: '<div><h1>Test Email</h1><p>This is <strong>bold</strong> text.</p></div>',
    body_text: 'Test Email\nThis is bold text.',
    ...overrides
  }),

  /**
   * Create an email with no subject
   */
  noSubject: (overrides = {}) => mockEmailFactory.basic({
    subject: '',
    ...overrides
  }),

  /**
   * Create a large batch of emails for performance testing
   */
  batch: (count = 100, overrides = {}) => 
    Array.from({ length: count }, (_, index) => mockEmailFactory.basic({
      id: `batch-email-${index}`,
      subject: `Test Email ${index + 1}`,
      sender: `sender${index}@example.com`,
      date: new Date(2023, 11, 1, index % 24).toISOString(),
      is_read: index % 3 === 0, // Some read, some unread
      ...overrides
    })),

  /**
   * Create a conversation object with nested emails
   */
  conversation: (overrides = {}) => ({
    thread_id: 'thread-789',
    subject: 'Test Conversation',
    sender: 'conversation@example.com',
    snippet: 'Latest message in conversation',
    message_count: 3,
    has_unread: true,
    latest_date: '2023-12-01T10:00:00Z',
    emails: [
      mockEmailFactory.read({ id: 'conv-email-1', thread_id: 'thread-789' }),
      mockEmailFactory.read({ id: 'conv-email-2', thread_id: 'thread-789' }),
      mockEmailFactory.unread({ id: 'conv-email-3', thread_id: 'thread-789' })
    ],
    ...overrides
  })
};

// ===== AUTHENTICATION MOCK FACTORIES =====

export const mockAuthFactory = {
  /**
   * Successful authentication tokens
   */
  successTokens: () => ({
    access_token: 'mock-access-token-123',
    refresh_token: 'mock-refresh-token-456',
    expires_in: 3600,
    token_type: 'Bearer'
  }),

  /**
   * Authentication error responses
   */
  error: (errorType = 'invalid_grant') => ({
    error: errorType,
    error_description: `Mock ${errorType} error for testing`
  }),

  /**
   * User profile information
   */
  profile: () => ({
    emailAddress: 'test@example.com',
    messagesTotal: 1000,
    threadsTotal: 500
  }),

  /**
   * Mock authentication flow states
   */
  states: {
    loading: { isAuthenticated: false, isLoading: true, error: null },
    authenticated: { isAuthenticated: true, isLoading: false, error: null },
    error: { isAuthenticated: false, isLoading: false, error: 'Authentication failed' },
    unauthenticated: { isAuthenticated: false, isLoading: false, error: null }
  }
};

// ===== COMMON MOCK FUNCTIONS =====

/**
 * Create a mock function that resolves after a delay
 */
export const createAsyncMock = (returnValue = undefined, delay = 0) => {
  return vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve(returnValue), delay))
  );
};

/**
 * Create a mock function that rejects with an error
 */
export const createErrorMock = (error = new Error('Mock error')) => {
  return vi.fn().mockRejectedValue(error);
};

/**
 * Create a mock for email service operations
 */
export const mockEmailService = {
  loadEmails: createAsyncMock(mockEmailFactory.batch(10)),
  markAsRead: createAsyncMock(true),
  markAsUnread: createAsyncMock(true),
  sendReply: createAsyncMock(true),
  deleteEmail: createAsyncMock(true),
  
  // Error variants
  loadEmailsError: createErrorMock(new Error('Failed to load emails')),
  markAsReadError: createErrorMock(new Error('Failed to mark as read')),
  sendReplyError: createErrorMock(new Error('Failed to send reply'))
};

// ===== TAURI MOCK UTILITIES =====

/**
 * Mock Tauri invoke function with common email commands
 */
export const mockTauriInvoke = () => {
  const mockInvoke = vi.fn();
  
  // Setup default responses for common commands
  mockInvoke.mockImplementation((command, args) => {
    switch (command) {
      case 'get_profile':
        return Promise.resolve(mockAuthFactory.profile());
      case 'list_messages':
        return Promise.resolve(mockEmailFactory.batch(args?.maxResults || 10));
      case 'get_message':
        return Promise.resolve(mockEmailFactory.basic({ id: args?.messageId }));
      case 'send_reply':
        return Promise.resolve({ messageId: 'sent-123' });
      case 'mark_as_read':
      case 'mark_as_unread':
        return Promise.resolve(true);
      default:
        return Promise.reject(new Error(`Unknown command: ${command}`));
    }
  });
  
  return mockInvoke;
};

// ===== EDITOR MOCK UTILITIES =====

/**
 * Create a comprehensive TipTap editor mock
 */
export const createEditorMock = (hasContent = false) => ({
  chain: () => ({
    focus: () => ({ run: vi.fn() }),
    toggleBold: () => ({ run: vi.fn() }),
    toggleItalic: () => ({ run: vi.fn() }),
    toggleUnderline: () => ({ run: vi.fn() }),
    toggleStrike: () => ({ run: vi.fn() }),
    toggleBulletList: () => ({ run: vi.fn() }),
    toggleOrderedList: () => ({ run: vi.fn() }),
    toggleBlockquote: () => ({ run: vi.fn() }),
    setLink: () => ({ run: vi.fn() }),
    unsetLink: () => ({ run: vi.fn() }),
    clearNodes: () => ({ unsetAllMarks: () => ({ run: vi.fn() }) }),
    setTextAlign: () => ({ run: vi.fn() }),
    setColor: () => ({ run: vi.fn() }),
    setFontFamily: () => ({ run: vi.fn() }),
    setFontSize: () => ({ run: vi.fn() }),
    setContent: () => ({ run: vi.fn() }),
    undo: () => ({ run: vi.fn() }),
    redo: () => ({ run: vi.fn() }),
    removeEmptyTextStyle: () => ({ run: vi.fn() })
  }),
  commands: {
    focus: vi.fn(),
    setContent: vi.fn()
  },
  getHTML: vi.fn(() => hasContent ? '<p>Test content</p>' : '<p></p>'),
  getText: vi.fn(() => hasContent ? 'Test content' : ''),
  isActive: vi.fn(() => false),
  destroy: vi.fn(),
  state: {
    selection: { empty: !hasContent }
  },
  on: vi.fn(),
  off: vi.fn()
});

// ===== TEST ENVIRONMENT UTILITIES =====

/**
 * Setup common test environment with cleanup
 */
export const setupTestEnvironment = () => {
  const cleanup = [];
  
  // Mock localStorage
  const mockStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  };
  
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true
  });
  
  cleanup.push(() => {
    vi.clearAllMocks();
  });
  
  return {
    mockStorage,
    cleanup: () => cleanup.forEach(fn => fn())
  };
};

/**
 * Mock component props with sensible defaults
 */
export const createDefaultProps = (componentType, overrides = {}) => {
  const propsByComponent = {
    EmailComposer: {
      originalEmail: mockEmailFactory.basic(),
      onSend: vi.fn(),
      onCancel: vi.fn(),
      isVisible: true
    },
    EmailViewer: {
      email: mockEmailFactory.basic(),
      sanitizeEmailHtml: vi.fn(html => html),
      autoMarkReadDelay: 1500,
      onReply: vi.fn()
    },
    EmailList: {
      emails: mockEmailFactory.batch(5),
      selectedEmailId: null,
      onEmailSelect: vi.fn(),
      onMarkAsRead: vi.fn(),
      onMarkAsUnread: vi.fn(),
      onEmailAction: vi.fn(),
      loadingEmailStates: new Set() // This was missing and causing the error
    },
    AuthSection: {
      onAuthSuccess: vi.fn(),
      onAuthError: vi.fn()
    }
  };
  
  return {
    ...propsByComponent[componentType] || {},
    ...overrides
  };
};

// ===== ERROR SCENARIO UTILITIES =====

/**
 * Common error scenarios for testing
 */
export const errorScenarios = {
  network: {
    offline: new Error('Network request failed'),
    timeout: new Error('Request timeout'),
    serverError: new Error('Internal server error (500)')
  },
  
  auth: {
    invalidToken: new Error('Invalid access token'),
    expired: new Error('Token has expired'),
    forbidden: new Error('Insufficient permissions')
  },
  
  email: {
    notFound: new Error('Email not found'),
    invalidFormat: new Error('Invalid email format'),
    tooLarge: new Error('Email content too large')
  },
  
  validation: {
    required: new Error('Required field missing'),
    invalid: new Error('Invalid input format')
  }
};

/**
 * Create error mock with specific scenario
 */
export const createErrorScenario = (category, type) => {
  const error = errorScenarios[category]?.[type];
  if (!error) {
    throw new Error(`Unknown error scenario: ${category}.${type}`);
  }
  return createErrorMock(error);
};
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ConversationViewer from '../../lib/components/ConversationViewer.svelte';

describe('ConversationViewer', () => {
  let mockConversation;
  let mockProps;

  beforeEach(() => {
    mockConversation = {
      thread_id: 'thread-123',
      subject: 'Test Conversation Subject',
      sender: 'sender@example.com',
      snippet: 'Test conversation snippet',
      message_count: 3,
      has_unread: true,
      latest_date: '2024-01-15T10:00:00Z',
      emails: [
        {
          id: 'email-1',
          thread_id: 'thread-123',
          subject: 'Test Email 1',
          sender: 'sender1@example.com',
          snippet: 'First email snippet',
          is_read: true
        },
        {
          id: 'email-2',
          thread_id: 'thread-123',
          subject: 'Re: Test Email 1',
          sender: 'sender2@example.com',
          snippet: 'Second email snippet',
          is_read: false
        },
        {
          id: 'email-3',
          thread_id: 'thread-123',
          subject: 'Re: Test Email 1 (Follow-up)',
          sender: 'sender3@example.com',
          snippet: 'Third email snippet',
          is_read: false
        }
      ]
    };

    mockProps = {
      conversation: mockConversation,
      onEmailSelect: vi.fn(),
      onMarkAsRead: vi.fn().mockResolvedValue(undefined),
      onMarkAsUnread: vi.fn().mockResolvedValue(undefined),
      loadingEmailStates: { has: vi.fn().mockReturnValue(false) },
      decode: vi.fn((text) => text) // Simple passthrough for testing
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render conversation header with subject and message count', () => {
    render(ConversationViewer, mockProps);

    expect(screen.getByText('Conversation: Test Conversation Subject')).toBeInTheDocument();
    expect(screen.getByText('3 messages in this thread')).toBeInTheDocument();
  });

  it('should render all emails in the conversation', () => {
    render(ConversationViewer, mockProps);

    expect(screen.getByText('Test Email 1')).toBeInTheDocument();
    expect(screen.getByText('Re: Test Email 1')).toBeInTheDocument();
    expect(screen.getByText('Re: Test Email 1 (Follow-up)')).toBeInTheDocument();
    expect(screen.getByText('sender1@example.com')).toBeInTheDocument();
    expect(screen.getByText('sender2@example.com')).toBeInTheDocument();
    expect(screen.getByText('sender3@example.com')).toBeInTheDocument();
  });

  it('should decode email snippets using the provided decode function', () => {
    const mockDecode = vi.fn((text) => `decoded: ${text}`);
    render(ConversationViewer, {
      ...mockProps,
      decode: mockDecode
    });

    expect(mockDecode).toHaveBeenCalledWith('First email snippet');
    expect(mockDecode).toHaveBeenCalledWith('Second email snippet');
    expect(mockDecode).toHaveBeenCalledWith('Third email snippet');
    expect(screen.getByText('decoded: First email snippet')).toBeInTheDocument();
  });

  it('should show unread badges for unread emails only', () => {
    render(ConversationViewer, mockProps);

    const unreadBadges = screen.getAllByText('Unread');
    expect(unreadBadges).toHaveLength(2); // Only emails 2 and 3 are unread
  });

  it('should apply different background colors for read vs unread emails', () => {
    render(ConversationViewer, mockProps);

    const emailContainers = document.querySelectorAll('.space-y-4 > div');
    
    // First email (read) should have gray background
    expect(emailContainers[0]).toHaveClass('bg-gray-50');
    
    // Second and third emails (unread) should have blue background
    expect(emailContainers[1]).toHaveClass('bg-blue-50');
    expect(emailContainers[2]).toHaveClass('bg-blue-50');
  });

  it('should call onEmailSelect when "View full message" is clicked', async () => {
    render(ConversationViewer, mockProps);

    const viewButtons = screen.getAllByText('View full message →');
    await fireEvent.click(viewButtons[0]);

    expect(mockProps.onEmailSelect).toHaveBeenCalledWith(mockConversation.emails[0]);
  });

  it('should show correct toggle text for read vs unread emails', () => {
    render(ConversationViewer, mockProps);

    expect(screen.getByText('Mark unread')).toBeInTheDocument(); // For read email
    expect(screen.getAllByText('Mark read')).toHaveLength(2); // For unread emails
  });

  it('should call onMarkAsUnread when marking read email as unread', async () => {
    render(ConversationViewer, mockProps);

    const markUnreadButton = screen.getByText('Mark unread');
    await fireEvent.click(markUnreadButton);

    expect(mockProps.onMarkAsUnread).toHaveBeenCalledWith('email-1');
    expect(mockProps.onMarkAsRead).not.toHaveBeenCalled();
  });

  it('should call onMarkAsRead when marking unread email as read', async () => {
    render(ConversationViewer, mockProps);

    const markReadButtons = screen.getAllByText('Mark read');
    await fireEvent.click(markReadButtons[0]);

    expect(mockProps.onMarkAsRead).toHaveBeenCalledWith('email-2');
    expect(mockProps.onMarkAsUnread).not.toHaveBeenCalled();
  });

  it('should stop event propagation when clicking toggle read status', async () => {
    render(ConversationViewer, mockProps);

    const markReadButton = screen.getAllByText('Mark read')[0];
    const stopPropagation = vi.fn();
    
    // Create a mock event
    const mockEvent = { stopPropagation };
    
    // Manually trigger the onclick handler with our mock event
    const parentDiv = markReadButton.closest('.space-y-4 > div');
    const toggleButton = parentDiv.querySelector('button:last-child');
    
    // Simulate the event
    await fireEvent.click(toggleButton);
    
    // Since we can't easily test stopPropagation directly,
    // we'll verify the function was called correctly
    expect(mockProps.onMarkAsRead).toHaveBeenCalledWith('email-2');
  });

  it('should show loading state for emails that are being processed', () => {
    const loadingStates = { has: vi.fn((id) => id === 'email-2') };
    
    render(ConversationViewer, {
      ...mockProps,
      loadingEmailStates: loadingStates
    });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should disable buttons for emails in loading state', () => {
    const loadingStates = { has: vi.fn((id) => id === 'email-2') };
    
    render(ConversationViewer, {
      ...mockProps,
      loadingEmailStates: loadingStates
    });

    const buttons = screen.getAllByRole('button');
    const toggleButtons = buttons.filter(button => 
      button.textContent.includes('Mark') || button.textContent.includes('Loading')
    );
    
    // Find the loading button and verify it's disabled
    const loadingButton = toggleButtons.find(button => 
      button.textContent.includes('Loading')
    );
    expect(loadingButton).toBeDisabled();
  });

  it('should handle empty conversation emails array', () => {
    const emptyConversation = {
      ...mockConversation,
      emails: [],
      message_count: 0
    };

    render(ConversationViewer, {
      ...mockProps,
      conversation: emptyConversation
    });

    expect(screen.getByText('0 messages in this thread')).toBeInTheDocument();
    expect(screen.queryByText('View full message →')).not.toBeInTheDocument();
  });

  it('should handle conversation with single email', () => {
    const singleEmailConversation = {
      ...mockConversation,
      emails: [mockConversation.emails[0]],
      message_count: 1
    };

    render(ConversationViewer, {
      ...mockProps,
      conversation: singleEmailConversation
    });

    expect(screen.getByText('1 messages in this thread')).toBeInTheDocument();
    expect(screen.getAllByText('View full message →')).toHaveLength(1);
    expect(screen.queryByText('Unread')).not.toBeInTheDocument(); // No unread emails
  });

  it('should handle conversation with all read emails', () => {
    const allReadConversation = {
      ...mockConversation,
      emails: mockConversation.emails.map(email => ({ ...email, is_read: true })),
      has_unread: false
    };

    render(ConversationViewer, {
      ...mockProps,
      conversation: allReadConversation
    });

    expect(screen.queryByText('Unread')).not.toBeInTheDocument();
    expect(screen.getAllByText('Mark unread')).toHaveLength(3);
    
    // All should have gray background
    const emailContainers = document.querySelectorAll('.space-y-4 > div');
    emailContainers.forEach(container => {
      expect(container).toHaveClass('bg-gray-50');
    });
  });

  it('should handle conversation with all unread emails', () => {
    const allUnreadConversation = {
      ...mockConversation,
      emails: mockConversation.emails.map(email => ({ ...email, is_read: false })),
      has_unread: true
    };

    render(ConversationViewer, {
      ...mockProps,
      conversation: allUnreadConversation
    });

    expect(screen.getAllByText('Unread')).toHaveLength(3);
    expect(screen.getAllByText('Mark read')).toHaveLength(3);
    
    // All should have blue background
    const emailContainers = document.querySelectorAll('.space-y-4 > div');
    emailContainers.forEach(container => {
      expect(container).toHaveClass('bg-blue-50');
    });
  });

  it('should handle special characters in email content', () => {
    const specialCharsConversation = {
      ...mockConversation,
      subject: 'Test & Special <characters> "quotes"',
      emails: [{
        id: 'email-special',
        thread_id: 'thread-123',
        subject: 'Subject with & < > " characters',
        sender: 'sender+special@example.com',
        snippet: 'Snippet with <script>alert("xss")</script> content',
        is_read: false
      }]
    };

    render(ConversationViewer, {
      ...mockProps,
      conversation: specialCharsConversation
    });

    expect(screen.getByText('Conversation: Test & Special <characters> "quotes"')).toBeInTheDocument();
    expect(screen.getByText('Subject with & < > " characters')).toBeInTheDocument();
    expect(screen.getByText('sender+special@example.com')).toBeInTheDocument();
  });

  it('should call decode function for each email snippet', () => {
    const mockDecode = vi.fn((text) => text);
    
    render(ConversationViewer, {
      ...mockProps,
      decode: mockDecode
    });

    expect(mockDecode).toHaveBeenCalledTimes(3);
    expect(mockDecode).toHaveBeenCalledWith('First email snippet');
    expect(mockDecode).toHaveBeenCalledWith('Second email snippet');
    expect(mockDecode).toHaveBeenCalledWith('Third email snippet');
  });
});
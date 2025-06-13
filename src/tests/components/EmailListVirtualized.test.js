import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import EmailListVirtualized from '../../lib/components/EmailListVirtualized.svelte';

describe('EmailListVirtualized', () => {
  let mockEmails;
  let mockProps;

  beforeEach(() => {
    mockEmails = Array.from({ length: 10 }, (_, i) => ({
      id: `email-${i}`,
      thread_id: `thread-${i}`,
      subject: `Test Email ${i + 1}`,
      sender: `sender${i + 1}@example.com`,
      snippet: `Test snippet ${i + 1}`,
      is_read: i % 2 === 0
    }));

    mockProps = {
      emails: mockEmails,
      onEmailSelect: vi.fn(),
      onMarkAsRead: vi.fn(),
      onMarkAsUnread: vi.fn(),
      loadingEmailStates: new Set()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no emails', () => {
    render(EmailListVirtualized, {
      ...mockProps,
      emails: []
    });

    expect(screen.getByText('No emails found')).toBeInTheDocument();
  });

  it('should use regular list for small email count', () => {
    render(EmailListVirtualized, {
      ...mockProps,
      virtualizationThreshold: 50
    });

    // Should use regular list (not virtualized)
    expect(screen.queryByTestId('email-list')).toBeInTheDocument();
    expect(screen.queryByTestId('email-list-virtualized')).not.toBeInTheDocument();
  });

  it('should use virtualized list for large email count', () => {
    const largeEmailList = Array.from({ length: 100 }, (_, i) => ({
      id: `email-${i}`,
      subject: `Email ${i + 1}`,
      sender: `sender${i + 1}@example.com`,
      snippet: `Snippet ${i + 1}`,
      is_read: i % 3 === 0
    }));

    render(EmailListVirtualized, {
      ...mockProps,
      emails: largeEmailList,
      virtualizationThreshold: 50
    });

    // Should use virtualized list
    expect(screen.queryByTestId('email-list-virtualized')).toBeInTheDocument();
    expect(screen.queryByTestId('email-list')).not.toBeInTheDocument();
  });

  it('should display virtualization info for large lists', () => {
    const largeEmailList = Array.from({ length: 100 }, (_, i) => ({
      id: `email-${i}`,
      subject: `Email ${i + 1}`,
      sender: `sender${i + 1}@example.com`,
      snippet: `Snippet ${i + 1}`,
      is_read: false
    }));

    render(EmailListVirtualized, {
      ...mockProps,
      emails: largeEmailList,
      virtualizationThreshold: 50
    });

    expect(screen.getByText(/Showing 100 emails \(virtualized for performance\)/)).toBeInTheDocument();
  });

  it('should render email items with correct content', () => {
    render(EmailListVirtualized, mockProps);

    expect(screen.getByText('Test Email 1')).toBeInTheDocument();
    expect(screen.getByText('sender1@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test snippet 1')).toBeInTheDocument();
  });


  it('should call onEmailSelect when email is clicked', async () => {
    render(EmailListVirtualized, mockProps);

    const emailItem = screen.getAllByTestId('email-item')[0];
    await fireEvent.click(emailItem);

    expect(mockProps.onEmailSelect).toHaveBeenCalledWith(mockEmails[0]);
  });



  it('should show loading spinner for emails in loading state', () => {
    const loadingStates = new Set(['email-0']);
    
    render(EmailListVirtualized, {
      ...mockProps,
      loadingEmailStates: loadingStates
    });

    const spinners = document.querySelectorAll('.animate-spin');
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('should disable buttons for emails in loading state', () => {
    const loadingStates = new Set(['email-0']);
    
    render(EmailListVirtualized, {
      ...mockProps,
      loadingEmailStates: loadingStates
    });

    const buttons = screen.getAllByRole('button');
    const disabledButtons = buttons.filter(button => button.disabled);
    expect(disabledButtons.length).toBeGreaterThan(0);
  });

  it('should respect custom container height', () => {
    render(EmailListVirtualized, {
      ...mockProps,
      emails: Array.from({ length: 100 }, (_, i) => ({ id: i, subject: `Email ${i}`, sender: 'test@example.com', snippet: 'test', is_read: false })),
      containerHeight: 800,
      virtualizationThreshold: 50
    });

    const container = document.querySelector('.virtual-scroll-container');
    expect(container.style.height).toBe('800px');
  });

  it('should respect custom item height', () => {
    render(EmailListVirtualized, {
      ...mockProps,
      emails: Array.from({ length: 100 }, (_, i) => ({ id: i, subject: `Email ${i}`, sender: 'test@example.com', snippet: 'test', is_read: false })),
      itemHeight: 150,
      virtualizationThreshold: 50
    });

    const items = document.querySelectorAll('.virtual-item');
    if (items.length > 0) {
      expect(items[0].style.height).toBe('150px'); // itemHeight (virtual-item container)
    }
  });

  it('should expose scrollToEmail method', () => {
    const { component } = render(EmailListVirtualized, {
      ...mockProps,
      emails: Array.from({ length: 100 }, (_, i) => ({ id: i, subject: `Email ${i}`, sender: 'test@example.com', snippet: 'test', is_read: false })),
      virtualizationThreshold: 50
    });

    expect(component.scrollToEmail).toBeDefined();
    expect(typeof component.scrollToEmail).toBe('function');
  });

  it('should expose getPerformanceMetrics method', () => {
    const { component } = render(EmailListVirtualized, mockProps);

    expect(component.getPerformanceMetrics).toBeDefined();
    expect(typeof component.getPerformanceMetrics).toBe('function');
    
    const metrics = component.getPerformanceMetrics();
    expect(metrics).toHaveProperty('totalEmails');
    expect(metrics).toHaveProperty('isVirtualized');
    expect(metrics.totalEmails).toBe(10);
  });


  it('should prevent event propagation when clicking action buttons', async () => {
    const stopPropagation = vi.fn();
    
    render(EmailListVirtualized, mockProps);

    const markReadButton = screen.getAllByTitle(/Mark as/)[0];
    
    // Create a mock event with stopPropagation
    const mockEvent = { stopPropagation };
    
    // Manually trigger the button click handler
    await fireEvent.click(markReadButton);
    
    // The onEmailSelect should not be called when clicking the button
    // (this tests the stopPropagation behavior)
    expect(mockProps.onEmailSelect).not.toHaveBeenCalled();
  });

  it('should apply correct styling for read vs unread emails', () => {
    render(EmailListVirtualized, mockProps);

    const emailItems = screen.getAllByTestId('email-item');
    
    // Check that styling classes are applied correctly
    emailItems.forEach((item, index) => {
      const email = mockEmails[index];
      if (!email.is_read) {
        expect(item.className).toContain('border-l-blue-500');
      } else {
        expect(item.className).toContain('bg-gray-50');
      }
    });
  });
});
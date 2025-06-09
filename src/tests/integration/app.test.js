import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import EmailApp from '../../lib/components/EmailApp.svelte';
import { mockEmails, mockConversations, resetMocks } from '../__mocks__/tauri.js';

// Mock Tauri
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

import { invoke } from '@tauri-apps/api/core';

describe('Email App Integration', () => {
  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true
    });
  });

  describe('Authentication Flow', () => {
    it('shows authentication section when not authenticated', async () => {
      invoke.mockResolvedValue(false); // Not authenticated

      render(EmailApp);

      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      });
    });

    it('shows email list when authenticated', async () => {
      // Mock authentication success and email loading
      invoke
        .mockResolvedValueOnce(true) // get_auth_status
        .mockResolvedValueOnce(mockEmails) // load_emails
        .mockResolvedValueOnce({ totalCount: 100, unreadCount: 5 }); // get_email_stats

      render(EmailApp);

      await waitFor(() => {
        expect(screen.getByText('Test Email 1')).toBeInTheDocument();
        expect(screen.getByText('Test Email 2')).toBeInTheDocument();
      });
    });
  });

  describe('Email Management Flow', () => {
    beforeEach(async () => {
      // Setup authenticated state with emails
      invoke
        .mockResolvedValueOnce(true) // get_auth_status
        .mockResolvedValueOnce(mockEmails) // load_emails
        .mockResolvedValueOnce({ totalCount: 100, unreadCount: 5 }); // get_email_stats
    });

    it('marks email as read', async () => {
      render(EmailApp);

      // Wait for emails to load
      await waitFor(() => {
        expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      });

      // Mock mark as read
      invoke.mockResolvedValueOnce({});

      const markAsReadButton = screen.getByTitle('Mark as read');
      await fireEvent.click(markAsReadButton);

      expect(invoke).toHaveBeenCalledWith('mark_email_as_read', { messageId: 'email1' });
    });

    it('displays email content when email is selected', async () => {
      render(EmailApp);

      // Wait for emails to load
      await waitFor(() => {
        expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      });

      // Mock get email content
      const fullEmail = {
        ...mockEmails[0],
        body_html: '<p>Full email content</p>'
      };
      invoke.mockResolvedValueOnce(fullEmail);

      // Click on email
      const emailElement = screen.getByText('Test Email 1').closest('div');
      await fireEvent.click(emailElement);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith('get_email_content', { messageId: 'email1' });
      });
    });
  });

  describe('View Mode Switching', () => {
    beforeEach(async () => {
      // Setup authenticated state
      invoke
        .mockResolvedValueOnce(true) // get_auth_status
        .mockResolvedValueOnce(mockEmails) // load_emails
        .mockResolvedValueOnce({ totalCount: 100, unreadCount: 5 }); // get_email_stats
    });

    it('switches from emails to conversations view', async () => {
      render(EmailApp);

      await waitFor(() => {
        expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      });

      // Mock conversation loading
      invoke.mockResolvedValueOnce(mockConversations);

      // Click view mode toggle
      const toggleButton = screen.getByText(/conversations/i);
      await fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith('get_conversations');
      });
    });
  });

  describe('Settings Management', () => {
    beforeEach(async () => {
      // Setup authenticated state
      invoke
        .mockResolvedValueOnce(true) // get_auth_status
        .mockResolvedValueOnce(mockEmails) // load_emails
        .mockResolvedValueOnce({ totalCount: 100, unreadCount: 5 }); // get_email_stats
    });

    it('opens settings panel', async () => {
      render(EmailApp);

      await waitFor(() => {
        expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      });

      // Click settings button
      const settingsButton = screen.getByLabelText(/settings/i);
      await fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText(/auto-check emails/i)).toBeInTheDocument();
      });
    });

    it('saves settings to localStorage', async () => {
      render(EmailApp);

      await waitFor(() => {
        expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      });

      // Open settings
      const settingsButton = screen.getByLabelText(/settings/i);
      await fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText(/auto-check emails/i)).toBeInTheDocument();
      });

      // Toggle auto-polling
      const checkbox = screen.getByRole('checkbox');
      await fireEvent.click(checkbox);

      // Should save to localStorage
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'autoPollingEnabled', 
        'true'
      );
    });
  });

  describe('Error Handling', () => {
    it('handles authentication failure gracefully', async () => {
      invoke.mockRejectedValue(new Error('Auth failed'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(EmailApp);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error checking auth status:', 
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('handles email loading failure gracefully', async () => {
      invoke
        .mockResolvedValueOnce(true) // get_auth_status
        .mockRejectedValueOnce(new Error('Email loading failed')); // load_emails

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(EmailApp);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Auto-polling Functionality', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      
      // Setup authenticated state
      invoke
        .mockResolvedValueOnce(true) // get_auth_status
        .mockResolvedValueOnce(mockEmails) // load_emails
        .mockResolvedValueOnce({ totalCount: 100, unreadCount: 5 }); // get_email_stats
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('starts auto-polling when enabled', async () => {
      // Mock localStorage to return enabled auto-polling
      window.localStorage.getItem.mockImplementation((key) => {
        if (key === 'autoPollingEnabled') return 'true';
        if (key === 'pollingIntervalSeconds') return '30';
        return null;
      });

      render(EmailApp);

      await waitFor(() => {
        expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      });

      // Mock check for new emails
      invoke.mockResolvedValue([]);

      // Fast-forward time to trigger polling
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith('check_for_new_emails');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(async () => {
      // Setup authenticated state with email selected
      invoke
        .mockResolvedValueOnce(true) // get_auth_status
        .mockResolvedValueOnce(mockEmails) // load_emails
        .mockResolvedValueOnce({ totalCount: 100, unreadCount: 5 }) // get_email_stats
        .mockResolvedValueOnce({ ...mockEmails[0], body_html: '<p>Content</p>' }); // get_email_content
    });

    it('handles ESC key to go back to inbox', async () => {
      render(EmailApp);

      // Wait for emails to load and select one
      await waitFor(() => {
        expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      });

      const emailElement = screen.getByText('Test Email 1').closest('div');
      await fireEvent.click(emailElement);

      // Wait for email view
      await waitFor(() => {
        expect(screen.getByText('Test Email Subject')).toBeInTheDocument();
      });

      // Press ESC key
      await fireEvent.keyDown(document, { key: 'Escape' });

      // Should go back to inbox
      await waitFor(() => {
        expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      });
    });
  });
});
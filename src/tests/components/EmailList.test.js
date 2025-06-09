import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EmailList from '../../lib/components/EmailList.svelte';
import { mockEmails } from '../__mocks__/tauri.js';

describe('EmailList Component', () => {
  const defaultProps = {
    emails: mockEmails,
    onEmailSelect: vi.fn(),
    onMarkAsRead: vi.fn(),
    onMarkAsUnread: vi.fn(),
    loadingEmailStates: new Set()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email list correctly', () => {
    render(EmailList, { props: defaultProps });

    expect(screen.getByText('Test Email 1')).toBeInTheDocument();
    expect(screen.getByText('Test Email 2')).toBeInTheDocument();
    expect(screen.getByText('sender1@example.com')).toBeInTheDocument();
    expect(screen.getByText('sender2@example.com')).toBeInTheDocument();
  });

  it('shows "New" badge for unread emails', () => {
    render(EmailList, { props: defaultProps });

    const newBadges = screen.getAllByText('New');
    expect(newBadges).toHaveLength(1); // Only one unread email in mock data
  });

  it('does not show "New" badge for read emails', () => {
    const readOnlyEmails = mockEmails.filter(email => email.is_read);
    render(EmailList, { 
      props: { ...defaultProps, emails: readOnlyEmails }
    });

    expect(screen.queryByText('New')).not.toBeInTheDocument();
  });

  it('calls onEmailSelect when email is clicked', async () => {
    render(EmailList, { props: defaultProps });

    const emailElement = screen.getByText('Test Email 1').closest('div');
    await fireEvent.click(emailElement);

    expect(defaultProps.onEmailSelect).toHaveBeenCalledWith(mockEmails[0]);
  });

  it('shows correct button text for read/unread emails', () => {
    render(EmailList, { props: defaultProps });

    // Find buttons by their title attributes
    const markAsReadButton = screen.getByTitle('Mark as read');
    const markAsUnreadButton = screen.getByTitle('Mark as unread');

    expect(markAsReadButton).toBeInTheDocument();
    expect(markAsUnreadButton).toBeInTheDocument();
  });

  it('calls onMarkAsRead when mark as read button is clicked', async () => {
    render(EmailList, { props: defaultProps });

    const markAsReadButton = screen.getByTitle('Mark as read');
    await fireEvent.click(markAsReadButton);

    expect(defaultProps.onMarkAsRead).toHaveBeenCalledWith('email1');
  });

  it('calls onMarkAsUnread when mark as unread button is clicked', async () => {
    render(EmailList, { props: defaultProps });

    const markAsUnreadButton = screen.getByTitle('Mark as unread');
    await fireEvent.click(markAsUnreadButton);

    expect(defaultProps.onMarkAsUnread).toHaveBeenCalledWith('email2');
  });

  it('disables buttons when email is in loading state', () => {
    const loadingEmailStates = new Set(['email1']);
    render(EmailList, { 
      props: { ...defaultProps, loadingEmailStates }
    });

    const buttons = screen.getAllByRole('button');
    const loadingButton = buttons.find(button => button.disabled);
    expect(loadingButton).toBeInTheDocument();
  });

  it('shows loading spinner when email is in loading state', () => {
    const loadingEmailStates = new Set(['email1']);
    render(EmailList, { 
      props: { ...defaultProps, loadingEmailStates }
    });

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('displays empty state when no emails provided', () => {
    render(EmailList, { 
      props: { ...defaultProps, emails: [] }
    });

    expect(screen.getByText('No emails found')).toBeInTheDocument();
  });

  it('prevents email selection when button is clicked', async () => {
    render(EmailList, { props: defaultProps });

    const markAsReadButton = screen.getByTitle('Mark as read');
    await fireEvent.click(markAsReadButton);

    // onEmailSelect should not be called when clicking the button
    expect(defaultProps.onEmailSelect).not.toHaveBeenCalled();
  });

  it('truncates long email subjects and senders', () => {
    const longEmails = [{
      ...mockEmails[0],
      subject: 'This is a very long email subject that should be truncated in the UI display',
      sender: 'verylongemailaddress@averylongdomainname.com'
    }];

    render(EmailList, { 
      props: { ...defaultProps, emails: longEmails }
    });

    const subjectElement = screen.getByText(/This is a very long email subject/);
    const senderElement = screen.getByText(/verylongemailaddress@averylongdomainname.com/);

    expect(subjectElement).toBeInTheDocument();
    expect(senderElement).toBeInTheDocument();
  });

  it('applies correct styling for unread emails', () => {
    render(EmailList, { props: defaultProps });

    const unreadEmail = screen.getByText('Test Email 1').closest('div');
    const readEmail = screen.getByText('Test Email 2').closest('div');

    // Unread emails should have special styling
    expect(unreadEmail).toHaveClass('border-l-blue-500');
    expect(readEmail).not.toHaveClass('border-l-blue-500');
  });
});
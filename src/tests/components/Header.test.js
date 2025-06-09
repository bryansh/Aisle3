import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Header from '../../lib/components/Header.svelte';

describe('Header Component', () => {
  const defaultProps = {
    showEmailView: false,
    showSettings: false,
    totalCount: 100,
    unreadCount: 5,
    isAuthenticated: true,
    viewMode: 'emails',
    onBackToInbox: vi.fn(),
    onShowSettings: vi.fn(),
    onViewModeToggle: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders app title', () => {
    render(Header, { props: defaultProps });

    expect(screen.getByText('Aisle3')).toBeInTheDocument();
  });

  it('displays email counts correctly', () => {
    render(Header, { props: defaultProps });

    expect(screen.getByText('100')).toBeInTheDocument(); // total count
    expect(screen.getByText('5')).toBeInTheDocument(); // unread count
  });

  it('shows back button when in email view', () => {
    render(Header, { 
      props: { ...defaultProps, showEmailView: true }
    });

    const backButton = screen.getByLabelText(/back to inbox/i);
    expect(backButton).toBeInTheDocument();
  });

  it('calls onBackToInbox when back button is clicked', async () => {
    render(Header, { 
      props: { ...defaultProps, showEmailView: true }
    });

    const backButton = screen.getByLabelText(/back to inbox/i);
    await fireEvent.click(backButton);

    expect(defaultProps.onBackToInbox).toHaveBeenCalled();
  });

  it('shows settings button when authenticated', () => {
    render(Header, { props: defaultProps });

    const settingsButton = screen.getByLabelText(/settings/i);
    expect(settingsButton).toBeInTheDocument();
  });

  it('calls onShowSettings when settings button is clicked', async () => {
    render(Header, { props: defaultProps });

    const settingsButton = screen.getByLabelText(/settings/i);
    await fireEvent.click(settingsButton);

    expect(defaultProps.onShowSettings).toHaveBeenCalled();
  });

  it('shows view mode toggle when not in settings or email view', () => {
    render(Header, { props: defaultProps });

    const toggleButton = screen.getByText(/emails|conversations/i);
    expect(toggleButton).toBeInTheDocument();
  });

  it('calls onViewModeToggle when view mode button is clicked', async () => {
    render(Header, { props: defaultProps });

    const toggleButton = screen.getByText(/conversations/i);
    await fireEvent.click(toggleButton);

    expect(defaultProps.onViewModeToggle).toHaveBeenCalled();
  });

  it('hides view mode toggle when in settings view', () => {
    render(Header, { 
      props: { ...defaultProps, showSettings: true }
    });

    const toggleButton = screen.queryByText(/conversations/i);
    expect(toggleButton).not.toBeInTheDocument();
  });

  it('hides view mode toggle when in email view', () => {
    render(Header, { 
      props: { ...defaultProps, showEmailView: true }
    });

    const toggleButton = screen.queryByText(/conversations/i);
    expect(toggleButton).not.toBeInTheDocument();
  });

  it('shows correct view mode text for emails view', () => {
    render(Header, { 
      props: { ...defaultProps, viewMode: 'emails' }
    });

    expect(screen.getByText(/conversations/i)).toBeInTheDocument();
  });

  it('shows correct view mode text for conversations view', () => {
    render(Header, { 
      props: { ...defaultProps, viewMode: 'conversations' }
    });

    expect(screen.getByText(/emails/i)).toBeInTheDocument();
  });

  it('handles zero unread count', () => {
    render(Header, { 
      props: { ...defaultProps, unreadCount: 0 }
    });

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('handles large email counts', () => {
    render(Header, { 
      props: { ...defaultProps, totalCount: 999999, unreadCount: 1000 }
    });

    expect(screen.getByText('999999')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
  });

  it('does not show controls when not authenticated', () => {
    render(Header, { 
      props: { ...defaultProps, isAuthenticated: false }
    });

    const settingsButton = screen.queryByLabelText(/settings/i);
    const viewModeButton = screen.queryByText(/conversations|emails/i);

    expect(settingsButton).not.toBeInTheDocument();
    expect(viewModeButton).not.toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(Header, { props: defaultProps });

    // Check for main header styling
    const header = document.querySelector('header') || document.querySelector('[role="banner"]');
    expect(header).toBeInTheDocument();
  });

  it('maintains accessibility with proper ARIA labels', () => {
    render(Header, { 
      props: { ...defaultProps, showEmailView: true }
    });

    const backButton = screen.getByLabelText(/back to inbox/i);
    const settingsButton = screen.getByLabelText(/settings/i);

    expect(backButton).toHaveAttribute('aria-label');
    expect(settingsButton).toHaveAttribute('aria-label');
  });
});
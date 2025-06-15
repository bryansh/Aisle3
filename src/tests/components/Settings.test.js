import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Settings from '../../lib/components/Settings.svelte';

describe('Settings Component', () => {
  const defaultProps = {
    autoPollingEnabled: false,
    pollingInterval: 30,
    autoMarkReadEnabled: false,
    autoMarkReadDelay: 1500,
    osNotificationsEnabled: true,
    inAppNotificationsEnabled: true,
    onToggleAutoPolling: vi.fn(),
    onIntervalChanged: vi.fn(),
    onToggleAutoMarkRead: vi.fn(),
    onAutoMarkReadDelayChanged: vi.fn(),
    onNotificationSettingsChanged: vi.fn(),
    onCheckNow: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings title', () => {
    render(Settings, { props: defaultProps });

    expect(screen.getByText('⚙️ Settings')).toBeInTheDocument();
  });

  it('renders auto-polling toggle', () => {
    render(Settings, { props: defaultProps });

    const checkbox = screen.getByLabelText('Automatic email checking');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('shows checked state when auto-polling is enabled', () => {
    render(Settings, { 
      props: { ...defaultProps, autoPollingEnabled: true }
    });

    const checkbox = screen.getByLabelText('Automatic email checking');
    expect(checkbox).toBeChecked();
  });

  it('calls onToggleAutoPolling when checkbox is clicked', async () => {
    render(Settings, { props: defaultProps });

    const checkbox = screen.getByLabelText('Automatic email checking');
    await fireEvent.click(checkbox);

    expect(defaultProps.onToggleAutoPolling).toHaveBeenCalled();
  });

  it('renders polling interval dropdown when auto-polling is enabled', () => {
    render(Settings, { 
      props: { ...defaultProps, autoPollingEnabled: true }
    });

    const select = screen.getByLabelText('Check frequency');
    expect(select).toBeInTheDocument();
  });

  it('shows correct polling interval value', () => {
    render(Settings, { 
      props: { ...defaultProps, autoPollingEnabled: true, pollingInterval: 60 }
    });

    const select = screen.getByLabelText('Check frequency');
    expect(select.value).toBe('60');
  });

  it('calls onIntervalChanged when interval is changed', async () => {
    render(Settings, { 
      props: { ...defaultProps, autoPollingEnabled: true }
    });

    const select = screen.getByLabelText('Check frequency');
    await fireEvent.change(select, { target: { value: '60' } });

    expect(defaultProps.onIntervalChanged).toHaveBeenCalled();
  });

  it('renders check now button', () => {
    render(Settings, { props: defaultProps });

    const buttons = screen.getAllByText(/check now/i);
    expect(buttons.length).toBeGreaterThan(0);
    // Look for the purple email check button specifically
    const emailCheckButton = buttons.find(button => 
      button.closest('button')?.classList.contains('bg-purple-600')
    );
    expect(emailCheckButton).toBeInTheDocument();
  });

  it('calls onCheckNow when check now button is clicked', async () => {
    render(Settings, { props: defaultProps });

    const buttons = screen.getAllByText(/check now/i);
    // Look for the purple email check button specifically
    const emailCheckButton = buttons.find(button => 
      button.closest('button')?.classList.contains('bg-purple-600')
    );
    await fireEvent.click(emailCheckButton);

    expect(defaultProps.onCheckNow).toHaveBeenCalled();
  });

  it('displays all available polling intervals', () => {
    render(Settings, { 
      props: { ...defaultProps, autoPollingEnabled: true }
    });

    const select = screen.getByLabelText('Check frequency');
    const options = select.querySelectorAll('option');

    // Should have 5 interval options: 15s, 30s, 1m, 2m, 5m
    expect(options.length).toBe(5);
    expect(options[0]).toHaveTextContent('15 seconds');
    expect(options[2]).toHaveTextContent('1 minute');
  });

  it('shows appropriate labels for all controls', () => {
    render(Settings, { props: defaultProps });

    expect(screen.getByText('Automatic email checking')).toBeInTheDocument();
    expect(screen.getByText('📧 Real-time Updates')).toBeInTheDocument();
  });

  it('handles disabled state for auto-polling', () => {
    render(Settings, { 
      props: { ...defaultProps, autoPollingEnabled: false }
    });

    const checkbox = screen.getByLabelText('Automatic email checking');
    expect(checkbox).not.toBeChecked();
  });

  it('does not show polling interval dropdown when auto-polling is disabled', () => {
    render(Settings, { 
      props: { ...defaultProps, autoPollingEnabled: false }
    });

    const select = screen.queryByLabelText('Check frequency');
    expect(select).not.toBeInTheDocument();
  });

  describe('Notification Settings', () => {
    it('renders OS notifications toggle', () => {
      render(Settings, { props: defaultProps });

      const checkbox = screen.getByLabelText('System notifications');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked(); // Default is true
    });

    it('renders in-app notifications toggle', () => {
      render(Settings, { props: defaultProps });

      const checkbox = screen.getByLabelText('In-app notifications');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked(); // Default is true
    });

    it('shows correct state for OS notifications when disabled', () => {
      render(Settings, { 
        props: { ...defaultProps, osNotificationsEnabled: false }
      });

      const checkbox = screen.getByLabelText('System notifications');
      expect(checkbox).not.toBeChecked();
    });

    it('shows correct state for in-app notifications when disabled', () => {
      render(Settings, { 
        props: { ...defaultProps, inAppNotificationsEnabled: false }
      });

      const checkbox = screen.getByLabelText('In-app notifications');
      expect(checkbox).not.toBeChecked();
    });

    it('calls onNotificationSettingsChanged when OS notifications toggle is clicked', async () => {
      render(Settings, { props: defaultProps });

      const checkbox = screen.getByLabelText('System notifications');
      await fireEvent.click(checkbox);

      expect(defaultProps.onNotificationSettingsChanged).toHaveBeenCalled();
    });

    it('calls onNotificationSettingsChanged when in-app notifications toggle is clicked', async () => {
      render(Settings, { props: defaultProps });

      const checkbox = screen.getByLabelText('In-app notifications');
      await fireEvent.click(checkbox);

      expect(defaultProps.onNotificationSettingsChanged).toHaveBeenCalled();
    });

    it('shows fallback help text when OS notifications are enabled', () => {
      render(Settings, { 
        props: { ...defaultProps, osNotificationsEnabled: true }
      });

      expect(screen.getByText(/fallback when system notifications fail/)).toBeInTheDocument();
    });

    it('shows primary help text when OS notifications are disabled', () => {
      render(Settings, { 
        props: { ...defaultProps, osNotificationsEnabled: false }
      });

      expect(screen.getByText(/since system notifications are disabled/)).toBeInTheDocument();
    });

    it('renders notification section header', () => {
      render(Settings, { props: defaultProps });

      expect(screen.getByText('🔔 Notifications')).toBeInTheDocument();
    });

    it('displays notification info text', () => {
      render(Settings, { props: defaultProps });

      expect(screen.getByText(/Email notifications appear when new messages arrive/)).toBeInTheDocument();
      expect(screen.getByText(/System notifications work even when the app is minimized/)).toBeInTheDocument();
    });

    it('handles multiple notification setting combinations', () => {
      const combinations = [
        { osNotificationsEnabled: true, inAppNotificationsEnabled: true },
        { osNotificationsEnabled: true, inAppNotificationsEnabled: false },
        { osNotificationsEnabled: false, inAppNotificationsEnabled: true },
        { osNotificationsEnabled: false, inAppNotificationsEnabled: false }
      ];

      combinations.forEach(({ osNotificationsEnabled, inAppNotificationsEnabled }) => {
        const { unmount } = render(Settings, { 
          props: { 
            ...defaultProps, 
            osNotificationsEnabled, 
            inAppNotificationsEnabled 
          }
        });

        const osCheckbox = screen.getByLabelText('System notifications');
        const inAppCheckbox = screen.getByLabelText('In-app notifications');

        expect(osCheckbox.checked).toBe(osNotificationsEnabled);
        expect(inAppCheckbox.checked).toBe(inAppNotificationsEnabled);

        unmount();
      });
    });
  });
});
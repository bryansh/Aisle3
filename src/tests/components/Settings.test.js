import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Settings from '../../lib/components/Settings.svelte';

describe('Settings Component', () => {
  const defaultProps = {
    autoPollingEnabled: false,
    pollingInterval: 30,
    autoMarkReadEnabled: false,
    autoMarkReadDelay: 1500,
    onToggleAutoPolling: vi.fn(),
    onIntervalChanged: vi.fn(),
    onToggleAutoMarkRead: vi.fn(),
    onAutoMarkReadDelayChanged: vi.fn(),
    onCheckNow: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings title', () => {
    render(Settings, { props: defaultProps });

    expect(screen.getByText('📧 Email Settings')).toBeInTheDocument();
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

    const button = screen.getByText(/check now/i);
    expect(button).toBeInTheDocument();
  });

  it('calls onCheckNow when check now button is clicked', async () => {
    render(Settings, { props: defaultProps });

    const button = screen.getByText(/check now/i);
    await fireEvent.click(button);

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
    expect(screen.getByText('Real-time Updates')).toBeInTheDocument();
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
});
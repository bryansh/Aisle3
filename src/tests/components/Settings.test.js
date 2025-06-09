import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Settings from '../../lib/components/Settings.svelte';

describe('Settings Component', () => {
  const defaultProps = {
    autoPollingEnabled: false,
    pollingInterval: 30,
    onToggleAutoPolling: vi.fn(),
    onIntervalChanged: vi.fn(),
    onCheckNow: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings title', () => {
    render(Settings, { props: defaultProps });

    expect(screen.getByText(/settings/i)).toBeInTheDocument();
  });

  it('renders auto-polling toggle', () => {
    render(Settings, { props: defaultProps });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('shows checked state when auto-polling is enabled', () => {
    render(Settings, { 
      props: { ...defaultProps, autoPollingEnabled: true }
    });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('calls onToggleAutoPolling when checkbox is clicked', async () => {
    render(Settings, { props: defaultProps });

    const checkbox = screen.getByRole('checkbox');
    await fireEvent.click(checkbox);

    expect(defaultProps.onToggleAutoPolling).toHaveBeenCalled();
  });

  it('renders polling interval dropdown', () => {
    render(Settings, { props: defaultProps });

    const select = screen.getByDisplayValue('30 seconds');
    expect(select).toBeInTheDocument();
  });

  it('shows correct polling interval value', () => {
    render(Settings, { 
      props: { ...defaultProps, pollingInterval: 60 }
    });

    const select = screen.getByDisplayValue('1 minute');
    expect(select).toBeInTheDocument();
  });

  it('calls onIntervalChanged when interval is changed', async () => {
    render(Settings, { props: defaultProps });

    const select = screen.getByDisplayValue('30 seconds');
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
    render(Settings, { props: defaultProps });

    const select = screen.getByDisplayValue('30 seconds');
    const options = select.querySelectorAll('option');

    // Should have options for different intervals
    expect(options.length).toBeGreaterThan(1);
  });

  it('shows appropriate labels for all controls', () => {
    render(Settings, { props: defaultProps });

    expect(screen.getByText(/auto-check emails/i)).toBeInTheDocument();
    expect(screen.getByText(/check frequency/i)).toBeInTheDocument();
  });

  it('handles disabled state for auto-polling', () => {
    render(Settings, { 
      props: { ...defaultProps, autoPollingEnabled: false }
    });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('updates interval display when prop changes', () => {
    const { component } = render(Settings, { props: defaultProps });

    // Change the polling interval prop
    component.$set({ pollingInterval: 120 });

    const select = screen.getByDisplayValue('2 minutes');
    expect(select).toBeInTheDocument();
  });

  it('maintains form accessibility', () => {
    render(Settings, { props: defaultProps });

    const checkbox = screen.getByRole('checkbox');
    const select = screen.getByRole('combobox');
    const button = screen.getByRole('button');

    expect(checkbox).toBeInTheDocument();
    expect(select).toBeInTheDocument();  
    expect(button).toBeInTheDocument();
  });

  it('handles rapid clicking gracefully', async () => {
    render(Settings, { props: defaultProps });

    const button = screen.getByText(/check now/i);
    
    // Click rapidly multiple times
    await fireEvent.click(button);
    await fireEvent.click(button);
    await fireEvent.click(button);

    expect(defaultProps.onCheckNow).toHaveBeenCalledTimes(3);
  });

  it('shows proper styling for settings panel', () => {
    render(Settings, { props: defaultProps });

    // Check that settings container has appropriate styling
    const settingsContainer = document.querySelector('.bg-white, .p-6, .rounded-lg');
    expect(settingsContainer).toBeInTheDocument();
  });

  it('handles edge case polling intervals', () => {
    const extremeProps = {
      ...defaultProps,
      pollingInterval: 1 // Very short interval
    };

    render(Settings, { props: extremeProps });

    // Should handle edge case gracefully
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });
});
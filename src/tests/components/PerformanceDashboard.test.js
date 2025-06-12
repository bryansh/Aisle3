import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';

vi.mock('../../lib/utils/performance.js', () => {
  return {
    performanceSuite: {
      startMonitoring: vi.fn(),
      stopMonitoring: vi.fn(),
      getPerformanceReport: vi.fn(),
      performanceMonitor: {
        clearMeasurements: vi.fn()
      },
      isRunning: false
    }
  };
});

// Import component after mocking
import PerformanceDashboard from '../../lib/components/PerformanceDashboard.svelte';

describe('PerformanceDashboard', () => {
  let mockProps;
  let defaultPerformanceData;

  beforeEach(async () => {
    const { performanceSuite } = await import('../../lib/utils/performance.js');
    
    mockProps = {
      visible: true,
      onClose: vi.fn()
    };

    defaultPerformanceData = {
      memory: {
        used: 25.5,
        total: 50.0,
        limit: 100.0
      },
      rendering: {
        fps: 60,
        avgFrameTime: 16.7,
        frameCount: 1800
      },
      interactions: {
        totalInteractions: 25,
        avgTimeBetween: 150.5,
        interactionTypes: {
          click: 10,
          scroll: 8,
          keydown: 7
        }
      },
      measurements: {
        'email-list-render': {
          count: 5,
          avg: 85.2,
          min: 65.1,
          max: 120.8,
          total: 426.0
        }
      },
      isMonitoring: true
    };

    performanceSuite.getPerformanceReport.mockReturnValue(defaultPerformanceData);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when not visible', () => {
    render(PerformanceDashboard, {
      ...mockProps,
      visible: false
    });

    expect(screen.queryByText('Performance Dashboard')).not.toBeInTheDocument();
  });

  it('should render dashboard when visible', () => {
    render(PerformanceDashboard, mockProps);

    expect(screen.getByText('Performance Dashboard')).toBeInTheDocument();
  });

  it('should display monitoring status badge', () => {
    render(PerformanceDashboard, mockProps);

    expect(screen.getByText('Monitoring')).toBeInTheDocument();
  });

  it('should display stopped status when not monitoring', async () => {
    const { performanceSuite } = await import('../../lib/utils/performance.js');
    
    performanceSuite.getPerformanceReport.mockReturnValue({
      ...defaultPerformanceData,
      isMonitoring: false
    });

    render(PerformanceDashboard, mockProps);

    expect(screen.getByText('Stopped')).toBeInTheDocument();
  });

  it('should display memory usage correctly', () => {
    render(PerformanceDashboard, mockProps);

    expect(screen.getByText('25.5 MB')).toBeInTheDocument(); // Used memory
    expect(screen.getByText('50.0 MB')).toBeInTheDocument(); // Total memory
    expect(screen.getByText('100.0 MB')).toBeInTheDocument(); // Memory limit
  });

  it('should display rendering performance metrics', () => {
    render(PerformanceDashboard, mockProps);

    expect(screen.getByText('60')).toBeInTheDocument(); // FPS
    expect(screen.getByText('16.7 ms')).toBeInTheDocument(); // Avg frame time
    expect(screen.getByText('1800')).toBeInTheDocument(); // Frame count
  });

  it('should display interaction statistics', () => {
    render(PerformanceDashboard, mockProps);

    expect(screen.getByText('25')).toBeInTheDocument(); // Total interactions
    expect(screen.getByText('150.5 ms')).toBeInTheDocument(); // Avg time between
  });

  it('should display interaction types as badges', () => {
    render(PerformanceDashboard, mockProps);

    expect(screen.getByText('click: 10')).toBeInTheDocument();
    expect(screen.getByText('scroll: 8')).toBeInTheDocument();
    expect(screen.getByText('keydown: 7')).toBeInTheDocument();
  });

  it('should display performance measurements table', () => {
    render(PerformanceDashboard, mockProps);

    expect(screen.getByText('email-list-render')).toBeInTheDocument();
    expect(screen.getByText('85.2 ms')).toBeInTheDocument(); // Average
    expect(screen.getByText('65.1 ms')).toBeInTheDocument(); // Min
    expect(screen.getByText('120.8 ms')).toBeInTheDocument(); // Max
  });

  it('should show performance status badges', () => {
    render(PerformanceDashboard, mockProps);

    // With avg of 85.2ms, should show "Fast" (< 100ms)
    expect(screen.getByText('Fast')).toBeInTheDocument();
  });

  it('should show FPS performance status', () => {
    render(PerformanceDashboard, mockProps);

    expect(screen.getByText('Excellent')).toBeInTheDocument(); // For 60 FPS
  });

  it('should handle missing performance data gracefully', async () => {
    const { performanceSuite } = await import('../../lib/utils/performance.js');
    
    performanceSuite.getPerformanceReport.mockReturnValue({
      memory: {},
      rendering: {},
      interactions: {},
      measurements: {},
      isMonitoring: false
    });

    render(PerformanceDashboard, mockProps);

    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBeGreaterThan(0);
  });

  it('should call onClose when close button is clicked', async () => {
    render(PerformanceDashboard, mockProps);

    const closeButton = screen.getByText('Close');
    await fireEvent.click(closeButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should clear performance data when clear button is clicked', async () => {
    const { performanceSuite } = await import('../../lib/utils/performance.js');
    
    render(PerformanceDashboard, mockProps);

    const clearButton = screen.getByText('Clear Data');
    await fireEvent.click(clearButton);

    expect(performanceSuite.performanceMonitor.clearMeasurements).toHaveBeenCalled();
  });

  it('should display performance tips', () => {
    render(PerformanceDashboard, mockProps);

    expect(screen.getByText('Performance Tips')).toBeInTheDocument();
    expect(screen.getByText(/Virtual scrolling is automatically enabled/)).toBeInTheDocument();
    expect(screen.getByText(/Images are lazy-loaded/)).toBeInTheDocument();
    expect(screen.getByText(/Email operations are batched/)).toBeInTheDocument();
    expect(screen.getByText(/Memory usage is monitored/)).toBeInTheDocument();
  });

  it('should show empty state for measurements when none exist', async () => {
    const { performanceSuite } = await import('../../lib/utils/performance.js');
    
    performanceSuite.getPerformanceReport.mockReturnValue({
      memory: {},
      rendering: {},
      interactions: {},
      measurements: {},
      isMonitoring: true
    });

    render(PerformanceDashboard, mockProps);

    expect(screen.getByText('No performance measurements available')).toBeInTheDocument();
  });

  it('should handle different performance thresholds', async () => {
    const { performanceSuite } = await import('../../lib/utils/performance.js');
    
    // Test slow performance
    performanceSuite.getPerformanceReport.mockReturnValue({
      memory: {},
      rendering: {
        fps: 30, // Poor performance
        avgFrameTime: 33.3,
        frameCount: 900
      },
      interactions: {},
      measurements: {
        'slow-operation': {
          count: 1,
          avg: 800, // Slow operation
          min: 800,
          max: 800,
          total: 800
        }
      },
      isMonitoring: true
    });

    render(PerformanceDashboard, mockProps);

    expect(screen.getByText('Poor')).toBeInTheDocument(); // FPS status
    expect(screen.getByText('Slow')).toBeInTheDocument(); // Operation status
  });
});
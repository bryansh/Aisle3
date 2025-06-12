import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PerformanceMonitor,
  MemoryMonitor,
  RenderMonitor,
  InteractionMonitor,
  PerformanceSuite,
  performanceSuite,
  startMeasure,
  endMeasure,
  getMemoryUsage,
  getPerformanceReport
} from '../../lib/utils/performance.js';

// Mock performance API
const mockPerformance = {
  now: vi.fn(),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(),
  memory: {
    usedJSHeapSize: 25000000,
    totalJSHeapSize: 50000000,
    jsHeapSizeLimit: 100000000
  }
};

global.performance = mockPerformance;
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.PerformanceObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn()
}));

describe('PerformanceMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    mockPerformance.now.mockReturnValue(1000);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should start and end measurements', () => {
    mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1100);
    mockPerformance.getEntriesByName.mockReturnValue([{ duration: 100 }]);

    monitor.startMeasurement('test-operation');
    monitor.endMeasurement('test-operation');

    expect(mockPerformance.mark).toHaveBeenCalledWith('test-operation-start');
    expect(mockPerformance.mark).toHaveBeenCalledWith('test-operation-end');
    expect(mockPerformance.measure).toHaveBeenCalledWith('test-operation', 'test-operation-start', 'test-operation-end');
  });

  it('should return measurement result', () => {
    mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1150);

    monitor.startMeasurement('test-operation', { type: 'render' });
    const result = monitor.endMeasurement('test-operation');

    expect(result).toEqual({
      name: 'test-operation',
      duration: 150,
      startTime: 1000,
      endTime: 1150,
      metadata: { type: 'render' }
    });
  });

  it('should store multiple measurements', () => {
    mockPerformance.now
      .mockReturnValueOnce(1000).mockReturnValueOnce(1100)
      .mockReturnValueOnce(2000).mockReturnValueOnce(2200);

    monitor.startMeasurement('operation');
    monitor.endMeasurement('operation');
    monitor.startMeasurement('operation');
    monitor.endMeasurement('operation');

    const stats = monitor.getStats('operation');
    expect(stats.count).toBe(2);
    expect(stats.avg).toBe(150); // (100 + 200) / 2
  });

  it('should calculate statistics correctly', () => {
    mockPerformance.now
      .mockReturnValueOnce(1000).mockReturnValueOnce(1050)
      .mockReturnValueOnce(2000).mockReturnValueOnce(2100)
      .mockReturnValueOnce(3000).mockReturnValueOnce(3200);

    monitor.startMeasurement('stats-test');
    monitor.endMeasurement('stats-test');
    monitor.startMeasurement('stats-test');
    monitor.endMeasurement('stats-test');
    monitor.startMeasurement('stats-test');
    monitor.endMeasurement('stats-test');

    const stats = monitor.getStats('stats-test');
    expect(stats.count).toBe(3);
    expect(stats.min).toBe(50);
    expect(stats.max).toBe(200);
    expect(stats.avg).toBe(116.66666666666667); // (50 + 100 + 200) / 3
    expect(stats.total).toBe(350);
  });

  it('should return empty stats for non-existent measurement', () => {
    const stats = monitor.getStats('non-existent');
    expect(stats).toEqual({ count: 0, avg: 0, min: 0, max: 0, total: 0 });
  });

  it('should clear measurements', () => {
    monitor.startMeasurement('test');
    monitor.endMeasurement('test');
    
    monitor.clearMeasurements('test');
    const stats = monitor.getStats('test');
    expect(stats.count).toBe(0);
  });

  it('should handle measurement without start', () => {
    const result = monitor.endMeasurement('no-start');
    expect(result).toBeNull();
  });
});

describe('MemoryMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new MemoryMonitor();
  });

  it('should get memory usage when available', () => {
    const usage = monitor.getMemoryUsage();
    expect(usage).toEqual({
      usedJSHeapSize: 25000000,
      totalJSHeapSize: 50000000,
      jsHeapSizeLimit: 100000000
    });
  });

  it('should get memory usage in MB', () => {
    const usage = monitor.getMemoryUsageMB();
    expect(usage.used).toBeCloseTo(23.84); // 25000000 / 1024 / 1024
    expect(usage.total).toBeCloseTo(47.68);
    expect(usage.limit).toBeCloseTo(95.37);
  });

  it('should handle missing memory API', () => {
    const originalMemory = global.performance.memory;
    delete global.performance.memory;
    const usage = monitor.getMemoryUsage();
    expect(usage).toEqual({});
    global.performance.memory = originalMemory;
  });
});

describe('RenderMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new RenderMonitor();
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  it('should start and stop monitoring', () => {
    expect(monitor.isMonitoring).toBe(false);
    
    monitor.startMonitoring();
    expect(monitor.isMonitoring).toBe(true);
    
    monitor.stopMonitoring();
    expect(monitor.isMonitoring).toBe(false);
  });

  it('should calculate render stats', () => {
    monitor.renderTimes = [16.7, 16.5, 17.2, 16.8, 16.9];
    monitor.frameCount = 5;

    const stats = monitor.getStats();
    expect(stats.frameCount).toBe(5);
    expect(stats.avgFrameTime).toBeCloseTo(16.82);
    expect(stats.fps).toBe(59); // Math.round(1000 / 16.82)
  });

  it('should return zero stats when no frames', () => {
    const stats = monitor.getStats();
    expect(stats).toEqual({ fps: 0, avgFrameTime: 0, frameCount: 0 });
  });
});

describe('InteractionMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new InteractionMonitor();
    document.addEventListener = vi.fn();
    document.removeEventListener = vi.fn();
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  it('should start and stop monitoring', () => {
    monitor.startMonitoring();
    expect(monitor.isListening).toBe(true);
    expect(document.addEventListener).toHaveBeenCalledTimes(4); // click, scroll, keydown, touchstart

    monitor.stopMonitoring();
    expect(monitor.isListening).toBe(false);
    expect(document.removeEventListener).toHaveBeenCalledTimes(4);
  });

  it('should handle interaction events', () => {
    mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1500);

    monitor.handleInteraction({ type: 'click', target: { tagName: 'BUTTON' } });
    monitor.handleInteraction({ type: 'scroll', target: { tagName: 'DIV' } });

    const stats = monitor.getStats();
    expect(stats.totalInteractions).toBe(2);
    expect(stats.interactionTypes).toEqual({ click: 1, scroll: 1 });
    expect(stats.avgTimeBetween).toBe(500);
  });

  it('should limit stored interactions', () => {
    for (let i = 0; i < 60; i++) {
      monitor.handleInteraction({ type: 'click', target: { tagName: 'BUTTON' } });
    }

    expect(monitor.interactions).toHaveLength(50); // Should keep only last 50
  });
});

describe('PerformanceSuite', () => {
  let suite;

  beforeEach(() => {
    suite = new PerformanceSuite();
  });

  afterEach(() => {
    suite.stopMonitoring();
  });

  it('should start and stop comprehensive monitoring', () => {
    suite.startMonitoring();
    expect(suite.isRunning).toBe(true);

    suite.stopMonitoring();
    expect(suite.isRunning).toBe(false);
  });

  it('should generate performance report', () => {
    const report = suite.getPerformanceReport();
    
    expect(report).toHaveProperty('timestamp');
    expect(report).toHaveProperty('memory');
    expect(report).toHaveProperty('rendering');
    expect(report).toHaveProperty('interactions');
    expect(report).toHaveProperty('measurements');
    expect(report).toHaveProperty('isMonitoring');
  });

  it('should measure component render time', async () => {
    const renderFunction = vi.fn().mockResolvedValue('rendered');
    
    const result = await suite.measureComponentRender('TestComponent', renderFunction);
    
    expect(result).toBe('rendered');
    expect(renderFunction).toHaveBeenCalled();
  });

  it('should benchmark email list performance', async () => {
    const result = await suite.benchmarkEmailList(100, true);
    
    expect(result).toHaveProperty('emailCount', 100);
    expect(result).toHaveProperty('useVirtualization', true);
    expect(result).toHaveProperty('duration');
    expect(result).toHaveProperty('memoryDelta');
  });
});

describe('Helper functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start and end measurements via helpers', () => {
    mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1100);

    startMeasure('helper-test', { component: 'test' });
    const result = endMeasure('helper-test');

    expect(result).toHaveProperty('duration', 100);
    expect(result).toHaveProperty('metadata', { component: 'test' });
  });

  it('should get memory usage via helper', () => {
    const memory = getMemoryUsage();
    expect(memory).toBeInstanceOf(Object);
    // Memory may not be available in test environment
    if (memory.used !== undefined) {
      expect(memory).toHaveProperty('used');
      expect(memory).toHaveProperty('total');
      expect(memory).toHaveProperty('limit');
    }
  });

  it('should get performance report via helper', () => {
    const report = getPerformanceReport();
    expect(report).toHaveProperty('timestamp');
    expect(report).toHaveProperty('memory');
    expect(report).toHaveProperty('isMonitoring');
  });
});

describe('Global performance suite', () => {
  it('should export global instance', () => {
    expect(performanceSuite).toBeInstanceOf(PerformanceSuite);
  });
});
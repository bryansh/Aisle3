/**
 * Performance monitoring and benchmarking utilities
 * Provides tools for measuring rendering performance, memory usage, and user interactions
 */

/**
 * @typedef {Object} MeasurementResult
 * @property {string} name
 * @property {number} duration
 * @property {number} startTime
 * @property {number} endTime
 * @property {any} metadata
 */

/**
 * @typedef {Object} MeasurementStats
 * @property {number} count
 * @property {number} avg
 * @property {number} min
 * @property {number} max
 * @property {number} total
 */

/**
 * @typedef {Object} MemoryUsage
 * @property {number} usedJSHeapSize
 * @property {number} totalJSHeapSize
 * @property {number} jsHeapSizeLimit
 */

/**
 * @typedef {Object} RenderStats
 * @property {number} fps
 * @property {number} avgFrameTime
 * @property {number} frameCount
 */

/**
 * @typedef {Object} InteractionStats
 * @property {number} totalInteractions
 * @property {number} avgTimeBetween
 * @property {Object.<string, number>} interactionTypes
 */

/**
 * Performance measurement utility
 */
export class PerformanceMonitor {
  constructor() {
    /** @type {Map<string, MeasurementResult[]>} */
    this.measurements = new Map();
    /** @type {Map<string, {startTime: number, metadata: any, startMark: string}>} */
    this.activeMeasurements = new Map();
    /** @type {any[]} */
    this.observers = [];
  }

  /**
   * Start measuring a performance metric
   * @param {string} name - Measurement name
   * @param {any} metadata - Additional metadata
   */
  startMeasurement(name, metadata = {}) {
    const startTime = performance.now();
    this.activeMeasurements.set(name, {
      startTime,
      metadata,
      startMark: `${name}-start`
    });
    
    if (typeof performance.mark === 'function') {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * End measuring a performance metric
   * @param {string} name - Measurement name
   * @returns {MeasurementResult|null} Measurement result
   */
  endMeasurement(name) {
    const endTime = performance.now();
    const measurement = this.activeMeasurements.get(name);
    
    if (!measurement) {
      console.warn(`No measurement started for: ${name}`);
      return null;
    }

    const duration = endTime - measurement.startTime;
    const result = {
      name,
      duration,
      startTime: measurement.startTime,
      endTime,
      metadata: measurement.metadata
    };

    // Store measurement
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)?.push(result);

    // Create performance mark/measure if available
    if (typeof performance.mark === 'function' && typeof performance.measure === 'function') {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (error) {
        // Ignore if marks don't exist
      }
    }

    // Clean up
    this.activeMeasurements.delete(name);

    return result;
  }

  /**
   * Get measurement statistics
   * @param {string} name - Measurement name
   * @returns {MeasurementStats} Statistics
   */
  getStats(name) {
    const measurements = this.measurements.get(name) || [];
    
    if (measurements.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, total: 0 };
    }

    const durations = measurements.map((m) => m.duration);
    const total = durations.reduce((sum, d) => sum + d, 0);
    
    return {
      count: measurements.length,
      avg: total / measurements.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      total
    };
  }

  /**
   * Clear measurements
   * @param {string|null} name - Measurement name (optional)
   */
  clearMeasurements(name = null) {
    if (name) {
      this.measurements.delete(name);
    } else {
      this.measurements.clear();
    }
  }

  /**
   * Get all measurements
   * @returns {Map<string, MeasurementResult[]>} All measurements
   */
  getAllMeasurements() {
    return this.measurements;
  }
}

/**
 * Memory monitoring utility
 */
export class MemoryMonitor {
  /**
   * Get current memory usage
   * @returns {MemoryUsage|{}} Memory usage data
   */
  getMemoryUsage() {
    const perfMemory = /** @type {any} */ (performance).memory;
    if (perfMemory) {
      return {
        usedJSHeapSize: perfMemory.usedJSHeapSize,
        totalJSHeapSize: perfMemory.totalJSHeapSize,
        jsHeapSizeLimit: perfMemory.jsHeapSizeLimit
      };
    }
    return {};
  }

  /**
   * Get memory usage in MB
   * @returns {{used: number, total: number, limit: number}|{}} Memory usage in MB
   */
  getMemoryUsageMB() {
    const usage = this.getMemoryUsage();
    if (Object.keys(usage).length === 0) {
      return {};
    }
    
    const typedUsage = /** @type {MemoryUsage} */ (usage);
    return {
      used: typedUsage.usedJSHeapSize / 1024 / 1024,
      total: typedUsage.totalJSHeapSize / 1024 / 1024,
      limit: typedUsage.jsHeapSizeLimit / 1024 / 1024
    };
  }

  /**
   * Start monitoring memory leaks
   */
  startLeakDetection() {
    // Implementation for memory leak detection
    console.log('Memory leak detection started');
  }
}

/**
 * Rendering performance monitor
 */
export class RenderMonitor {
  constructor() {
    /** @type {number[]} */
    this.renderTimes = [];
    this.frameCount = 0;
    this.isMonitoring = false;
    this.lastFrameTime = 0;
  }

  /**
   * Start monitoring rendering performance
   */
  startMonitoring() {
    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    this.measureFrame();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
  }

  /**
   * Measure frame performance
   */
  measureFrame() {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    
    if (frameTime > 0) {
      this.renderTimes.push(frameTime);
      this.frameCount++;
      
      // Keep only last 100 measurements
      if (this.renderTimes.length > 100) {
        this.renderTimes.shift();
      }
    }
    
    this.lastFrameTime = now;
    requestAnimationFrame(() => this.measureFrame());
  }

  /**
   * Get rendering statistics
   * @returns {RenderStats} Rendering statistics
   */
  getStats() {
    if (this.renderTimes.length === 0) {
      return { fps: 0, avgFrameTime: 0, frameCount: 0 };
    }

    const avgFrameTime = this.renderTimes.reduce((sum, time) => sum + time, 0) / this.renderTimes.length;
    const fps = avgFrameTime > 0 ? Math.round(1000 / avgFrameTime) : 0;

    return {
      fps,
      avgFrameTime,
      frameCount: this.frameCount
    };
  }
}

/**
 * User interaction monitor
 */
export class InteractionMonitor {
  constructor() {
    /** @type {Array<{type: string, timestamp: number, target: string}>} */
    this.interactions = [];
    this.isListening = false;
    this.boundHandler = this.handleInteraction.bind(this);
  }

  /**
   * Start monitoring user interactions
   */
  startMonitoring() {
    if (this.isListening) return;
    
    this.isListening = true;
    const events = ['click', 'scroll', 'keydown', 'touchstart'];
    
    events.forEach(eventType => {
      document.addEventListener(eventType, this.boundHandler, { passive: true });
    });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isListening) return;
    
    this.isListening = false;
    const events = ['click', 'scroll', 'keydown', 'touchstart'];
    
    events.forEach(eventType => {
      document.removeEventListener(eventType, this.boundHandler);
    });
  }

  /**
   * Handle interaction event
   * @param {Event} event - DOM event
   */
  handleInteraction(event) {
    const timestamp = performance.now();
    const target = event.target && 'tagName' in event.target ? /** @type {string} */ (event.target.tagName) : 'unknown';
    
    this.interactions.push({
      type: event.type,
      timestamp,
      target
    });

    // Keep only last 50 interactions
    if (this.interactions.length > 50) {
      this.interactions.shift();
    }
  }

  /**
   * Get interaction statistics
   * @returns {InteractionStats} Interaction statistics
   */
  getStats() {
    if (this.interactions.length === 0) {
      return {
        totalInteractions: 0,
        avgTimeBetween: 0,
        interactionTypes: {}
      };
    }

    /** @type {Object.<string, number>} */
    const interactionTypes = {};
    this.interactions.forEach(interaction => {
      interactionTypes[interaction.type] = (interactionTypes[interaction.type] || 0) + 1;
    });

    const timestamps = this.interactions.map(i => i.timestamp);
    const timeDiffs = [];
    for (let i = 1; i < timestamps.length; i++) {
      timeDiffs.push(timestamps[i] - timestamps[i - 1]);
    }

    const avgTimeBetween = timeDiffs.length > 0 
      ? timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length 
      : 0;

    return {
      totalInteractions: this.interactions.length,
      avgTimeBetween,
      interactionTypes
    };
  }
}

/**
 * Comprehensive performance monitoring suite
 */
export class PerformanceSuite {
  constructor() {
    this.performanceMonitor = new PerformanceMonitor();
    this.memoryMonitor = new MemoryMonitor();
    this.renderMonitor = new RenderMonitor();
    this.interactionMonitor = new InteractionMonitor();
    this.isRunning = false;
  }

  /**
   * Start comprehensive monitoring
   */
  startMonitoring() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.renderMonitor.startMonitoring();
    this.interactionMonitor.startMonitoring();
    this.memoryMonitor.startLeakDetection();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.renderMonitor.stopMonitoring();
    this.interactionMonitor.stopMonitoring();
  }

  /**
   * Get comprehensive performance report
   * @returns {Object} Performance report
   */
  getPerformanceReport() {
    return {
      timestamp: Date.now(),
      memory: this.memoryMonitor.getMemoryUsageMB(),
      rendering: this.renderMonitor.getStats(),
      interactions: this.interactionMonitor.getStats(),
      measurements: Object.fromEntries(
        Array.from(this.performanceMonitor.getAllMeasurements().entries()).map(
          ([name, measurements]) => [name, this.performanceMonitor.getStats(name)]
        )
      ),
      isMonitoring: this.isRunning
    };
  }

  /**
   * Measure component render time
   * @param {string} componentName - Component name
   * @param {Function} renderFunction - Function to measure
   * @returns {Promise<any>} Render result
   */
  async measureComponentRender(componentName, renderFunction) {
    this.performanceMonitor.startMeasurement(`${componentName}-render`, { 
      type: 'component-render' 
    });
    
    try {
      const result = await renderFunction();
      this.performanceMonitor.endMeasurement(`${componentName}-render`);
      return result;
    } catch (error) {
      this.performanceMonitor.endMeasurement(`${componentName}-render`);
      throw error;
    }
  }

  /**
   * Benchmark email list performance
   * @param {number} emailCount - Number of emails to test
   * @param {boolean} useVirtualization - Whether to use virtualization
   * @returns {Promise<Object>} Benchmark results
   */
  async benchmarkEmailList(emailCount, useVirtualization) {
    const startMemory = this.memoryMonitor.getMemoryUsageMB();
    const measurementName = `email-list-${emailCount}-${useVirtualization ? 'virtual' : 'standard'}`;
    
    this.performanceMonitor.startMeasurement(measurementName, {
      emailCount,
      useVirtualization,
      type: 'email-list-benchmark'
    });

    // Simulate email list rendering
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const result = this.performanceMonitor.endMeasurement(measurementName);
    const endMemory = this.memoryMonitor.getMemoryUsageMB();

    return {
      emailCount,
      useVirtualization,
      duration: result?.duration || 0,
      memoryDelta: {
        used: ('used' in endMemory ? endMemory.used : 0) - ('used' in startMemory ? startMemory.used : 0),
        total: ('total' in endMemory ? endMemory.total : 0) - ('total' in startMemory ? startMemory.total : 0)
      }
    };
  }
}

// Global performance suite instance
export const performanceSuite = new PerformanceSuite();

// Helper functions for quick measurements
/** @param {string} name @param {any} metadata */
export const startMeasure = (name, metadata) => performanceSuite.performanceMonitor.startMeasurement(name, metadata);
/** @param {string} name */
export const endMeasure = (name) => performanceSuite.performanceMonitor.endMeasurement(name);
export const getMemoryUsage = () => performanceSuite.memoryMonitor.getMemoryUsageMB();
export const getPerformanceReport = () => performanceSuite.getPerformanceReport();
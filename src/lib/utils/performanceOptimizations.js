/**
 * Performance Optimization Utilities
 * Collection of utilities for optimizing application performance
 */

/**
 * Debounce utility for performance optimization
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} Debounced function
 */
export function debounce(func, wait, immediate = false) {
  /** @type {any} */
  let timeout;
  return function executedFunction(/** @type {any[]} */ ...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

/**
 * Throttle utility for performance optimization
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  /** @type {boolean} */
  let inThrottle;
  
  return function throttledFunction(/** @type {any[]} */ ...args) {
    if (!inThrottle) {
      // @ts-ignore - Preserving 'this' context for wrapped function
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoization utility for expensive computations
 * @param {Function} fn - Function to memoize
 * @param {Function} keyGenerator - Custom key generator (optional)
 * @returns {Function} Memoized function
 */
export function memoize(fn, keyGenerator = JSON.stringify) {
  const cache = new Map();
  
  return function memoizedFunction(/** @type {any[]} */ ...args) {
    const key = keyGenerator(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    // @ts-ignore - Preserving 'this' context for wrapped function
    const result = fn.apply(this, args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 1000) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
}

/**
 * Lazy loading utility for images and components
 */
export class LazyLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    };
    
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      this.options
    );
    
    this.loadedImages = new Set();
  }

  /**
   * Observe an element for lazy loading
   * @param {HTMLElement} element - Element to observe
   * @param {Function} loadCallback - Callback when element becomes visible
   */
  observe(element, loadCallback) {
    if (!element) return;
    
    element.dataset.loadCallback = loadCallback.toString();
    this.observer.observe(element);
  }

  /**
   * Stop observing an element
   * @param {HTMLElement} element - Element to unobserve
   */
  unobserve(element) {
    if (element) {
      this.observer.unobserve(element);
    }
  }

  /**
   * Handle intersection observer callback
   * @param {IntersectionObserverEntry[]} entries - Intersection entries
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = /** @type {HTMLElement} */ (entry.target);
        const callbackStr = element.dataset.loadCallback;
        
        if (callbackStr) {
          try {
            // Execute the load callback
            const callback = new Function('return ' + callbackStr)();
            callback(element);
          } catch (error) {
            console.warn('Lazy load callback error:', error);
          }
        }
        
        this.observer.unobserve(element);
      }
    });
  }

  /**
   * Destroy the lazy loader
   */
  destroy() {
    this.observer.disconnect();
    this.loadedImages.clear();
  }
}

/**
 * Image optimization utilities
 */
export class ImageOptimizer {
  /**
   * Lazy load an image with placeholder
   * @param {HTMLImageElement} img - Image element
   * @param {string} src - Image source URL
   * @param {string|null} placeholder - Placeholder image (optional)
   */
  static lazyLoadImage(img, src, placeholder = null) {
    if (!img) return;

    // Set placeholder if provided
    if (placeholder) {
      img.src = placeholder;
    }

    const loader = new LazyLoader();
    loader.observe(img, () => {
      const image = new Image();
      image.onload = () => {
        img.src = src;
        img.classList.add('loaded');
      };
      image.onerror = () => {
        img.classList.add('error');
      };
      image.src = src;
    });
  }

  /**
   * Optimize image loading with WebP support
   * @param {string} originalSrc - Original image source
   * @returns {string} Optimized image source
   */
  static getOptimizedImageSrc(originalSrc) {
    if (!originalSrc) return '';

    // Check WebP support
    const supportsWebP = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    })();

    if (supportsWebP && !originalSrc.includes('.webp')) {
      // Try to get WebP version
      const webpSrc = originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      return webpSrc;
    }

    return originalSrc;
  }
}

/**
 * DOM optimization utilities
 */
export class DOMOptimizer {
  /**
   * Batch DOM updates to prevent layout thrashing
   * @param {Function} updateFunction - Function containing DOM updates
   * @returns {Promise<void>} Promise that resolves after updates
   */
  static async batchDOMUpdates(updateFunction) {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        updateFunction();
        requestAnimationFrame(() => resolve());
      });
    });
  }

  /**
   * Optimize element rendering with CSS containment
   * @param {HTMLElement} element - Element to optimize
   */
  static applyContainment(element) {
    if (!element) return;

    element.style.contain = 'layout style paint';
  }

  /**
   * Create optimized virtual list item
   * @param {any} data - Item data
   * @param {number} index - Item index
   * @param {number} height - Item height
   * @returns {HTMLElement} Optimized list item
   */
  static createVirtualListItem(data, index, height) {
    const item = document.createElement('div');
    item.className = 'virtual-list-item';
    item.style.height = `${height}px`;
    item.style.transform = `translateY(${index * height}px)`;
    item.style.position = 'absolute';
    item.style.width = '100%';
    item.style.contain = 'layout style paint';
    
    return item;
  }
}

/**
 * Memory optimization utilities
 */
export class MemoryOptimizer {
  constructor() {
    this.weakRefs = new Set();
    this.observers = new Set();
  }

  /**
   * Create a weak reference to an object
   * @param {any} obj - Object to create weak reference for
   * @returns {WeakRef<any>} Weak reference
   */
  createWeakRef(obj) {
    const weakRef = new WeakRef(obj);
    this.weakRefs.add(weakRef);
    return weakRef;
  }

  /**
   * Clean up dead weak references
   */
  cleanupWeakRefs() {
    this.weakRefs.forEach(weakRef => {
      if (weakRef.deref() === undefined) {
        this.weakRefs.delete(weakRef);
      }
    });
  }

  /**
   * Create a cleanup observer for DOM elements
   * @param {HTMLElement} element - Element to observe
   * @param {Function} cleanupCallback - Cleanup function
   */
  observeForCleanup(element, cleanupCallback) {
    if (!element || typeof cleanupCallback !== 'function') return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.removedNodes.forEach(node => {
          if (node === element) {
            cleanupCallback();
            observer.disconnect();
            this.observers.delete(observer);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.add(observer);
  }

  /**
   * Cleanup all observers and references
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.weakRefs.clear();
  }
}

/**
 * Performance measurement decorator
 * @param {string} measurementName - Name for the measurement
 * @returns {Function} Decorator function
 */
export function measurePerformance(measurementName) {
  return function (/** @type {any} */ target, /** @type {any} */ propertyKey, /** @type {any} */ descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (/** @type {any[]} */ ...args) {
      const startTime = performance.now();
      const startMark = `${measurementName}-start`;
      const endMark = `${measurementName}-end`;

      performance.mark(startMark);

      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        performance.mark(endMark);
        performance.measure(measurementName, startMark, endMark);

        const entries = performance.getEntriesByName(measurementName);
        if (entries.length > 0) {
          const duration = entries[entries.length - 1].duration;
          console.log(`${measurementName}: ${duration.toFixed(2)}ms`);
        }
      }
    };

    return descriptor;
  };
}

/**
 * Svelte-specific optimizations
 */
export class SvelteOptimizer {
  /**
   * Create optimized store derived values
   * @param {any} store - Svelte store
   * @param {Function} deriveFn - Derive function
   * @param {any} initialValue - Initial value
   * @returns {any} Optimized derived store
   */
  static createMemoizedDerived(store, deriveFn, initialValue) {
    const memoizedDerive = memoize(deriveFn);
    
    return {
      subscribe: (/** @type {any} */ callback) => {
        return store.subscribe((/** @type {any} */ value) => {
          const derived = memoizedDerive(value);
          callback(derived);
        });
      }
    };
  }

  /**
   * Optimize component updates with batching
   * @param {Function} updateFn - Update function
   * @returns {Function} Batched update function
   */
  static batchUpdates(updateFn) {
    let pendingUpdate = false;
    
    return function batchedFunction(/** @type {any[]} */ ...args) {
      if (!pendingUpdate) {
        pendingUpdate = true;
        // @ts-ignore - Capturing 'this' context for async execution
        const context = this;
        requestAnimationFrame(() => {
          updateFn.apply(context, args);
          pendingUpdate = false;
        });
      }
    };
  }

  /**
   * Create performance-optimized component props
   * @param {object} props - Component props
   * @returns {object} Optimized props
   */
  static optimizeProps(props) {
    const optimized = /** @type {Record<string, any>} */ ({});
    const typedProps = /** @type {Record<string, any>} */ (props);
    
    Object.keys(typedProps).forEach(key => {
      const value = typedProps[key];
      
      // Memoize function props
      if (typeof value === 'function') {
        optimized[key] = memoize(value);
      }
      // Deep freeze object props to prevent mutations
      else if (typeof value === 'object' && value !== null) {
        optimized[key] = Object.freeze({ ...value });
      }
      else {
        optimized[key] = value;
      }
    });
    
    return optimized;
  }
}

/**
 * Bundle size optimization utilities
 */
export class BundleOptimizer {
  /**
   * Dynamically import modules for code splitting
   * @param {string} modulePath - Path to module
   * @returns {Promise<any>} Promise that resolves to the module
   */
  static async dynamicImport(modulePath) {
    try {
      const module = await import(modulePath);
      return module;
    } catch (error) {
      console.error(`Failed to load module: ${modulePath}`, error);
      throw error;
    }
  }

  /**
   * Preload critical modules
   * @param {string[]} modulePaths - Array of module paths to preload
   */
  static preloadModules(modulePaths) {
    modulePaths.forEach(path => {
      const link = document.createElement('link');
      link.rel = 'modulepreload';
      link.href = path;
      document.head.appendChild(link);
    });
  }

  /**
   * Check if feature is supported before loading polyfill
   * @param {string} feature - Feature to check
   * @param {string} polyfillPath - Path to polyfill
   * @returns {Promise<void>} Promise that resolves when feature is available
   */
  static async conditionalPolyfill(feature, polyfillPath) {
    // Check if feature exists
    const hasFeature = eval(`typeof ${feature} !== 'undefined'`);
    
    if (!hasFeature) {
      await this.dynamicImport(polyfillPath);
    }
  }
}

// Global performance optimization instance
export const globalOptimizer = {
  lazyLoader: new LazyLoader(),
  memoryOptimizer: new MemoryOptimizer(),
  
  // Initialize global optimizations
  init() {
    // Set up global error handling for performance issues
    window.addEventListener('error', (event) => {
      if (event.error?.name === 'ChunkLoadError') {
        console.warn('Chunk load error detected, attempting reload');
        window.location.reload();
      }
    });

    // Set up memory cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Set up performance observer for monitoring
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.duration > 100) {
              console.warn(`Slow operation detected: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
            }
          });
        });
        
        observer.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('Performance observer not supported');
      }
    }
  },

  // Cleanup function
  cleanup() {
    this.lazyLoader.destroy();
    this.memoryOptimizer.cleanup();
  }
};
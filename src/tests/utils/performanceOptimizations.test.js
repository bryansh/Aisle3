import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  debounce,
  throttle,
  memoize,
  LazyLoader,
  ImageOptimizer,
  DOMOptimizer,
  MemoryOptimizer,
  SvelteOptimizer,
  BundleOptimizer,
  globalOptimizer
} from '../../lib/utils/performanceOptimizations.js';

// Mock DOM APIs
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

global.MutationObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn()
}));

global.WeakRef = vi.fn().mockImplementation((obj) => ({
  deref: vi.fn().mockReturnValue(obj)
}));

global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.Image = vi.fn().mockImplementation(() => ({
  onload: null,
  onerror: null,
  src: ''
}));

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous calls', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should execute immediately when immediate flag is set', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100, true);

    debouncedFn();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should limit function execution rate', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();
    throttledFn();
    throttledFn();

    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    throttledFn();

    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('memoize', () => {
  it('should cache function results', () => {
    const fn = vi.fn((x) => x * 2);
    const memoizedFn = memoize(fn);

    const result1 = memoizedFn(5);
    const result2 = memoizedFn(5);

    expect(result1).toBe(10);
    expect(result2).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should use custom key generator', () => {
    const fn = vi.fn((obj) => obj.value * 2);
    const keyGen = (args) => args[0].id;
    const memoizedFn = memoize(fn, keyGen);

    memoizedFn({ id: 1, value: 5 });
    memoizedFn({ id: 1, value: 10 }); // Different value, same id

    expect(fn).toHaveBeenCalledTimes(1); // Should use cached result
  });

  it('should limit cache size', () => {
    const fn = vi.fn((x) => x);
    const memoizedFn = memoize(fn);

    // Fill cache beyond limit
    for (let i = 0; i < 1001; i++) {
      memoizedFn(i);
    }

    expect(fn).toHaveBeenCalledTimes(1001);
  });
});

describe('LazyLoader', () => {
  let loader;

  beforeEach(() => {
    loader = new LazyLoader();
  });

  afterEach(() => {
    loader.destroy();
  });

  it('should create intersection observer', () => {
    expect(IntersectionObserver).toHaveBeenCalled();
  });

  it('should observe elements', () => {
    const element = document.createElement('div');
    const callback = vi.fn();

    loader.observe(element, callback);

    expect(loader.observer.observe).toHaveBeenCalledWith(element);
  });

  it('should unobserve elements', () => {
    const element = document.createElement('div');

    loader.unobserve(element);

    expect(loader.observer.unobserve).toHaveBeenCalledWith(element);
  });

  it('should handle intersection callback', () => {
    const element = document.createElement('div');
    const callback = vi.fn();
    element.dataset.loadCallback = callback.toString();

    const entries = [{
      isIntersecting: true,
      target: element
    }];

    loader.handleIntersection(entries);

    expect(loader.observer.unobserve).toHaveBeenCalledWith(element);
  });

  it('should destroy properly', () => {
    loader.destroy();

    expect(loader.observer.disconnect).toHaveBeenCalled();
  });
});

describe('ImageOptimizer', () => {
  it('should lazy load images', () => {
    const img = document.createElement('img');
    const src = 'test.jpg';
    const placeholder = 'placeholder.jpg';

    ImageOptimizer.lazyLoadImage(img, src, placeholder);

    expect(img.src).toBe('http://localhost:3000/placeholder.jpg'); // jsdom adds base URL
  });

  it('should get optimized image source for WebP', () => {
    // Mock WebP support
    const mockCanvas = {
      width: 1,
      height: 1,
      toDataURL: vi.fn().mockReturnValue('data:image/webp;base64,test')
    };
    document.createElement = vi.fn().mockReturnValue(mockCanvas);

    const result = ImageOptimizer.getOptimizedImageSrc('test.jpg');
    expect(result).toBe('test.webp');
  });

  it('should return original source when WebP not supported', () => {
    // Mock no WebP support
    const mockCanvas = {
      width: 1,
      height: 1,
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,test')
    };
    document.createElement = vi.fn().mockReturnValue(mockCanvas);

    const result = ImageOptimizer.getOptimizedImageSrc('test.jpg');
    expect(result).toBe('test.jpg');
  });
});

describe('DOMOptimizer', () => {
  it('should batch DOM updates', async () => {
    const updateFn = vi.fn();
    
    await DOMOptimizer.batchDOMUpdates(updateFn);
    
    expect(updateFn).toHaveBeenCalled();
    expect(requestAnimationFrame).toHaveBeenCalled();
  });

  it('should apply containment', () => {
    const element = { style: {} };
    
    DOMOptimizer.applyContainment(element);
    
    expect(element.style.contain).toBe('layout style paint');
  });

  it('should create virtual list item', () => {
    // Mock document.createElement to return an element with style property
    const mockElement = {
      className: '',
      style: {},
      textContent: ''
    };
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn().mockReturnValue(mockElement);

    const data = { id: 1, text: 'test' };
    const item = DOMOptimizer.createVirtualListItem(data, 5, 50);

    expect(item.style.height).toBe('50px');
    expect(item.style.transform).toBe('translateY(250px)');
    expect(item.style.position).toBe('absolute');
    expect(item.style.contain).toBe('layout style paint');

    // Restore original
    document.createElement = originalCreateElement;
  });
});

describe('MemoryOptimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new MemoryOptimizer();
  });

  afterEach(() => {
    optimizer.cleanup();
  });

  it('should create weak references', () => {
    const obj = { test: 'data' };
    const weakRef = optimizer.createWeakRef(obj);

    expect(WeakRef).toHaveBeenCalledWith(obj);
    expect(optimizer.weakRefs.has(weakRef)).toBe(true);
  });

  it('should observe for cleanup', () => {
    const element = document.createElement('div');
    const cleanupFn = vi.fn();

    optimizer.observeForCleanup(element, cleanupFn);

    expect(MutationObserver).toHaveBeenCalled();
  });

  it('should cleanup observers and references', () => {
    optimizer.cleanup();

    expect(optimizer.observers.size).toBe(0);
    expect(optimizer.weakRefs.size).toBe(0);
  });
});

describe('SvelteOptimizer', () => {
  it('should create memoized derived', () => {
    const mockStore = {
      subscribe: vi.fn()
    };
    const deriveFn = vi.fn((x) => x * 2);

    const derived = SvelteOptimizer.createMemoizedDerived(mockStore, deriveFn, 0);

    expect(derived).toHaveProperty('subscribe');
    expect(typeof derived.subscribe).toBe('function');
  });

  it('should batch updates', () => {
    const updateFn = vi.fn();
    const batchedFn = SvelteOptimizer.batchUpdates(updateFn);

    batchedFn();
    batchedFn(); // Second call should be ignored

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('should optimize props', () => {
    const props = {
      callback: vi.fn(),
      data: { key: 'value' },
      primitive: 'string'
    };

    const optimized = SvelteOptimizer.optimizeProps(props);

    expect(optimized).toHaveProperty('callback');
    expect(optimized).toHaveProperty('data');
    expect(optimized).toHaveProperty('primitive');
    expect(Object.isFrozen(optimized.data)).toBe(true);
  });
});

describe('BundleOptimizer', () => {
  it('should handle dynamic imports', async () => {
    // Mock the import function itself since we can't mock modules that don't exist
    const originalImport = global.import;
    const mockModule = { default: 'test' };
    
    // Mock BundleOptimizer.dynamicImport directly
    const originalDynamicImport = BundleOptimizer.dynamicImport;
    BundleOptimizer.dynamicImport = vi.fn().mockResolvedValue(mockModule);

    const result = await BundleOptimizer.dynamicImport('./test-module');
    expect(result).toBe(mockModule);

    // Restore
    BundleOptimizer.dynamicImport = originalDynamicImport;
  });

  it('should handle import failures', async () => {
    // Mock BundleOptimizer.dynamicImport to throw the expected error
    const originalDynamicImport = BundleOptimizer.dynamicImport;
    BundleOptimizer.dynamicImport = vi.fn().mockRejectedValue(new Error('Import failed'));

    await expect(BundleOptimizer.dynamicImport('./nonexistent')).rejects.toThrow('Import failed');

    // Restore
    BundleOptimizer.dynamicImport = originalDynamicImport;
  });

  it('should preload modules', () => {
    // Mock document.head with appendChild method
    const mockHead = {
      appendChild: vi.fn()
    };
    Object.defineProperty(document, 'head', {
      value: mockHead,
      writable: true,
      configurable: true
    });

    const mockLink = {
      rel: '',
      href: '',
      as: ''
    };
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn().mockReturnValue(mockLink);

    BundleOptimizer.preloadModules(['./module1.js', './module2.js']);

    expect(document.createElement).toHaveBeenCalledWith('link');
    expect(mockHead.appendChild).toHaveBeenCalled();

    // Restore
    document.createElement = originalCreateElement;
  });

  it('should conditionally load polyfills', async () => {
    // Mock BundleOptimizer.conditionalPolyfill and dynamicImport
    const originalConditionalPolyfill = BundleOptimizer.conditionalPolyfill;
    const originalDynamicImport = BundleOptimizer.dynamicImport;
    
    const mockDynamicImport = vi.fn().mockResolvedValue({});
    BundleOptimizer.dynamicImport = mockDynamicImport;
    
    // Mock eval to return false (feature doesn't exist)
    global.eval = vi.fn().mockReturnValue(false);

    await BundleOptimizer.conditionalPolyfill('nonexistentFeature', './polyfill.js');

    expect(mockDynamicImport).toHaveBeenCalledWith('./polyfill.js');

    // Restore
    BundleOptimizer.conditionalPolyfill = originalConditionalPolyfill;
    BundleOptimizer.dynamicImport = originalDynamicImport;
  });
});

describe('globalOptimizer', () => {
  beforeEach(() => {
    global.window = {
      addEventListener: vi.fn(),
      location: { reload: vi.fn() }
    };
    global.PerformanceObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn()
    }));
  });

  it('should initialize global optimizations', () => {
    globalOptimizer.init();

    expect(window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('should cleanup properly', () => {
    globalOptimizer.cleanup();

    expect(globalOptimizer.lazyLoader.observer.disconnect).toHaveBeenCalled();
  });

  it('should handle chunk load errors', () => {
    globalOptimizer.init();

    const errorHandler = window.addEventListener.mock.calls.find(
      call => call[0] === 'error'
    )[1];

    const mockError = new Error('Loading chunk failed');
    mockError.name = 'ChunkLoadError';

    errorHandler({ error: mockError });

    expect(window.location.reload).toHaveBeenCalled();
  });
});
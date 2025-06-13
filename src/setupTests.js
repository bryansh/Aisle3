import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri API
global.__TAURI__ = {
  core: {
    invoke: vi.fn()
  },
  event: {
    listen: vi.fn(),
    emit: vi.fn()
  }
};

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html) => html)
  }
}));

// Mock he (HTML entity decoder)
vi.mock('he', () => ({
  decode: vi.fn((text) => text)
}));

// Mock SvelteKit modules
vi.mock('$app/environment', () => ({
  browser: false,
  dev: true,
  building: false,
  version: 'test'
}));

// Mock window APIs that might be used
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock Web Animations API for tests
Element.prototype.animate = Element.prototype.animate || function() {
  return {
    cancel: () => {},
    finish: () => {},
    play: () => {},
    pause: () => {},
    reverse: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
    currentTime: 0,
    playbackRate: 1,
    playState: 'finished'
  };
};

// Svelte 5 specific setup for testing
import { beforeEach } from 'vitest';

// Mock browser environment
global.window = window;
global.document = document;

// Force browser environment for Svelte
process.env.NODE_ENV = 'test';
process.env.VITEST = 'true';
global.process = { 
  ...global.process, 
  env: { 
    ...global.process.env, 
    NODE_ENV: 'test',
    VITEST: 'true'
  },
  browser: true
};

// Force module resolution conditions
global.BROWSER = true;

beforeEach(() => {
  // Reset DOM before each test
  document.body.innerHTML = '';
  
  // Reset all mocks
  vi.clearAllMocks();
  
  // Reset localStorage mock
  localStorageMock.getItem.mockReturnValue(null);
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});
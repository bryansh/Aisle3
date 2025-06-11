import { writable, get } from 'svelte/store';

/**
 * Loading State Manager - Centralized loading state management
 */
export class LoadingStateManager {
  constructor() {
    this.states = new Map();
    this.globalState = writable(false);
  }
  
  /**
   * Create a simple boolean loading state
   */
  createLoadingState(key) {
    if (this.states.has(key)) {
      return this.states.get(key);
    }
    
    const state = writable(false);
    this.states.set(key, state);
    return state;
  }
  
  /**
   * Create a set-based loading state for tracking multiple concurrent operations
   */
  createSetBasedLoadingState(key) {
    if (this.states.has(key)) {
      return this.states.get(key);
    }
    
    const state = writable(new Set());
    const helper = {
      store: state,
      add: (id) => {
        state.update(set => {
          const newSet = new Set(set);
          newSet.add(id);
          return newSet;
        });
      },
      remove: (id) => {
        state.update(set => {
          const newSet = new Set(set);
          newSet.delete(id);
          return newSet;
        });
      },
      has: (id) => get(state).has(id),
      clear: () => state.set(new Set()),
      size: () => get(state).size
    };
    
    this.states.set(key, helper);
    return helper;
  }
  
  /**
   * Get existing loading state
   */
  getLoadingState(key) {
    return this.states.get(key);
  }
  
  /**
   * Remove loading state
   */
  removeLoadingState(key) {
    this.states.delete(key);
  }
  
  /**
   * Clear all loading states
   */
  clearAllStates() {
    this.states.clear();
    this.globalState.set(false);
  }
}

/**
 * Wrap async operations with loading state management
 */
export function createAsyncOperation(loadingStore) {
  return async function(operation) {
    loadingStore.set(true);
    try {
      return await operation();
    } catch (error) {
      console.error('Async operation failed:', error);
      throw error;
    } finally {
      loadingStore.set(false);
    }
  };
}

/**
 * Wrap async operations with set-based loading state management
 */
export function createAsyncOperationWithId(loadingHelper, id) {
  return async function(operation) {
    loadingHelper.add(id);
    try {
      return await operation();
    } catch (error) {
      console.error(`Async operation failed for ${id}:`, error);
      throw error;
    } finally {
      loadingHelper.remove(id);
    }
  };
}

/**
 * Create debounced loading state (useful for rapid fire operations)
 */
export function createDebouncedLoadingState(delay = 200) {
  const state = writable(false);
  let timeoutId = null;
  
  return {
    store: state,
    start: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      state.set(true);
    },
    stop: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        state.set(false);
        timeoutId = null;
      }, delay);
    }
  };
}

/**
 * Global loading state manager instance
 */
export const globalLoadingManager = new LoadingStateManager();

/**
 * Common loading operation types
 */
export const LOADING_KEYS = {
  EMAIL_LIST: 'emailList',
  EMAIL_CONTENT: 'emailContent',
  EMAIL_SENDING: 'emailSending',
  EMAIL_OPERATIONS: 'emailOperations',
  AUTHENTICATION: 'authentication',
  BACKGROUND_SYNC: 'backgroundSync'
};

/**
 * Helper to create standardized loading states
 */
export function useLoadingState(key) {
  return globalLoadingManager.createLoadingState(key);
}

/**
 * Helper to create standardized set-based loading states  
 */
export function useSetLoadingState(key) {
  return globalLoadingManager.createSetBasedLoadingState(key);
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
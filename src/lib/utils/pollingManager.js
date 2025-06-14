/**
 * Polling Manager - Handles auto-polling for email updates
 * Extracted from EmailApp.svelte for better testability and separation of concerns
 * @fileoverview Provides type-safe polling management with configurable intervals
 */

/**
 * @typedef {Object} PollingConfig
 * @property {number} intervalSeconds - Polling interval in seconds
 * @property {boolean} enabled - Whether polling is enabled
 * @property {boolean} runImmediately - Whether to run immediately when started
 * @property {number} maxRetries - Maximum retries on failure
 * @property {number} retryDelayMs - Delay between retries in milliseconds
 */

/**
 * @typedef {Object} PollingState
 * @property {boolean} isRunning - Whether polling is currently active
 * @property {number | null} intervalId - Current interval ID
 * @property {number} intervalSeconds - Current interval in seconds
 * @property {number} runCount - Number of times polling has run
 * @property {number | null} lastRunTime - Timestamp of last run
 * @property {string | null} lastError - Last error message
 * @property {number} consecutiveErrors - Number of consecutive errors
 */

/**
 * @typedef {Object} PollingResult
 * @property {boolean} success - Whether polling operation succeeded
 * @property {string | null} error - Error message if failed
 * @property {any} [data] - Data from polling operation
 * @property {number} duration - Operation duration in milliseconds
 */

/**
 * Default polling configuration
 * @type {PollingConfig}
 */
export const DEFAULT_POLLING_CONFIG = {
  intervalSeconds: 30,
  enabled: false,
  runImmediately: false,
  maxRetries: 3,
  retryDelayMs: 5000
};

/**
 * Polling manager class for handling automated email checking
 */
export class PollingManager {
  /** @type {PollingState} */
  #state;

  /** @type {PollingConfig} */
  #config;

  /** @type {(() => Promise<any>) | null} */
  #pollFunction;

  /** @type {Array<(state: PollingState) => void>} */
  #listeners;

  /** @type {Array<(result: PollingResult) => void>} */
  #resultListeners;

  /**
   * Create a new polling manager
   * @param {Partial<PollingConfig>} config - Polling configuration
   */
  constructor(config = {}) {
    this.#config = { ...DEFAULT_POLLING_CONFIG, ...config };
    this.#state = {
      isRunning: false,
      intervalId: null,
      intervalSeconds: this.#config.intervalSeconds,
      runCount: 0,
      lastRunTime: null,
      lastError: null,
      consecutiveErrors: 0
    };
    this.#pollFunction = null;
    this.#listeners = [];
    this.#resultListeners = [];
  }

  /**
   * Get current polling state
   * @returns {PollingState} Current state
   */
  getState() {
    return { ...this.#state };
  }

  /**
   * Get current polling configuration
   * @returns {PollingConfig} Current config
   */
  getConfig() {
    return { ...this.#config };
  }

  /**
   * Check if polling is currently running
   * @returns {boolean} Whether polling is active
   */
  isRunning() {
    return this.#state.isRunning;
  }

  /**
   * Add a listener for state changes
   * @param {(state: PollingState) => void} listener - State change callback
   * @returns {() => void} Unsubscribe function
   */
  addStateListener(listener) {
    this.#listeners.push(listener);
    return () => {
      const index = this.#listeners.indexOf(listener);
      if (index > -1) {
        this.#listeners.splice(index, 1);
      }
    };
  }

  /**
   * Add a listener for polling results
   * @param {(result: PollingResult) => void} listener - Result callback
   * @returns {() => void} Unsubscribe function
   */
  addResultListener(listener) {
    this.#resultListeners.push(listener);
    return () => {
      const index = this.#resultListeners.indexOf(listener);
      if (index > -1) {
        this.#resultListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify state listeners
   */
  #notifyStateListeners() {
    const state = this.getState();
    this.#listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.warn('Error in polling state listener:', error);
      }
    });
  }

  /**
   * Notify result listeners
   * @param {PollingResult} result - Polling result
   */
  #notifyResultListeners(result) {
    this.#resultListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.warn('Error in polling result listener:', error);
      }
    });
  }

  /**
   * Update polling state
   * @param {Partial<PollingState>} updates - State updates
   */
  #updateState(updates) {
    this.#state = { ...this.#state, ...updates };
    this.#notifyStateListeners();
  }

  /**
   * Set the polling function
   * @param {() => Promise<any>} pollFn - Function to call for polling
   */
  setPollFunction(pollFn) {
    if (typeof pollFn !== 'function') {
      throw new Error('Poll function must be a function');
    }
    this.#pollFunction = pollFn;
  }

  /**
   * Update polling configuration
   * @param {Partial<PollingConfig>} updates - Config updates
   */
  updateConfig(updates) {
    this.#config = { ...this.#config, ...updates };
    
    // Update interval if it changed and polling is running
    if (updates.intervalSeconds && this.#state.isRunning) {
      this.#updateState({ intervalSeconds: updates.intervalSeconds });
      this.restart();
    }
  }

  /**
   * Execute a single poll operation
   * @returns {Promise<PollingResult>} Polling result
   */
  async #executePoll() {
    if (!this.#pollFunction) {
      const error = 'No poll function set';
      this.#updateState({ lastError: error });
      return {
        success: false,
        error,
        duration: 0
      };
    }

    const startTime = Date.now();
    
    try {
      const data = await this.#pollFunction();
      const duration = Date.now() - startTime;
      
      this.#updateState({
        runCount: this.#state.runCount + 1,
        lastRunTime: Date.now(),
        lastError: null,
        consecutiveErrors: 0
      });

      const result = {
        success: true,
        error: null,
        data,
        duration
      };

      this.#notifyResultListeners(result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.#updateState({
        runCount: this.#state.runCount + 1,
        lastRunTime: Date.now(),
        lastError: errorMessage,
        consecutiveErrors: this.#state.consecutiveErrors + 1
      });

      const result = {
        success: false,
        error: errorMessage,
        duration
      };

      this.#notifyResultListeners(result);
      return result;
    }
  }

  /**
   * Start polling
   * @returns {boolean} Whether polling was started successfully
   */
  start() {
    if (this.#state.isRunning) {
      console.warn('Polling is already running');
      return false;
    }

    if (!this.#pollFunction) {
      console.error('Cannot start polling: no poll function set');
      return false;
    }

    // Run immediately if configured
    if (this.#config.runImmediately) {
      this.#executePoll().catch(error => {
        console.warn('Initial poll failed:', error);
      });
    }

    // Set up interval
    const intervalId = setInterval(() => {
      this.#executePoll().catch(error => {
        console.warn('Polling failed:', error);
      });
    }, this.#config.intervalSeconds * 1000);

    this.#updateState({
      isRunning: true,
      intervalId: /** @type {number} */ (intervalId),
      intervalSeconds: this.#config.intervalSeconds
    });

    console.log(`🔄 Polling started (every ${this.#config.intervalSeconds} seconds)`);
    return true;
  }

  /**
   * Stop polling
   * @returns {boolean} Whether polling was stopped
   */
  stop() {
    if (!this.#state.isRunning) {
      return false;
    }

    if (this.#state.intervalId !== null) {
      clearInterval(this.#state.intervalId);
    }

    this.#updateState({
      isRunning: false,
      intervalId: null
    });

    console.log('⏹️ Polling stopped');
    return true;
  }

  /**
   * Restart polling with current configuration
   * @returns {boolean} Whether restart was successful
   */
  restart() {
    const wasRunning = this.#state.isRunning;
    this.stop();
    
    if (wasRunning) {
      return this.start();
    }
    
    return false;
  }

  /**
   * Execute a manual poll operation
   * @returns {Promise<PollingResult>} Polling result
   */
  async poll() {
    return this.#executePoll();
  }

  /**
   * Set polling interval
   * @param {number} intervalSeconds - New interval in seconds
   */
  setInterval(intervalSeconds) {
    if (typeof intervalSeconds !== 'number' || intervalSeconds <= 0) {
      throw new Error('Interval must be a positive number');
    }

    this.updateConfig({ intervalSeconds });
  }

  /**
   * Enable or disable polling
   * @param {boolean} enabled - Whether to enable polling
   */
  setEnabled(enabled) {
    this.updateConfig({ enabled });
    
    if (enabled && !this.#state.isRunning) {
      this.start();
    } else if (!enabled && this.#state.isRunning) {
      this.stop();
    }
  }

  /**
   * Get statistics about polling performance
   * @returns {object} Polling statistics
   */
  getStats() {
    const { runCount, lastRunTime, consecutiveErrors, isRunning } = this.#state;
    
    return {
      runCount,
      lastRunTime,
      consecutiveErrors,
      isRunning,
      averageInterval: runCount > 1 && lastRunTime ? 
        (Date.now() - lastRunTime) / runCount : null,
      healthStatus: consecutiveErrors === 0 ? 'healthy' : 
                   consecutiveErrors < 3 ? 'warning' : 'error'
    };
  }

  /**
   * Reset polling state
   */
  reset() {
    this.stop();
    this.#updateState({
      runCount: 0,
      lastRunTime: null,
      lastError: null,
      consecutiveErrors: 0
    });
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stop();
    this.#listeners.length = 0;
    this.#resultListeners.length = 0;
    this.#pollFunction = null;
  }
}

/**
 * Create and configure a polling manager for email operations
 * @param {any} emailOperations - Email operations from store
 * @param {Partial<PollingConfig>} config - Polling configuration
 * @returns {PollingManager} Configured polling manager
 */
export function createEmailPollingManager(emailOperations, config = {}) {
  const pollingManager = new PollingManager(config);
  
  // Set up email checking function
  pollingManager.setPollFunction(async () => {
    if (emailOperations && typeof emailOperations.checkForNewEmails === 'function') {
      const result = await emailOperations.checkForNewEmails(true);
      // Handle both old format (array) and new format (object with emailIds and emailDetails)
      if (Array.isArray(result)) {
        return result; // Legacy format - just email IDs
      } else if (result && result.emailIds) {
        return result; // New format - return the whole object
      }
      return []; // No new emails
    }
    throw new Error('Email operations not available');
  });

  return pollingManager;
}

/**
 * Polling utilities
 */
export const PollingUtils = {
  /**
   * Calculate optimal polling interval based on activity
   * @param {number} baseInterval - Base interval in seconds
   * @param {number} activityLevel - Activity level (0-1, higher = more active)
   * @returns {number} Optimal interval in seconds
   */
  calculateOptimalInterval(baseInterval, activityLevel = 0.5) {
    const minInterval = 10; // Minimum 10 seconds
    
    // More activity = shorter interval
    const factor = 1 - (activityLevel * 0.5);
    const calculated = Math.round(baseInterval * factor);
    
    return Math.max(calculated, minInterval);
  },

  /**
   * Check if polling should be paused based on conditions
   * @param {object} conditions - Conditions to check
   * @param {boolean} conditions.isVisible - Whether app is visible
   * @param {boolean} conditions.isOnline - Whether device is online
   * @param {boolean} conditions.hasRecentActivity - Whether there's recent user activity
   * @returns {boolean} Whether polling should be paused
   */
  shouldPausePolling(conditions) {
    const { isVisible = true, isOnline = true, hasRecentActivity = true } = conditions;
    
    // Pause if offline or hidden for extended period without activity
    return !isOnline || (!isVisible && !hasRecentActivity);
  },

  /**
   * Format polling interval for display
   * @param {number} intervalSeconds - Interval in seconds
   * @returns {string} Formatted interval string
   */
  formatInterval(intervalSeconds) {
    if (intervalSeconds < 60) {
      return `${intervalSeconds} seconds`;
    } else if (intervalSeconds < 3600) {
      const minutes = Math.round(intervalSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    } else {
      const hours = Math.round(intervalSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
  }
};
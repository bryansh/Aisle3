import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_POLLING_CONFIG,
  PollingManager,
  createEmailPollingManager,
  PollingUtils
} from '../../lib/utils/pollingManager.js';

describe('pollingManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('DEFAULT_POLLING_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_POLLING_CONFIG).toEqual({
        intervalSeconds: 30,
        enabled: false,
        runImmediately: false,
        maxRetries: 3,
        retryDelayMs: 5000
      });
    });
  });

  describe('PollingManager', () => {
    let pollingManager;
    let mockPollFunction;

    beforeEach(() => {
      mockPollFunction = vi.fn().mockResolvedValue({ success: true });
      pollingManager = new PollingManager();
      pollingManager.setPollFunction(mockPollFunction);
    });

    afterEach(() => {
      pollingManager.cleanup();
    });

    describe('initialization', () => {
      it('should initialize with default config and state', () => {
        const config = pollingManager.getConfig();
        const state = pollingManager.getState();
        
        expect(config).toEqual(DEFAULT_POLLING_CONFIG);
        expect(state).toEqual({
          isRunning: false,
          intervalId: null,
          intervalSeconds: 30,
          runCount: 0,
          lastRunTime: null,
          lastError: null,
          consecutiveErrors: 0
        });
      });

      it('should accept custom config', () => {
        const customConfig = {
          intervalSeconds: 60,
          enabled: true,
          runImmediately: true
        };
        
        const manager = new PollingManager(customConfig);
        const config = manager.getConfig();
        
        expect(config.intervalSeconds).toBe(60);
        expect(config.enabled).toBe(true);
        expect(config.runImmediately).toBe(true);
        expect(config.maxRetries).toBe(DEFAULT_POLLING_CONFIG.maxRetries);
        
        manager.cleanup();
      });

      it('should start as not running', () => {
        expect(pollingManager.isRunning()).toBe(false);
      });
    });

    describe('poll function management', () => {
      it('should set poll function', () => {
        const newPollFn = vi.fn();
        pollingManager.setPollFunction(newPollFn);
        
        // The function should be set (we can't directly test private property)
        expect(() => pollingManager.setPollFunction(newPollFn)).not.toThrow();
      });

      it('should throw error for non-function poll function', () => {
        expect(() => pollingManager.setPollFunction('not a function')).toThrow('Poll function must be a function');
      });
    });

    describe('listeners', () => {
      it('should add and remove state listeners', () => {
        const listener = vi.fn();
        const unsubscribe = pollingManager.addStateListener(listener);
        
        expect(typeof unsubscribe).toBe('function');
        
        pollingManager.start();
        expect(listener).toHaveBeenCalled();
        
        listener.mockClear();
        unsubscribe();
        
        pollingManager.stop();
        expect(listener).not.toHaveBeenCalled();
      });

      it('should add and remove result listeners', async () => {
        const listener = vi.fn();
        const unsubscribe = pollingManager.addResultListener(listener);
        
        expect(typeof unsubscribe).toBe('function');
        
        // Trigger a poll result
        await pollingManager.poll();
        
        expect(listener).toHaveBeenCalled();
        
        listener.mockClear();
        unsubscribe();
        
        await pollingManager.poll();
        
        expect(listener).not.toHaveBeenCalled();
      });

      it('should handle listener errors gracefully', () => {
        const errorListener = vi.fn(() => {
          throw new Error('Listener error');
        });
        
        pollingManager.addStateListener(errorListener);
        
        expect(() => pollingManager.start()).not.toThrow();
      });
    });

    describe('configuration updates', () => {
      it('should update config', () => {
        pollingManager.updateConfig({ intervalSeconds: 60 });
        
        const config = pollingManager.getConfig();
        expect(config.intervalSeconds).toBe(60);
      });

      it('should restart polling when interval changes while running', () => {
        pollingManager.start();
        expect(pollingManager.isRunning()).toBe(true);
        
        pollingManager.updateConfig({ intervalSeconds: 60 });
        
        expect(pollingManager.isRunning()).toBe(true);
        expect(pollingManager.getState().intervalSeconds).toBe(60);
      });

      it('should not restart when not running', () => {
        expect(pollingManager.isRunning()).toBe(false);
        
        pollingManager.updateConfig({ intervalSeconds: 60 });
        
        expect(pollingManager.isRunning()).toBe(false);
      });
    });

    describe('start/stop polling', () => {
      it('should start polling successfully', () => {
        const result = pollingManager.start();
        
        expect(result).toBe(true);
        expect(pollingManager.isRunning()).toBe(true);
        expect(pollingManager.getState().intervalId).not.toBeNull();
      });

      it('should not start if already running', () => {
        pollingManager.start();
        const result = pollingManager.start();
        
        expect(result).toBe(false);
      });

      it('should not start without poll function', () => {
        const manager = new PollingManager();
        const result = manager.start();
        
        expect(result).toBe(false);
        expect(manager.isRunning()).toBe(false);
        
        manager.cleanup();
      });

      it('should stop polling', () => {
        pollingManager.start();
        const result = pollingManager.stop();
        
        expect(result).toBe(true);
        expect(pollingManager.isRunning()).toBe(false);
        expect(pollingManager.getState().intervalId).toBeNull();
      });

      it('should return false when stopping if not running', () => {
        const result = pollingManager.stop();
        expect(result).toBe(false);
      });

      it('should restart polling', () => {
        pollingManager.start();
        expect(pollingManager.isRunning()).toBe(true);
        
        const result = pollingManager.restart();
        
        expect(result).toBe(true);
        expect(pollingManager.isRunning()).toBe(true);
      });

      it('should not restart if was not running', () => {
        const result = pollingManager.restart();
        expect(result).toBe(false);
        expect(pollingManager.isRunning()).toBe(false);
      });
    });

    describe('run immediately option', () => {
      it('should run immediately when configured', () => {
        const manager = new PollingManager({ runImmediately: true });
        manager.setPollFunction(mockPollFunction);
        
        manager.start();
        
        expect(mockPollFunction).toHaveBeenCalled();
        
        manager.cleanup();
      });

      it('should not run immediately by default', () => {
        pollingManager.start();
        
        expect(mockPollFunction).not.toHaveBeenCalled();
      });
    });

    describe('polling execution', () => {
      it('should execute poll function on interval', () => {
        pollingManager.start();
        
        // Advance timer by interval duration
        vi.advanceTimersByTime(30000);
        
        expect(mockPollFunction).toHaveBeenCalled();
      });

      it('should handle successful poll results', async () => {
        const resultListener = vi.fn();
        pollingManager.addResultListener(resultListener);
        
        const result = await pollingManager.poll();
        
        expect(result.success).toBe(true);
        expect(result.error).toBeNull();
        expect(result.duration).toBeGreaterThanOrEqual(0);
        expect(resultListener).toHaveBeenCalledWith(result);
      });

      it('should handle poll function errors', async () => {
        const error = new Error('Poll failed');
        mockPollFunction.mockRejectedValue(error);
        
        const result = await pollingManager.poll();
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Poll failed');
        expect(pollingManager.getState().consecutiveErrors).toBe(1);
      });

      it('should handle poll function without poll function set', async () => {
        const manager = new PollingManager();
        const result = await manager.poll();
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('No poll function set');
        
        manager.cleanup();
      });

      it('should update run count and last run time', async () => {
        await pollingManager.poll();
        
        const state = pollingManager.getState();
        expect(state.runCount).toBe(1);
        expect(state.lastRunTime).toBeTruthy();
      });

      it('should track consecutive errors', async () => {
        mockPollFunction.mockRejectedValue(new Error('Error 1'));
        await pollingManager.poll();
        
        expect(pollingManager.getState().consecutiveErrors).toBe(1);
        
        mockPollFunction.mockRejectedValue(new Error('Error 2'));
        await pollingManager.poll();
        
        expect(pollingManager.getState().consecutiveErrors).toBe(2);
        
        // Success should reset consecutive errors
        mockPollFunction.mockResolvedValue({ success: true });
        await pollingManager.poll();
        
        expect(pollingManager.getState().consecutiveErrors).toBe(0);
      });

      it('should handle string errors', async () => {
        mockPollFunction.mockRejectedValue('String error');
        
        const result = await pollingManager.poll();
        
        expect(result.error).toBe('String error');
      });
    });

    describe('interval management', () => {
      it('should set polling interval', () => {
        pollingManager.setInterval(60);
        
        expect(pollingManager.getConfig().intervalSeconds).toBe(60);
      });

      it('should throw error for invalid interval', () => {
        expect(() => pollingManager.setInterval(0)).toThrow('Interval must be a positive number');
        expect(() => pollingManager.setInterval(-1)).toThrow('Interval must be a positive number');
        expect(() => pollingManager.setInterval('invalid')).toThrow('Interval must be a positive number');
      });
    });

    describe('enable/disable', () => {
      it('should enable polling and start', () => {
        pollingManager.setEnabled(true);
        
        expect(pollingManager.getConfig().enabled).toBe(true);
        expect(pollingManager.isRunning()).toBe(true);
      });

      it('should disable polling and stop', () => {
        pollingManager.start();
        pollingManager.setEnabled(false);
        
        expect(pollingManager.getConfig().enabled).toBe(false);
        expect(pollingManager.isRunning()).toBe(false);
      });

      it('should handle enabling when already running', () => {
        pollingManager.start();
        pollingManager.setEnabled(true);
        
        expect(pollingManager.isRunning()).toBe(true);
      });

      it('should handle disabling when not running', () => {
        pollingManager.setEnabled(false);
        
        expect(pollingManager.isRunning()).toBe(false);
      });
    });

    describe('statistics', () => {
      it('should provide polling statistics', () => {
        const stats = pollingManager.getStats();
        
        expect(stats).toHaveProperty('runCount');
        expect(stats).toHaveProperty('lastRunTime');
        expect(stats).toHaveProperty('consecutiveErrors');
        expect(stats).toHaveProperty('isRunning');
        expect(stats).toHaveProperty('averageInterval');
        expect(stats).toHaveProperty('healthStatus');
      });

      it('should calculate health status correctly', async () => {
        // Healthy state
        await pollingManager.poll();
        expect(pollingManager.getStats().healthStatus).toBe('healthy');
        
        // Warning state
        mockPollFunction.mockRejectedValue(new Error('Error'));
        await pollingManager.poll();
        expect(pollingManager.getStats().healthStatus).toBe('warning');
        
        // Error state
        await pollingManager.poll();
        await pollingManager.poll();
        expect(pollingManager.getStats().healthStatus).toBe('error');
      });

      it('should handle null average interval', () => {
        const stats = pollingManager.getStats();
        expect(stats.averageInterval).toBeNull();
      });
    });

    describe('reset', () => {
      it('should reset polling state', async () => {
        pollingManager.start();
        await pollingManager.poll();
        
        pollingManager.reset();
        
        const state = pollingManager.getState();
        expect(state.isRunning).toBe(false);
        expect(state.runCount).toBe(0);
        expect(state.lastRunTime).toBeNull();
        expect(state.lastError).toBeNull();
        expect(state.consecutiveErrors).toBe(0);
      });
    });

    describe('cleanup', () => {
      it('should cleanup resources', () => {
        const stateListener = vi.fn();
        const resultListener = vi.fn();
        
        pollingManager.addStateListener(stateListener);
        pollingManager.addResultListener(resultListener);
        pollingManager.start();
        
        expect(stateListener).toHaveBeenCalledTimes(1); // From start
        
        pollingManager.cleanup();
        
        expect(pollingManager.isRunning()).toBe(false);
        
        // Should not notify listeners after cleanup
        stateListener.mockClear();
        pollingManager.start();
        expect(stateListener).not.toHaveBeenCalled(); // No listeners after cleanup
      });
    });
  });

  describe('createEmailPollingManager', () => {
    it('should create polling manager with email operations', () => {
      const mockEmailOps = {
        checkForNewEmails: vi.fn().mockResolvedValue({ newEmails: 5 })
      };
      
      const manager = createEmailPollingManager(mockEmailOps);
      
      expect(manager).toBeInstanceOf(PollingManager);
      
      manager.cleanup();
    });

    it('should configure poll function for email checking', async () => {
      const mockEmailOps = {
        checkForNewEmails: vi.fn().mockResolvedValue({ newEmails: 3 })
      };
      
      const manager = createEmailPollingManager(mockEmailOps);
      const result = await manager.poll();
      
      expect(result.success).toBe(true);
      expect(mockEmailOps.checkForNewEmails).toHaveBeenCalledWith(true);
      
      manager.cleanup();
    });

    it('should handle missing email operations', async () => {
      const manager = createEmailPollingManager(null);
      const result = await manager.poll();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email operations not available');
      
      manager.cleanup();
    });

    it('should handle email operations without checkForNewEmails method', async () => {
      const manager = createEmailPollingManager({});
      const result = await manager.poll();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email operations not available');
      
      manager.cleanup();
    });

    it('should accept custom config', () => {
      const config = { intervalSeconds: 120 };
      const manager = createEmailPollingManager({}, config);
      
      expect(manager.getConfig().intervalSeconds).toBe(120);
      
      manager.cleanup();
    });
  });

  describe('PollingUtils', () => {
    describe('calculateOptimalInterval', () => {
      it('should calculate optimal interval based on activity', () => {
        expect(PollingUtils.calculateOptimalInterval(60, 0)).toBe(60); // Low activity
        expect(PollingUtils.calculateOptimalInterval(60, 0.5)).toBe(45); // Medium activity
        expect(PollingUtils.calculateOptimalInterval(60, 1)).toBe(30); // High activity
      });

      it('should respect minimum interval', () => {
        const result = PollingUtils.calculateOptimalInterval(15, 1);
        expect(result).toBeGreaterThanOrEqual(10);
      });

      it('should handle edge cases', () => {
        expect(PollingUtils.calculateOptimalInterval(0, 0.5)).toBe(10); // Minimum enforced
        expect(PollingUtils.calculateOptimalInterval(100, 0)).toBe(100); // No change for low activity
      });
    });

    describe('shouldPausePolling', () => {
      it('should pause when offline', () => {
        expect(PollingUtils.shouldPausePolling({ isOnline: false })).toBe(true);
      });

      it('should pause when hidden without recent activity', () => {
        expect(PollingUtils.shouldPausePolling({ 
          isVisible: false, 
          hasRecentActivity: false 
        })).toBe(true);
      });

      it('should not pause when visible', () => {
        expect(PollingUtils.shouldPausePolling({ 
          isVisible: true, 
          isOnline: true 
        })).toBe(false);
      });

      it('should not pause when hidden with recent activity', () => {
        expect(PollingUtils.shouldPausePolling({ 
          isVisible: false, 
          hasRecentActivity: true, 
          isOnline: true 
        })).toBe(false);
      });

      it('should use default values', () => {
        expect(PollingUtils.shouldPausePolling({})).toBe(false);
      });
    });

    describe('formatInterval', () => {
      it('should format seconds', () => {
        expect(PollingUtils.formatInterval(30)).toBe('30 seconds');
        expect(PollingUtils.formatInterval(1)).toBe('1 seconds');
      });

      it('should format minutes', () => {
        expect(PollingUtils.formatInterval(60)).toBe('1 minute');
        expect(PollingUtils.formatInterval(120)).toBe('2 minutes');
        expect(PollingUtils.formatInterval(90)).toBe('2 minutes'); // Rounded
      });

      it('should format hours', () => {
        expect(PollingUtils.formatInterval(3600)).toBe('1 hour');
        expect(PollingUtils.formatInterval(7200)).toBe('2 hours');
        expect(PollingUtils.formatInterval(5400)).toBe('2 hours'); // Rounded
      });

      it('should handle edge cases', () => {
        expect(PollingUtils.formatInterval(0)).toBe('0 seconds');
        expect(PollingUtils.formatInterval(59)).toBe('59 seconds');
        expect(PollingUtils.formatInterval(61)).toBe('1 minute');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle multiple rapid start/stop calls', () => {
      const manager = new PollingManager();
      manager.setPollFunction(vi.fn());
      
      // Rapid start/stop
      expect(manager.start()).toBe(true);
      expect(manager.start()).toBe(false); // Already running
      expect(manager.stop()).toBe(true);
      expect(manager.stop()).toBe(false); // Not running
      expect(manager.start()).toBe(true);
      
      manager.cleanup();
    });

    it('should handle very short intervals', () => {
      const manager = new PollingManager({ intervalSeconds: 0.1 });
      manager.setPollFunction(vi.fn().mockResolvedValue({}));
      
      manager.start();
      vi.advanceTimersByTime(100);
      
      expect(manager.isRunning()).toBe(true);
      
      manager.cleanup();
    });

    it('should handle very long intervals', () => {
      const manager = new PollingManager({ intervalSeconds: 86400 }); // 24 hours
      manager.setPollFunction(vi.fn());
      
      manager.start();
      
      expect(manager.isRunning()).toBe(true);
      expect(manager.getState().intervalSeconds).toBe(86400);
      
      manager.cleanup();
    });

    it('should handle poll function that returns undefined', async () => {
      const manager = new PollingManager();
      manager.setPollFunction(vi.fn().mockResolvedValue(undefined));
      
      const result = await manager.poll();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      
      manager.cleanup();
    });

    it('should handle poll function that throws non-Error objects', async () => {
      const manager = new PollingManager();
      manager.setPollFunction(vi.fn().mockRejectedValue({ message: 'Custom error' }));
      
      const result = await manager.poll();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('[object Object]');
      
      manager.cleanup();
    });
  });
});
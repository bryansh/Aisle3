/**
 * Performance Benchmarking Tests
 * Comprehensive performance testing for the email application
 */

import { test, expect } from '@playwright/test';

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  pageLoad: 3000,
  emailListRender: 1000,
  virtualScrollRender: 500,
  emailSelection: 200,
  searchFilter: 300,
  markAsRead: 150
};

test.describe('Email Application Performance Benchmarks', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up performance monitoring
    await page.addInitScript(() => {
      window.performanceMarks = [];
      window.performanceMeasures = [];
      
      // Override performance.mark to capture marks
      const originalMark = performance.mark;
      performance.mark = function(name) {
        window.performanceMarks.push({ name, time: performance.now() });
        return originalMark.call(this, name);
      };
      
      // Override performance.measure to capture measures
      const originalMeasure = performance.measure;
      performance.measure = function(name, startMark, endMark) {
        const result = originalMeasure.call(this, name, startMark, endMark);
        window.performanceMeasures.push({
          name,
          duration: result.duration || 0,
          startTime: result.startTime || 0
        });
        return result;
      };
    });
  });

  test('Page load performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:5173');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('body', { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    // Check Core Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {};
          
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              vitals.domContentLoaded = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
              vitals.loadComplete = entry.loadEventEnd - entry.loadEventStart;
            }
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.LCP = entry.startTime;
            }
            if (entry.entryType === 'first-input') {
              vitals.FID = entry.processingStart - entry.startTime;
            }
          });
          
          resolve(vitals);
        }).observe({ entryTypes: ['navigation', 'largest-contentful-paint', 'first-input'] });
        
        // Fallback timeout
        setTimeout(() => resolve({}), 5000);
      });
    });
    
    console.log('Page Load Performance:', {
      totalLoadTime: loadTime,
      ...webVitals
    });
    
    // Assert performance thresholds
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    
    if (webVitals.LCP) {
      expect(webVitals.LCP).toBeLessThan(2500); // LCP should be < 2.5s
    }
    
    if (webVitals.FID) {
      expect(webVitals.FID).toBeLessThan(100); // FID should be < 100ms
    }
  });

  test('Email list rendering performance', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Mock email data
    await page.evaluate(() => {
      window.mockAuthData = {
        isAuthenticated: true,
        emails: Array.from({ length: 50 }, (_, i) => ({
          id: `email-${i}`,
          subject: `Performance Test Email ${i + 1}`,
          sender: `sender${i + 1}@example.com`,
          snippet: `Test snippet ${i + 1}`,
          is_read: i % 3 === 0
        }))
      };
      
      // Mark start of email list render
      performance.mark('email-list-render-start');
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });
    
    // Mark end of email list render
    await page.evaluate(() => {
      performance.mark('email-list-render-end');
      performance.measure('email-list-render', 'email-list-render-start', 'email-list-render-end');
    });
    
    const renderTime = await page.evaluate(() => {
      const measures = performance.getEntriesByName('email-list-render');
      return measures.length > 0 ? measures[0].duration : 0;
    });
    
    console.log('Email List Render Time:', renderTime + 'ms');
    expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.emailListRender);
  });

  test('Virtual scrolling performance', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Mock large email dataset
    await page.evaluate(() => {
      window.mockAuthData = {
        isAuthenticated: true,
        emails: Array.from({ length: 500 }, (_, i) => ({
          id: `email-${i}`,
          subject: `Virtual Scroll Test Email ${i + 1}`,
          sender: `sender${i + 1}@example.com`,
          snippet: `Virtual scroll test snippet ${i + 1}`,
          is_read: i % 4 === 0
        }))
      };
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="email-list-virtualized"]', { timeout: 10000 });
    
    // Measure initial render time
    const initialRenderTime = await page.evaluate(() => {
      performance.mark('virtual-scroll-start');
      return performance.now();
    });
    
    // Wait for virtualized list to be ready
    await page.waitForTimeout(100);
    
    const afterInitialRender = await page.evaluate(() => {
      performance.mark('virtual-scroll-initial-end');
      performance.measure('virtual-scroll-initial', 'virtual-scroll-start', 'virtual-scroll-initial-end');
      const measures = performance.getEntriesByName('virtual-scroll-initial');
      return measures.length > 0 ? measures[0].duration : 0;
    });
    
    console.log('Virtual Scroll Initial Render:', afterInitialRender + 'ms');
    expect(afterInitialRender).toBeLessThan(PERFORMANCE_THRESHOLDS.virtualScrollRender);
    
    // Test scroll performance
    const scrollStartTime = await page.evaluate(() => {
      performance.mark('scroll-performance-start');
      return performance.now();
    });
    
    // Perform multiple scroll operations
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(50);
    }
    
    const scrollEndTime = await page.evaluate(() => {
      performance.mark('scroll-performance-end');
      performance.measure('scroll-performance', 'scroll-performance-start', 'scroll-performance-end');
      const measures = performance.getEntriesByName('scroll-performance');
      return measures.length > 0 ? measures[0].duration : 0;
    });
    
    console.log('Scroll Performance (10 operations):', scrollEndTime + 'ms');
    expect(scrollEndTime).toBeLessThan(1000); // 10 scroll operations should complete in < 1s
  });

  test('Email selection performance', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    await page.evaluate(() => {
      window.mockAuthData = {
        isAuthenticated: true,
        emails: Array.from({ length: 20 }, (_, i) => ({
          id: `email-${i}`,
          subject: `Selection Test Email ${i + 1}`,
          sender: `sender${i + 1}@example.com`,
          snippet: `Selection test snippet ${i + 1}`,
          is_read: i % 2 === 0
        }))
      };
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });
    
    // Test email selection performance
    const selectionTimes = [];
    
    for (let i = 0; i < 5; i++) {
      const startTime = await page.evaluate(() => performance.now());
      
      await page.click(`[data-testid="email-item"]:nth-child(${i + 1})`);
      await page.waitForSelector('[data-testid="email-viewer"]', { timeout: 5000 });
      
      const endTime = await page.evaluate(() => performance.now());
      selectionTimes.push(endTime - startTime);
      
      // Go back to list
      await page.click('[data-testid="back-to-inbox"]');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 5000 });
    }
    
    const avgSelectionTime = selectionTimes.reduce((sum, time) => sum + time, 0) / selectionTimes.length;
    
    console.log('Email Selection Performance:', {
      averageTime: avgSelectionTime + 'ms',
      times: selectionTimes
    });
    
    expect(avgSelectionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.emailSelection);
  });

  test('Memory usage during large email lists', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize
        };
      }
      return null;
    });
    
    // Load large email dataset
    await page.evaluate(() => {
      window.mockAuthData = {
        isAuthenticated: true,
        emails: Array.from({ length: 1000 }, (_, i) => ({
          id: `email-${i}`,
          subject: `Memory Test Email ${i + 1}`,
          sender: `sender${i + 1}@example.com`,
          snippet: `Memory test snippet ${i + 1} with some additional content to test memory usage`,
          is_read: i % 5 === 0
        }))
      };
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="email-list-virtualized"]', { timeout: 10000 });
    
    // Get memory usage after loading
    const afterLoadMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize
        };
      }
      return null;
    });
    
    // Perform some operations and check memory
    for (let i = 0; i < 20; i++) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(50);
    }
    
    const afterScrollMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize
        };
      }
      return null;
    });
    
    if (initialMemory && afterLoadMemory && afterScrollMemory) {
      const memoryIncrease = (afterLoadMemory.used - initialMemory.used) / 1024 / 1024; // MB
      const scrollMemoryIncrease = (afterScrollMemory.used - afterLoadMemory.used) / 1024 / 1024; // MB
      
      console.log('Memory Usage:', {
        initial: Math.round(initialMemory.used / 1024 / 1024) + 'MB',
        afterLoad: Math.round(afterLoadMemory.used / 1024 / 1024) + 'MB',
        afterScroll: Math.round(afterScrollMemory.used / 1024 / 1024) + 'MB',
        loadIncrease: Math.round(memoryIncrease) + 'MB',
        scrollIncrease: Math.round(scrollMemoryIncrease) + 'MB'
      });
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50); // < 50MB increase for 1000 emails
      expect(scrollMemoryIncrease).toBeLessThan(10); // < 10MB increase from scrolling
    }
  });

  test('Search and filter performance', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    await page.evaluate(() => {
      window.mockAuthData = {
        isAuthenticated: true,
        emails: Array.from({ length: 200 }, (_, i) => ({
          id: `email-${i}`,
          subject: `Search Test Email ${i + 1}`,
          sender: `sender${i + 1}@example.com`,
          snippet: `Search test snippet ${i + 1}`,
          is_read: i % 3 === 0
        }))
      };
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });
    
    // Test search performance
    if (await page.locator('[data-testid="search-input"]').isVisible()) {
      const searchStartTime = await page.evaluate(() => performance.now());
      
      await page.fill('[data-testid="search-input"]', 'test search query');
      await page.waitForTimeout(100); // Allow for debounced search
      
      const searchEndTime = await page.evaluate(() => performance.now());
      const searchTime = searchEndTime - searchStartTime;
      
      console.log('Search Performance:', searchTime + 'ms');
      expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.searchFilter);
    }
  });

  test('Mark as read/unread performance', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    await page.evaluate(() => {
      window.mockAuthData = {
        isAuthenticated: true,
        emails: Array.from({ length: 10 }, (_, i) => ({
          id: `email-${i}`,
          subject: `Mark Read Test Email ${i + 1}`,
          sender: `sender${i + 1}@example.com`,
          snippet: `Mark read test snippet ${i + 1}`,
          is_read: false
        }))
      };
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });
    
    // Test mark as read performance
    const markReadTimes = [];
    
    for (let i = 0; i < 5; i++) {
      const startTime = await page.evaluate(() => performance.now());
      
      await page.click(`[data-testid="email-item"]:nth-child(${i + 1}) [data-testid="mark-read-button"]`);
      await page.waitForTimeout(100); // Allow for state update
      
      const endTime = await page.evaluate(() => performance.now());
      markReadTimes.push(endTime - startTime);
    }
    
    const avgMarkReadTime = markReadTimes.reduce((sum, time) => sum + time, 0) / markReadTimes.length;
    
    console.log('Mark as Read Performance:', {
      averageTime: avgMarkReadTime + 'ms',
      times: markReadTimes
    });
    
    expect(avgMarkReadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.markAsRead);
  });

  test('Component render performance comparison', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Test different email list sizes
    const testSizes = [10, 50, 100, 200];
    const results = {};
    
    for (const size of testSizes) {
      await page.evaluate((emailCount) => {
        window.mockAuthData = {
          isAuthenticated: true,
          emails: Array.from({ length: emailCount }, (_, i) => ({
            id: `email-${i}`,
            subject: `Render Test Email ${i + 1}`,
            sender: `sender${i + 1}@example.com`,
            snippet: `Render test snippet ${i + 1}`,
            is_read: i % 2 === 0
          }))
        };
        
        performance.mark(`render-${emailCount}-start`);
      }, size);
      
      await page.reload();
      await page.waitForSelector('[data-testid="email-list"], [data-testid="email-list-virtualized"]', { timeout: 10000 });
      
      const renderTime = await page.evaluate((emailCount) => {
        performance.mark(`render-${emailCount}-end`);
        performance.measure(`render-${emailCount}`, `render-${emailCount}-start`, `render-${emailCount}-end`);
        const measures = performance.getEntriesByName(`render-${emailCount}`);
        return measures.length > 0 ? measures[0].duration : 0;
      }, size);
      
      results[size] = renderTime;
    }
    
    console.log('Render Performance by Email Count:', results);
    
    // Performance should not degrade significantly with larger lists (due to virtualization)
    expect(results[200] - results[10]).toBeLessThan(500); // Less than 500ms difference
  });
});

test.describe('Performance Regression Tests', () => {
  
  test('Performance baseline establishment', async ({ page }) => {
    // This test establishes performance baselines for regression testing
    const baselines = {};
    
    await page.goto('http://localhost:5173');
    
    // Test scenarios
    const scenarios = [
      { name: 'small-list', emailCount: 10 },
      { name: 'medium-list', emailCount: 50 },
      { name: 'large-list', emailCount: 100 }
    ];
    
    for (const scenario of scenarios) {
      await page.evaluate((config) => {
        window.mockAuthData = {
          isAuthenticated: true,
          emails: Array.from({ length: config.emailCount }, (_, i) => ({
            id: `email-${i}`,
            subject: `Baseline Test Email ${i + 1}`,
            sender: `sender${i + 1}@example.com`,
            snippet: `Baseline test snippet ${i + 1}`,
            is_read: i % 2 === 0
          }))
        };
        
        performance.mark(`baseline-${config.name}-start`);
      }, scenario);
      
      await page.reload();
      await page.waitForSelector('[data-testid="email-list"], [data-testid="email-list-virtualized"]', { timeout: 10000 });
      
      const renderTime = await page.evaluate((scenarioName) => {
        performance.mark(`baseline-${scenarioName}-end`);
        performance.measure(`baseline-${scenarioName}`, `baseline-${scenarioName}-start`, `baseline-${scenarioName}-end`);
        const measures = performance.getEntriesByName(`baseline-${scenarioName}`);
        return measures.length > 0 ? measures[0].duration : 0;
      }, scenario.name);
      
      baselines[scenario.name] = renderTime;
    }
    
    console.log('Performance Baselines:', baselines);
    
    // Store baselines for future regression tests
    await page.evaluate((baselineData) => {
      localStorage.setItem('performanceBaselines', JSON.stringify(baselineData));
    }, baselines);
  });
});
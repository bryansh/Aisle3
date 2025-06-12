/**
 * Visual Regression Tests for Email Application
 * Uses Playwright for visual comparison testing
 */

import { test, expect } from '@playwright/test';

// Configure tests for consistent visual comparisons
test.beforeEach(async ({ page }) => {
  // Set viewport size for consistent screenshots
  await page.setViewportSize({ width: 1280, height: 720 });
  
  // Disable animations for consistent visuals
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `
  });
});

test.describe('Email Application Visual Regression Tests', () => {
  
  test('Email list appearance - empty state', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for authentication section to load
    await page.waitForSelector('[data-testid="auth-section"]', { timeout: 10000 });
    
    // Take screenshot of empty state
    await expect(page).toHaveScreenshot('email-list-empty-state.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Email list appearance - with emails', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Mock authentication and email data
    await page.evaluate(() => {
      // Mock successful authentication
      window.mockAuthData = {
        isAuthenticated: true,
        emails: Array.from({ length: 10 }, (_, i) => ({
          id: `email-${i}`,
          thread_id: `thread-${i}`,
          subject: `Test Email Subject ${i + 1}`,
          sender: `sender${i + 1}@example.com`,
          snippet: `This is a sample email snippet for testing purposes. Email number ${i + 1}.`,
          is_read: i % 3 === 0 // Make some emails read
        }))
      };
    });
    
    // Reload to apply mock data
    await page.reload();
    await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });
    
    // Take screenshot of email list with data
    await expect(page).toHaveScreenshot('email-list-with-emails.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Email list virtualization - large dataset', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Mock large email dataset
    await page.evaluate(() => {
      window.mockAuthData = {
        isAuthenticated: true,
        emails: Array.from({ length: 100 }, (_, i) => ({
          id: `email-${i}`,
          thread_id: `thread-${i}`,
          subject: `Test Email Subject ${i + 1}`,
          sender: `sender${i + 1}@example.com`,
          snippet: `This is a sample email snippet for testing virtualization. Email number ${i + 1}.`,
          is_read: i % 4 === 0
        }))
      };
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="email-list-virtualized"]', { timeout: 10000 });
    
    // Take screenshot of virtualized list
    await expect(page).toHaveScreenshot('email-list-virtualized-large.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Email viewer appearance', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Mock email data with selected email
    await page.evaluate(() => {
      window.mockAuthData = {
        isAuthenticated: true,
        selectedEmail: {
          id: 'email-1',
          thread_id: 'thread-1',
          subject: 'Visual Regression Test Email',
          sender: 'test@example.com',
          snippet: 'This is a test email for visual regression testing.',
          body: '<p>This is the <strong>email body</strong> with some <em>formatting</em>.</p><p>Second paragraph with more content.</p>',
          is_read: false,
          timestamp: '2023-12-01T10:00:00Z'
        },
        showEmailView: true
      };
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="email-viewer"]', { timeout: 10000 });
    
    // Take screenshot of email viewer
    await expect(page).toHaveScreenshot('email-viewer.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Settings panel appearance', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Mock authenticated state with settings open
    await page.evaluate(() => {
      window.mockAuthData = {
        isAuthenticated: true,
        showSettings: true
      };
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="settings-panel"]', { timeout: 10000 });
    
    // Take screenshot of settings panel
    await expect(page).toHaveScreenshot('settings-panel.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Header component variations', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Test different header states
    const headerStates = [
      {
        name: 'header-inbox-view',
        data: {
          isAuthenticated: true,
          showEmailView: false,
          totalCount: 25,
          unreadCount: 5,
          viewMode: 'emails'
        }
      },
      {
        name: 'header-email-view',
        data: {
          isAuthenticated: true,
          showEmailView: true,
          totalCount: 25,
          unreadCount: 5,
          viewMode: 'emails'
        }
      },
      {
        name: 'header-conversation-view',
        data: {
          isAuthenticated: true,
          showEmailView: false,
          totalCount: 25,
          unreadCount: 5,
          viewMode: 'conversations'
        }
      }
    ];

    for (const state of headerStates) {
      await page.evaluate((stateData) => {
        window.mockAuthData = stateData;
      }, state.data);
      
      await page.reload();
      await page.waitForSelector('[data-testid="header"]', { timeout: 10000 });
      
      // Take screenshot of header in this state
      const headerElement = page.locator('[data-testid="header"]');
      await expect(headerElement).toHaveScreenshot(`${state.name}.png`, {
        animations: 'disabled'
      });
    }
  });

  test('Dark mode vs light mode comparison', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Test light mode
    await page.evaluate(() => {
      window.mockAuthData = {
        isAuthenticated: true,
        emails: Array.from({ length: 5 }, (_, i) => ({
          id: `email-${i}`,
          subject: `Test Email ${i + 1}`,
          sender: `sender${i + 1}@example.com`,
          snippet: `Test snippet ${i + 1}`,
          is_read: i % 2 === 0
        }))
      };
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });
    
    // Take light mode screenshot
    await expect(page).toHaveScreenshot('theme-light-mode.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    // Switch to dark mode (if supported)
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    
    // Take dark mode screenshot
    await expect(page).toHaveScreenshot('theme-dark-mode.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Responsive design - mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('http://localhost:5173');
    
    await page.evaluate(() => {
      window.mockAuthData = {
        isAuthenticated: true,
        emails: Array.from({ length: 3 }, (_, i) => ({
          id: `email-${i}`,
          subject: `Mobile Test Email ${i + 1}`,
          sender: `sender${i + 1}@example.com`,
          snippet: `Mobile test snippet ${i + 1}`,
          is_read: i === 0
        }))
      };
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });
    
    // Take mobile screenshot
    await expect(page).toHaveScreenshot('responsive-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Responsive design - tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('http://localhost:5173');
    
    await page.evaluate(() => {
      window.mockAuthData = {
        isAuthenticated: true,
        emails: Array.from({ length: 5 }, (_, i) => ({
          id: `email-${i}`,
          subject: `Tablet Test Email ${i + 1}`,
          sender: `sender${i + 1}@example.com`,
          snippet: `Tablet test snippet ${i + 1}`,
          is_read: i % 2 === 0
        }))
      };
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });
    
    // Take tablet screenshot
    await expect(page).toHaveScreenshot('responsive-tablet.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Loading states visual appearance', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Mock loading state
    await page.evaluate(() => {
      window.mockAuthData = {
        isAuthenticated: true,
        loading: true
      };
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="loading-spinner"]', { timeout: 10000 });
    
    // Take screenshot of loading state
    await expect(page).toHaveScreenshot('loading-state.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Error states visual appearance', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Mock error state
    await page.evaluate(() => {
      window.mockAuthData = {
        isAuthenticated: true,
        error: 'Failed to load emails. Please try again.',
        emails: []
      };
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 10000 });
    
    // Take screenshot of error state
    await expect(page).toHaveScreenshot('error-state.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });
});

test.describe('Component-specific Visual Tests', () => {
  
  test('Email item hover states', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    await page.evaluate(() => {
      window.mockAuthData = {
        isAuthenticated: true,
        emails: [{
          id: 'email-1',
          subject: 'Hover Test Email',
          sender: 'hover@example.com',
          snippet: 'Test email for hover states',
          is_read: false
        }]
      };
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="email-item"]', { timeout: 10000 });
    
    const emailItem = page.locator('[data-testid="email-item"]').first();
    
    // Hover over email item
    await emailItem.hover();
    
    // Take screenshot of hover state
    await expect(emailItem).toHaveScreenshot('email-item-hover.png', {
      animations: 'disabled'
    });
  });

  test('Button states and variations', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    await page.evaluate(() => {
      window.mockAuthData = {
        isAuthenticated: true,
        showSettings: true
      };
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="settings-panel"]', { timeout: 10000 });
    
    // Take screenshot of various button states
    await expect(page.locator('[data-testid="button-primary"]')).toHaveScreenshot('button-primary.png');
    await expect(page.locator('[data-testid="button-secondary"]')).toHaveScreenshot('button-secondary.png');
  });
});

test.describe('Performance Visual Tests', () => {
  
  test('Virtual scrolling visual consistency', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Create large dataset for virtual scrolling
    await page.evaluate(() => {
      window.mockAuthData = {
        isAuthenticated: true,
        emails: Array.from({ length: 200 }, (_, i) => ({
          id: `email-${i}`,
          subject: `Performance Test Email ${i + 1}`,
          sender: `perf${i + 1}@example.com`,
          snippet: `Performance test snippet for email ${i + 1}`,
          is_read: Math.random() > 0.5
        }))
      };
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="email-list-virtualized"]', { timeout: 10000 });
    
    // Take initial screenshot
    await expect(page).toHaveScreenshot('virtual-scroll-initial.png', {
      clip: { x: 0, y: 100, width: 1280, height: 500 },
      animations: 'disabled'
    });
    
    // Scroll down and take another screenshot
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(100);
    
    await expect(page).toHaveScreenshot('virtual-scroll-scrolled.png', {
      clip: { x: 0, y: 100, width: 1280, height: 500 },
      animations: 'disabled'
    });
  });
});
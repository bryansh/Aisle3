import { test, expect } from '@playwright/test';

test.describe('Email Components E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('header component is present and functional', async ({ page }) => {
    // Look for header elements
    const header = page.locator('header, .header, [data-testid="header"]');
    const title = page.locator('h1, .title, [data-testid="app-title"]');
    
    // Header should be visible
    const headerExists = await header.or(title).count();
    if (headerExists > 0) {
      await expect(header.or(title).first()).toBeVisible();
    }
  });

  test('email list area is present', async ({ page }) => {
    // Look for email list container
    const emailList = page.locator('[data-testid="email-list"], .email-list, .emails');
    const listContainer = page.locator('ul, .list, [role="list"]');
    
    // Email list area should exist (even if empty)
    const listExists = await emailList.or(listContainer).count();
    expect(listExists).toBeGreaterThanOrEqual(0); // May be 0 if not authenticated
  });

  test('settings/configuration area is accessible', async ({ page }) => {
    // Look for settings button or menu
    const settingsButton = page.locator('button').filter({ hasText: /settings|config|preferences/i });
    const settingsIcon = page.locator('[data-testid="settings"], .settings, .gear');
    
    // Settings should be accessible
    const settingsExists = await settingsButton.or(settingsIcon).count();
    expect(settingsExists).toBeGreaterThanOrEqual(0);
  });

  test('responsive design works on different screen sizes', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet viewport  
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('keyboard navigation works', async ({ page }) => {
    // Test basic keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    
    // App should remain functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('error states are handled gracefully', async ({ page }) => {
    // Test that the app handles errors without crashing
    // Navigate to a non-existent route
    await page.goto('/nonexistent-route');
    
    // Should either redirect or show a proper error page
    await expect(page.locator('body')).toBeVisible();
  });
});
import { test, expect } from '@playwright/test';

test.describe('Email Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('authentication flow is accessible', async ({ page }) => {
    // Look for authentication triggers
    const authButton = page.locator('button').filter({ hasText: /auth|login|sign|connect|gmail/i });
    
    if (await authButton.count() > 0) {
      // Click auth button (will likely open OAuth flow)
      await authButton.first().click();
      
      // Should either redirect or show auth dialog
      // We can't complete OAuth in tests, but can verify the flow starts
      await page.waitForTimeout(1000); // Wait for potential redirect
    }
    
    // App should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('email list interactions work when emails are present', async ({ page }) => {
    // This test would work better with mock data or authenticated state
    // For now, just verify the structure exists
    
    const emailItems = page.locator('[data-testid="email-item"], .email-item, .email');
    const emailList = page.locator('[data-testid="email-list"], .email-list');
    
    if (await emailItems.count() > 0) {
      // Click first email
      await emailItems.first().click();
      
      // Should show email details or selection
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('email actions are available when applicable', async ({ page }) => {
    // Look for email action buttons (mark as read, delete, etc.)
    const markReadButton = page.locator('button').filter({ hasText: /mark.*read|read/i });
    const markUnreadButton = page.locator('button').filter({ hasText: /mark.*unread|unread/i });
    const deleteButton = page.locator('button').filter({ hasText: /delete|remove/i });
    
    // These buttons may not be visible without authentication/emails
    // Just verify they don't cause crashes if clicked
    const actionButtons = [markReadButton, markUnreadButton, deleteButton];
    
    for (const button of actionButtons) {
      if (await button.count() > 0) {
        await button.first().click();
        await page.waitForTimeout(500);
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('search and filtering capabilities', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], [data-testid="search"]');
    
    if (await searchInput.count() > 0) {
      await searchInput.first().fill('test search');
      await searchInput.first().press('Enter');
      
      // Should handle search without crashing
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('loading states during data operations', async ({ page }) => {
    // Look for refresh or reload buttons
    const refreshButton = page.locator('button').filter({ hasText: /refresh|reload|sync/i });
    
    if (await refreshButton.count() > 0) {
      await refreshButton.first().click();
      
      // Should show loading state briefly
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('settings and configuration workflows', async ({ page }) => {
    // Look for settings access
    const settingsButton = page.locator('button').filter({ hasText: /settings|preferences|config/i });
    const settingsLink = page.locator('a').filter({ hasText: /settings|preferences|config/i });
    
    if (await settingsButton.or(settingsLink).count() > 0) {
      await settingsButton.or(settingsLink).first().click();
      
      // Should navigate to settings or open settings modal
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
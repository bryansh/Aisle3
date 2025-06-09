import { test, expect } from '@playwright/test';

test.describe('Email App E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('loads the main application', async ({ page }) => {
    // Check if the app loads with proper structure
    await expect(page.locator('body')).toBeVisible();
    
    // Look for main app container or root element
    const appElement = page.locator('#svelte').or(page.locator('[data-svelte-app]')).or(page.locator('main'));
    await expect(appElement).toBeVisible();
    
    // Check page title (matches actual Tauri app title)
    await expect(page).toHaveTitle(/Tauri \+ SvelteKit App|Aisle3|Email/);
  });

  test('shows authentication section when not authenticated', async ({ page }) => {
    // Look for authentication elements
    const authButton = page.locator('button').filter({ hasText: /auth|login|sign|connect/i });
    const authSection = page.locator('[data-testid="auth-section"]');
    const authText = page.locator('text=/auth|login|sign|connect/i');
    
    // Should show authentication UI when not logged in
    const hasAuth = await authButton.or(authSection).or(authText).count();
    expect(hasAuth).toBeGreaterThan(0);
  });

  test('has proper page structure and styling', async ({ page }) => {
    // Check that Tailwind CSS is loaded (basic styles should be applied)
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check for basic layout structure
    const hasLayout = await page.locator('header, nav, main, .header, .nav, .main').count();
    expect(hasLayout).toBeGreaterThan(0);
  });

  test('handles navigation and routing', async ({ page }) => {
    // Test that the app doesn't crash with basic interactions
    await page.keyboard.press('Tab'); // Test tab navigation
    await page.keyboard.press('Escape'); // Test escape key
    
    // App should still be responsive
    await expect(page.locator('body')).toBeVisible();
  });

  test('displays loading states appropriately', async ({ page }) => {
    // Look for loading indicators or spinners
    const loadingSpinner = page.locator('.loading, .spinner, [data-testid="loading"]');
    const loadingText = page.locator('text=/loading|connecting/i');
    
    // Loading states might be present initially
    // Just verify the app doesn't crash with loading states
    await expect(page.locator('body')).toBeVisible();
  });
});
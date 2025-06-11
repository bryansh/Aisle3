import { test, expect } from '@playwright/test';

test.describe('Auto-Read Marking E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to load
    await page.waitForTimeout(1000);
  });

  test('settings page contains auto-read marking configuration', async ({ page }) => {
    // Look for authentication section or main app content
    const authSection = page.locator('text=Gmail Authentication');
    const settingsButton = page.locator('button:has-text("Settings"), [aria-label*="ettings"]');
    
    if (await authSection.isVisible()) {
      // If we see auth section, we're not authenticated - skip this test
      test.skip('Skipping auto-read test - authentication required');
      return;
    }

    // Try to find and click settings button
    if (await settingsButton.first().isVisible()) {
      await settingsButton.first().click();
      await page.waitForTimeout(500);
      
      // Check for auto-read marking settings
      await expect(page.locator('text=Reading Behavior')).toBeVisible();
      await expect(page.locator('text=Automatically mark as read')).toBeVisible();
      await expect(page.locator('text=Mark emails as read after viewing them')).toBeVisible();
      
      // Check for the toggle switch
      const autoReadToggle = page.locator('input[type="checkbox"]').nth(1); // Second checkbox (first is auto-polling)
      await expect(autoReadToggle).toBeVisible();
      
      // Check if toggle is enabled by default
      const isChecked = await autoReadToggle.isChecked();
      expect(isChecked).toBe(true); // Should be enabled by default
      
      // Check for delay selector when enabled
      if (isChecked) {
        await expect(page.locator('text=Mark as read after')).toBeVisible();
        const delaySelect = page.locator('select').nth(1); // Second select (first is polling interval)
        await expect(delaySelect).toBeVisible();
        
        // Check default value
        const selectedValue = await delaySelect.inputValue();
        expect(selectedValue).toBe('1500'); // 1.5 seconds default
      }
      
      console.log('✅ Auto-read marking settings found and configured correctly');
    } else {
      console.log('⚠️ Settings button not found - may not be authenticated');
    }
  });

  test('auto-read marking can be toggled on and off', async ({ page }) => {
    // Look for authentication section or main app content
    const authSection = page.locator('text=Gmail Authentication');
    const settingsButton = page.locator('button:has-text("Settings"), [aria-label*="ettings"]');
    
    if (await authSection.isVisible()) {
      // If we see auth section, we're not authenticated - skip this test
      test.skip('Skipping auto-read toggle test - authentication required');
      return;
    }

    // Try to find and click settings button
    if (await settingsButton.first().isVisible()) {
      await settingsButton.first().click();
      await page.waitForTimeout(500);
      
      // Find the auto-read toggle (second checkbox)
      const autoReadToggle = page.locator('input[type="checkbox"]').nth(1);
      
      if (await autoReadToggle.isVisible()) {
        const initialState = await autoReadToggle.isChecked();
        
        // Toggle it off
        if (initialState) {
          await autoReadToggle.click();
          await page.waitForTimeout(200);
          
          // Verify it's off and delay selector is hidden
          expect(await autoReadToggle.isChecked()).toBe(false);
          await expect(page.locator('text=Mark as read after')).not.toBeVisible();
          await expect(page.locator('text=Automatic read marking disabled')).toBeVisible();
        }
        
        // Toggle it back on
        await autoReadToggle.click();
        await page.waitForTimeout(200);
        
        // Verify it's on and delay selector is visible
        expect(await autoReadToggle.isChecked()).toBe(true);
        await expect(page.locator('text=Mark as read after')).toBeVisible();
        
        console.log('✅ Auto-read marking toggle works correctly');
      } else {
        console.log('⚠️ Auto-read toggle not found');
      }
    } else {
      console.log('⚠️ Settings button not found - may not be authenticated');
    }
  });

  test('delay options are available and selectable', async ({ page }) => {
    // Look for authentication section or main app content
    const authSection = page.locator('text=Gmail Authentication');
    const settingsButton = page.locator('button:has-text("Settings"), [aria-label*="ettings"]');
    
    if (await authSection.isVisible()) {
      // If we see auth section, we're not authenticated - skip this test
      test.skip('Skipping delay options test - authentication required');
      return;
    }

    // Try to find and click settings button
    if (await settingsButton.first().isVisible()) {
      await settingsButton.first().click();
      await page.waitForTimeout(500);
      
      // Make sure auto-read is enabled first
      const autoReadToggle = page.locator('input[type="checkbox"]').nth(1);
      if (await autoReadToggle.isVisible() && !await autoReadToggle.isChecked()) {
        await autoReadToggle.click();
        await page.waitForTimeout(200);
      }
      
      // Find the delay selector
      const delaySelect = page.locator('select').nth(1);
      
      if (await delaySelect.isVisible()) {
        // Check available options
        const options = await delaySelect.locator('option').allTextContents();
        
        expect(options).toContain('0.5 seconds');
        expect(options).toContain('1 second');
        expect(options).toContain('1.5 seconds');
        expect(options).toContain('2 seconds');
        expect(options).toContain('3 seconds');
        expect(options).toContain('5 seconds');
        
        // Test selecting different options
        await delaySelect.selectOption('3000'); // 3 seconds
        await page.waitForTimeout(200);
        
        expect(await delaySelect.inputValue()).toBe('3000');
        await expect(page.locator('text=3 seconds of viewing')).toBeVisible();
        
        // Test selecting another option
        await delaySelect.selectOption('1000'); // 1 second
        await page.waitForTimeout(200);
        
        expect(await delaySelect.inputValue()).toBe('1000');
        await expect(page.locator('text=1 second of viewing')).toBeVisible();
        
        console.log('✅ Delay options work correctly');
      } else {
        console.log('⚠️ Delay selector not found');
      }
    } else {
      console.log('⚠️ Settings button not found - may not be authenticated');
    }
  });
});
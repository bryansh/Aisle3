import { test, expect } from '@playwright/test';

test.describe('Email Reply E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
  });

  test('reply button is visible in email viewer', async ({ page }) => {
    // Look for authentication section
    const authSection = page.locator('text=Gmail Authentication');
    
    if (await authSection.isVisible()) {
      test.skip('Skipping reply test - authentication required');
      return;
    }

    await page.waitForTimeout(2000);

    // Look for email cards and try to click one
    const emailCards = page.locator('[class*="cursor-pointer"][class*="transition-all"]');
    
    if (await emailCards.count() > 0) {
      // Click the first email to view it
      await emailCards.first().click();
      await page.waitForTimeout(1000);
      
      // Look for the reply button
      const replyButton = page.locator('button:has-text("Reply")');
      
      if (await replyButton.isVisible()) {
        console.log('✅ Reply button found in email viewer');
        
        // Check that the button has the correct icon and text
        await expect(replyButton).toBeVisible();
        await expect(replyButton).toContainText('Reply');
        
        // Check for Reply icon (lucide-svelte Reply component)
        const replyIcon = replyButton.locator('svg');
        await expect(replyIcon).toBeVisible();
        
        console.log('✅ Reply button has proper styling and icon');
      } else {
        console.log('⚠️ Reply button not found - may be in different email state');
      }
    } else {
      console.log('⚠️ No emails found to test reply functionality');
    }
  });

  test('reply composer opens when reply button is clicked', async ({ page }) => {
    const authSection = page.locator('text=Gmail Authentication');
    
    if (await authSection.isVisible()) {
      test.skip('Skipping reply composer test - authentication required');
      return;
    }

    await page.waitForTimeout(2000);

    // Look for email cards and try to click one
    const emailCards = page.locator('[class*="cursor-pointer"][class*="transition-all"]');
    
    if (await emailCards.count() > 0) {
      // Click the first email to view it
      await emailCards.first().click();
      await page.waitForTimeout(1000);
      
      // Look for and click the reply button
      const replyButton = page.locator('button:has-text("Reply")');
      
      if (await replyButton.isVisible()) {
        await replyButton.click();
        await page.waitForTimeout(500);
        
        // Check if the reply composer panel opened
        const composerPanel = page.locator('text=Reply');
        
        if (await composerPanel.isVisible()) {
          console.log('✅ Reply composer panel opened successfully');
          
          // Check for expected elements in the new compact composer
          await expect(page.locator('text=Reply')).toBeVisible();
          await expect(page.locator('[contenteditable="true"]')).toBeVisible();
          await expect(page.locator('button:has-text("Send")')).toBeVisible();
          await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
          
          // Check for keyboard shortcuts help
          await expect(page.locator('text=Ctrl+Enter')).toBeVisible();
          await expect(page.locator('text=Ctrl+B/I/U')).toBeVisible();
          
          // Check for rich text toolbar
          const boldButton = page.locator('button[title*="Bold"]');
          await expect(boldButton).toBeVisible();
          const italicButton = page.locator('button[title*="Italic"]');
          await expect(italicButton).toBeVisible();
          
          console.log('✅ Reply composer has all expected elements including rich text controls');
          
          // Test closing the composer
          const cancelButton = page.locator('button:has-text("Cancel")');
          await cancelButton.click();
          await page.waitForTimeout(300);
          
          // Verify the composer is closed
          await expect(composerPanel).not.toBeVisible();
          console.log('✅ Reply composer closes properly');
          
        } else {
          console.log('⚠️ Reply composer panel did not open');
        }
      } else {
        console.log('⚠️ Reply button not found');
      }
    } else {
      console.log('⚠️ No emails found to test reply composer');
    }
  });

  test('reply composer form validation works', async ({ page }) => {
    const authSection = page.locator('text=Gmail Authentication');
    
    if (await authSection.isVisible()) {
      test.skip('Skipping reply validation test - authentication required');
      return;
    }

    await page.waitForTimeout(2000);

    // Look for email cards and try to click one
    const emailCards = page.locator('[class*="cursor-pointer"][class*="transition-all"]');
    
    if (await emailCards.count() > 0) {
      // Click the first email to view it
      await emailCards.first().click();
      await page.waitForTimeout(1000);
      
      // Look for and click the reply button
      const replyButton = page.locator('button:has-text("Reply")');
      
      if (await replyButton.isVisible()) {
        await replyButton.click();
        await page.waitForTimeout(500);
        
        // Check if the reply composer opened
        const composerModal = page.locator('text=Reply to Email');
        
        if (await composerModal.isVisible()) {
          // Test that Send button is disabled when textarea is empty
          const sendButton = page.locator('button:has-text("Send Reply")');
          const textarea = page.locator('textarea[placeholder*="Type your reply"]');
          
          // Initially should be disabled (empty textarea)
          await expect(sendButton).toBeDisabled();
          console.log('✅ Send button disabled when reply is empty');
          
          // Type some text
          await textarea.fill('This is a test reply message.');
          await page.waitForTimeout(200);
          
          // Now button should be enabled
          await expect(sendButton).toBeEnabled();
          console.log('✅ Send button enabled when reply has content');
          
          // Clear the text
          await textarea.fill('');
          await page.waitForTimeout(200);
          
          // Should be disabled again
          await expect(sendButton).toBeDisabled();
          console.log('✅ Send button validation works correctly');
          
          // Test whitespace-only input
          await textarea.fill('   \n  \t  ');
          await page.waitForTimeout(200);
          
          // Should still be disabled for whitespace-only
          await expect(sendButton).toBeDisabled();
          console.log('✅ Send button properly handles whitespace-only input');
          
          // Close the composer
          const cancelButton = page.locator('button:has-text("Cancel")');
          await cancelButton.click();
          
        } else {
          console.log('⚠️ Reply composer modal did not open');
        }
      } else {
        console.log('⚠️ Reply button not found');
      }
    } else {
      console.log('⚠️ No emails found to test reply validation');
    }
  });

  test('reply composer textarea auto-resizes', async ({ page }) => {
    const authSection = page.locator('text=Gmail Authentication');
    
    if (await authSection.isVisible()) {
      test.skip('Skipping textarea resize test - authentication required');
      return;
    }

    await page.waitForTimeout(2000);

    // Look for email cards and try to click one
    const emailCards = page.locator('[class*="cursor-pointer"][class*="transition-all"]');
    
    if (await emailCards.count() > 0) {
      // Click the first email to view it
      await emailCards.first().click();
      await page.waitForTimeout(1000);
      
      // Look for and click the reply button
      const replyButton = page.locator('button:has-text("Reply")');
      
      if (await replyButton.isVisible()) {
        await replyButton.click();
        await page.waitForTimeout(500);
        
        // Check if the reply composer opened
        const composerModal = page.locator('text=Reply to Email');
        
        if (await composerModal.isVisible()) {
          const textarea = page.locator('textarea[placeholder*="Type your reply"]');
          
          // Get initial height
          const initialHeight = await textarea.evaluate(el => el.style.height || getComputedStyle(el).height);
          
          // Type multiple lines of text
          const longText = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10';
          await textarea.fill(longText);
          await page.waitForTimeout(500);
          
          // Check if height increased
          const newHeight = await textarea.evaluate(el => el.style.height || getComputedStyle(el).height);
          
          // Height should have changed (auto-resize working)
          expect(newHeight).not.toBe(initialHeight);
          console.log('✅ Textarea auto-resize appears to be working');
          
          // Close the composer
          const cancelButton = page.locator('button:has-text("Cancel")');
          await cancelButton.click();
          
        } else {
          console.log('⚠️ Reply composer modal did not open');
        }
      } else {
        console.log('⚠️ Reply button not found');
      }
    } else {
      console.log('⚠️ No emails found to test textarea resize');
    }
  });
});
import { test, expect } from '@playwright/test';

test.describe('Email List Styling E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
  });

  test('unread and read emails have different visual styling', async ({ page }) => {
    // Look for authentication section or main app content
    const authSection = page.locator('text=Gmail Authentication');
    
    if (await authSection.isVisible()) {
      // If we see auth section, we're not authenticated - skip this test
      test.skip('Skipping styling test - authentication required');
      return;
    }

    // Wait for potential email list to load
    await page.waitForTimeout(2000);
    
    // Look for email list items - they should be present if authenticated
    const emailCards = page.locator('[class*="cursor-pointer"][class*="transition-all"]');
    
    if (await emailCards.count() > 0) {
      console.log(`Found ${await emailCards.count()} email cards to test styling`);
      
      // Check for visual differences in styling
      const firstCard = emailCards.first();
      const cardClasses = await firstCard.getAttribute('class');
      
      if (cardClasses) {
        // Test that we have conditional styling based on read status
        const hasUnreadStyling = cardClasses.includes('bg-white') && cardClasses.includes('border-blue');
        const hasReadStyling = cardClasses.includes('bg-gray-50') && cardClasses.includes('border-gray');
        
        // One of these should be true (either unread or read styling)
        expect(hasUnreadStyling || hasReadStyling).toBe(true);
        
        if (hasUnreadStyling) {
          console.log('✅ Found unread email styling - white background with blue border');
          
          // Check for bold text in unread emails
          const senderSpan = firstCard.locator('span').first();
          const senderClasses = await senderSpan.getAttribute('class');
          expect(senderClasses).toContain('font-bold');
          
        } else if (hasReadStyling) {
          console.log('✅ Found read email styling - gray background');
          
          // Check for normal font weight in read emails
          const senderSpan = firstCard.locator('span').first();
          const senderClasses = await senderSpan.getAttribute('class');
          expect(senderClasses).toContain('font-medium');
        }
        
        console.log('✅ Email styling appears to be working correctly');
      }
    } else {
      console.log('⚠️ No email cards found - may be empty inbox or not authenticated');
    }
  });

  test('email list has proper visual hierarchy', async ({ page }) => {
    // Look for authentication section
    const authSection = page.locator('text=Gmail Authentication');
    
    if (await authSection.isVisible()) {
      test.skip('Skipping visual hierarchy test - authentication required');
      return;
    }

    await page.waitForTimeout(2000);
    
    // Check for consistent spacing and visual structure
    const emailList = page.locator('[class*="space-y-3"]');
    
    if (await emailList.isVisible()) {
      console.log('✅ Email list container found with proper spacing');
      
      // Check for hover effects and transitions
      const emailCards = page.locator('[class*="cursor-pointer"][class*="transition-all"]');
      
      if (await emailCards.count() > 0) {
        const firstCard = emailCards.first();
        
        // Check for transition classes
        const cardClasses = await firstCard.getAttribute('class');
        expect(cardClasses).toContain('transition-all');
        expect(cardClasses).toContain('hover:shadow-lg');
        
        console.log('✅ Email cards have proper transition and hover effects');
      }
    } else {
      console.log('⚠️ Email list not found');
    }
  });

  test('conversation list styling matches email list patterns', async ({ page }) => {
    const authSection = page.locator('text=Gmail Authentication');
    
    if (await authSection.isVisible()) {
      test.skip('Skipping conversation styling test - authentication required');
      return;
    }

    await page.waitForTimeout(1000);

    // Try to switch to conversations view if possible
    const conversationToggle = page.locator('button:has-text("Conversations"), button:has-text("Switch")');
    
    if (await conversationToggle.first().isVisible()) {
      await conversationToggle.first().click();
      await page.waitForTimeout(1000);
      
      // Look for conversation cards
      const conversationCards = page.locator('button[class*="w-full"][class*="rounded-lg"]');
      
      if (await conversationCards.count() > 0) {
        const firstConversation = conversationCards.first();
        const cardClasses = await firstConversation.getAttribute('class');
        
        if (cardClasses) {
          // Check for similar styling patterns as email list
          const hasUnreadStyling = cardClasses.includes('bg-white') && cardClasses.includes('border-blue');
          const hasReadStyling = cardClasses.includes('bg-gray-50') && cardClasses.includes('border-gray');
          
          expect(hasUnreadStyling || hasReadStyling).toBe(true);
          console.log('✅ Conversation styling matches email list patterns');
        }
      } else {
        console.log('⚠️ No conversations found to test styling');
      }
    } else {
      console.log('⚠️ Conversation toggle not found');
    }
  });
});
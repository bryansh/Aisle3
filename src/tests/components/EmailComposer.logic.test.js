import { describe, it, expect } from 'vitest';

/**
 * Tests for EmailComposer business logic functions
 * These functions are extracted from the component for independent testing
 */

describe('EmailComposer Business Logic', () => {
  describe('makeEmailSafe function', () => {
    // This is the actual function from EmailComposer.svelte
    function makeEmailSafe(html) {
      return html
        // Remove any data attributes that editors might add
        .replace(/\s+data-[a-z-]+="[^"]*"/gi, '')
        // Clean up any editor-specific classes
        .replace(/\s+class="ProseMirror[^"]*"/gi, '')
        // Ensure consistent spacing
        .replace(/\s+/g, ' ')
        .trim();
    }

    it('removes data attributes from HTML', () => {
      const input = '<p data-editor-id="123" data-test="value">Content</p>';
      const result = makeEmailSafe(input);
      expect(result).toBe('<p>Content</p>');
    });

    it('removes ProseMirror classes', () => {
      const input = '<div class="ProseMirror-widget">Content</div>';
      const result = makeEmailSafe(input);
      expect(result).toBe('<div>Content</div>');
    });

    it('normalizes whitespace', () => {
      const input = '<p>  Multiple   spaces  </p>';
      const result = makeEmailSafe(input);
      expect(result).toBe('<p> Multiple spaces </p>');
    });

    it('handles complex HTML with multiple issues', () => {
      const input = `<div data-editor="test" class="ProseMirror-editor">
        <p data-paragraph="true">  Content  with  spaces  </p>
      </div>`;
      const result = makeEmailSafe(input);
      expect(result).toBe('<div> <p> Content with spaces </p> </div>');
    });

    it('preserves valid HTML structure', () => {
      const input = '<p><strong>Bold</strong> and <em>italic</em> text</p>';
      const result = makeEmailSafe(input);
      expect(result).toBe('<p><strong>Bold</strong> and <em>italic</em> text</p>');
    });
  });

  describe('Email content validation logic', () => {
    // This simulates the getPlainText validation logic
    function validateEmailContent(text) {
      return Boolean(text && text.trim().length > 0);
    }

    it('rejects empty content', () => {
      expect(validateEmailContent('')).toBe(false);
      expect(validateEmailContent('   ')).toBe(false);
      expect(validateEmailContent(null)).toBe(false);
      expect(validateEmailContent(undefined)).toBe(false);
    });

    it('accepts valid content', () => {
      expect(validateEmailContent('Hello world')).toBe(true);
      expect(validateEmailContent('  Hello world  ')).toBe(true);
      expect(validateEmailContent('a')).toBe(true);
    });
  });

  describe('Email processing workflow', () => {
    function processEmailForSending(htmlContent, plainTextContent) {
      // This simulates the complete workflow in handleSend
      if (!plainTextContent || !plainTextContent.trim()) {
        return { success: false, error: 'No content' };
      }

      function makeEmailSafe(html) {
        return html
          .replace(/\s+data-[a-z-]+="[^"]*"/gi, '')
          .replace(/\s+class="ProseMirror[^"]*"/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      const safeHtml = makeEmailSafe(htmlContent);
      
      return {
        success: true,
        content: safeHtml,
        plainText: plainTextContent.trim()
      };
    }

    it('processes valid email content correctly', () => {
      const html = '<p data-editor="test">Hello <strong>world</strong></p>';
      const text = 'Hello world';
      
      const result = processEmailForSending(html, text);
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('<p>Hello <strong>world</strong></p>');
      expect(result.plainText).toBe('Hello world');
    });

    it('rejects empty content', () => {
      const html = '<p></p>';
      const text = '';
      
      const result = processEmailForSending(html, text);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No content');
    });

    it('handles whitespace-only content', () => {
      const html = '<p>   </p>';
      const text = '   ';
      
      const result = processEmailForSending(html, text);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No content');
    });
  });
});
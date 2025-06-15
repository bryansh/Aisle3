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

  describe('Email composition format functions', () => {
    // Mock functions extracted from EmailComposer component for testing
    function buildPlainTextEmail(options) {
      const {
        userContent,
        originalEmail,
        emailSignature,
        autoSignatureEnabled,
        replyQuotePosition,
        includeOriginalMessage
      } = options;

      let content = [];
      
      // Add user's reply content first if positioning above, or if no original message
      if (replyQuotePosition === 'above' || !includeOriginalMessage || !originalEmail) {
        content.push(userContent);
        
        // Add signature if enabled
        if (autoSignatureEnabled && emailSignature.trim()) {
          content.push(''); // Empty line
          content.push('--'); // Standard signature separator
          content.push(emailSignature);
        }
      }
      
      // Add original message if enabled and it exists
      if (includeOriginalMessage && originalEmail) {
        content.push(''); // Empty line
        content.push(`On ${originalEmail.date || 'unknown date'}, ${originalEmail.sender} wrote:`);
        content.push('');
        
        // Quote the original message
        const originalText = originalEmail.subject || 'Original message';
        const quotedLines = originalText.split('\n').map((line) => `> ${line}`);
        content.push(...quotedLines);
        
        // Add user's reply below if positioning below
        if (replyQuotePosition === 'below') {
          content.push(''); // Empty line
          content.push(userContent);
          
          // Add signature if enabled
          if (autoSignatureEnabled && emailSignature.trim()) {
            content.push(''); // Empty line
            content.push('--'); // Standard signature separator
            content.push(emailSignature);
          }
        }
      }
      
      return content.join('\n');
    }

    function buildHtmlEmail(options) {
      const {
        userContent,
        originalEmail,
        emailSignature,
        autoSignatureEnabled,
        replyQuotePosition,
        includeOriginalMessage,
        emailFontFamily,
        emailFontSize
      } = options;

      let content = [];
      
      // Apply user's font settings to their composed content
      const userContentStyle = `font-family: ${emailFontFamily}; font-size: ${emailFontSize}; line-height: 1.5;`;
      const styledUserContent = `<div style="${userContentStyle}">${userContent}</div>`;
      
      // Add user's reply content first if positioning above, or if no original message
      if (replyQuotePosition === 'above' || !includeOriginalMessage || !originalEmail) {
        content.push(styledUserContent);
        
        // Add signature if enabled
        if (autoSignatureEnabled && emailSignature.trim()) {
          content.push('<div>--</div>'); // Signature separator
          const signatureHtml = emailSignature.split('\n').map(line => `<div style="${userContentStyle}">${line}</div>`).join('');
          content.push(signatureHtml);
        }
      }
      
      // Add original message if enabled and it exists
      if (includeOriginalMessage && originalEmail) {
        content.push('<br>'); // Line break
        content.push(`<div style="color: #666; font-size: 12px;">On ${originalEmail.date || 'unknown date'}, ${originalEmail.sender} wrote:</div>`);
        content.push('<br>');
        
        // Quote the original message (use original formatting, not user's font settings)
        const originalContent = originalEmail.subject || 'Original message';
        content.push(`<blockquote style="border-left: 4px solid #ccc; padding-left: 16px; margin: 0; color: #666; font-style: italic;">${originalContent}</blockquote>`);
        
        // Add user's reply below if positioning below
        if (replyQuotePosition === 'below') {
          content.push('<br>'); // Line break
          content.push(styledUserContent);
          
          // Add signature if enabled
          if (autoSignatureEnabled && emailSignature.trim()) {
            content.push('<div>--</div>'); // Signature separator
            const signatureHtml = emailSignature.split('\n').map(line => `<div style="${userContentStyle}">${line}</div>`).join('');
            content.push(signatureHtml);
          }
        }
      }
      
      return content.join('');
    }

    describe('buildPlainTextEmail', () => {
      const baseOptions = {
        userContent: 'Thank you for your message!',
        originalEmail: {
          sender: 'john@example.com',
          date: 'Dec 15, 2024',
          subject: 'Project proposal'
        },
        emailSignature: 'Best regards,\nJane Doe',
        autoSignatureEnabled: false,
        replyQuotePosition: 'below',
        includeOriginalMessage: true
      };

      it('should build plain text email with reply below original message', () => {
        const result = buildPlainTextEmail(baseOptions);
        
        expect(result).toContain('On Dec 15, 2024, john@example.com wrote:');
        expect(result).toContain('> Project proposal');
        expect(result).toContain('Thank you for your message!');
        
        // Check ordering - original message should come before reply
        const originalIndex = result.indexOf('> Project proposal');
        const replyIndex = result.indexOf('Thank you for your message!');
        expect(originalIndex).toBeLessThan(replyIndex);
      });

      it('should build plain text email with reply above original message', () => {
        const options = { ...baseOptions, replyQuotePosition: 'above' };
        const result = buildPlainTextEmail(options);
        
        expect(result).toContain('On Dec 15, 2024, john@example.com wrote:');
        expect(result).toContain('> Project proposal');
        expect(result).toContain('Thank you for your message!');
        
        // Check ordering - reply should come before original message
        const originalIndex = result.indexOf('> Project proposal');
        const replyIndex = result.indexOf('Thank you for your message!');
        expect(replyIndex).toBeLessThan(originalIndex);
      });

      it('should include signature when autoSignatureEnabled is true', () => {
        const options = { ...baseOptions, autoSignatureEnabled: true };
        const result = buildPlainTextEmail(options);
        
        expect(result).toContain('--');
        expect(result).toContain('Best regards,');
        expect(result).toContain('Jane Doe');
      });

      it('should exclude signature when autoSignatureEnabled is false', () => {
        const result = buildPlainTextEmail(baseOptions);
        
        expect(result).not.toContain('--');
        expect(result).not.toContain('Best regards,');
        expect(result).not.toContain('Jane Doe');
      });

      it('should handle empty signature gracefully', () => {
        const options = { 
          ...baseOptions, 
          autoSignatureEnabled: true,
          emailSignature: ''
        };
        const result = buildPlainTextEmail(options);
        
        expect(result).not.toContain('--');
      });

      it('should handle whitespace-only signature gracefully', () => {
        const options = { 
          ...baseOptions, 
          autoSignatureEnabled: true,
          emailSignature: '   \n  \n  '
        };
        const result = buildPlainTextEmail(options);
        
        expect(result).not.toContain('--');
      });

      it('should exclude original message when includeOriginalMessage is false', () => {
        const options = { ...baseOptions, includeOriginalMessage: false };
        const result = buildPlainTextEmail(options);
        
        expect(result).not.toContain('On Dec 15, 2024, john@example.com wrote:');
        expect(result).not.toContain('> Project proposal');
        expect(result).toContain('Thank you for your message!');
      });

      it('should format original message quote correctly with "> " prefix', () => {
        const options = {
          ...baseOptions,
          originalEmail: {
            ...baseOptions.originalEmail,
            subject: 'Line 1\nLine 2\nLine 3'
          }
        };
        const result = buildPlainTextEmail(options);
        
        expect(result).toContain('> Line 1');
        expect(result).toContain('> Line 2');
        expect(result).toContain('> Line 3');
      });

      it('should handle missing originalEmail data gracefully', () => {
        const options = { ...baseOptions, originalEmail: null };
        const result = buildPlainTextEmail(options);
        
        expect(result).toContain('Thank you for your message!');
        expect(result).not.toContain('wrote:');
      });

      it('should use fallback text when originalEmail has no subject', () => {
        const options = {
          ...baseOptions,
          originalEmail: {
            sender: 'john@example.com',
            date: 'Dec 15, 2024',
            subject: ''
          }
        };
        const result = buildPlainTextEmail(options);
        
        expect(result).toContain('> Original message');
      });

      it('should handle missing date gracefully', () => {
        const options = {
          ...baseOptions,
          originalEmail: {
            sender: 'john@example.com',
            subject: 'Test subject'
          }
        };
        const result = buildPlainTextEmail(options);
        
        expect(result).toContain('On unknown date, john@example.com wrote:');
      });
    });

    describe('buildHtmlEmail', () => {
      const baseOptions = {
        userContent: 'Thank you for your message!',
        originalEmail: {
          sender: 'john@example.com',
          date: 'Dec 15, 2024',
          subject: 'Project proposal'
        },
        emailSignature: 'Best regards,\nJane Doe',
        autoSignatureEnabled: false,
        replyQuotePosition: 'below',
        includeOriginalMessage: true,
        emailFontFamily: 'Arial, sans-serif',
        emailFontSize: '14px'
      };

      it('should apply user font settings to composed content', () => {
        const result = buildHtmlEmail(baseOptions);
        
        expect(result).toContain('font-family: Arial, sans-serif');
        expect(result).toContain('font-size: 14px');
        expect(result).toContain('line-height: 1.5');
        expect(result).toContain('<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">Thank you for your message!</div>');
      });

      it('should build HTML email with reply below original message', () => {
        const result = buildHtmlEmail(baseOptions);
        
        expect(result).toContain('On Dec 15, 2024, john@example.com wrote:');
        expect(result).toContain('<blockquote');
        expect(result).toContain('Project proposal');
        expect(result).toContain('Thank you for your message!');
        
        // Check ordering - original message should come before reply
        const originalIndex = result.indexOf('<blockquote');
        const replyIndex = result.indexOf('Thank you for your message!');
        expect(originalIndex).toBeLessThan(replyIndex);
      });

      it('should build HTML email with reply above original message', () => {
        const options = { ...baseOptions, replyQuotePosition: 'above' };
        const result = buildHtmlEmail(options);
        
        expect(result).toContain('On Dec 15, 2024, john@example.com wrote:');
        expect(result).toContain('<blockquote');
        expect(result).toContain('Thank you for your message!');
        
        // Check ordering - reply should come before original message
        const originalIndex = result.indexOf('<blockquote');
        const replyIndex = result.indexOf('Thank you for your message!');
        expect(replyIndex).toBeLessThan(originalIndex);
      });

      it('should include HTML signature when autoSignatureEnabled is true', () => {
        const options = { ...baseOptions, autoSignatureEnabled: true };
        const result = buildHtmlEmail(options);
        
        expect(result).toContain('<div>--</div>');
        expect(result).toContain('Best regards,');
        expect(result).toContain('Jane Doe');
      });

      it('should apply proper HTML formatting to signature', () => {
        const options = { ...baseOptions, autoSignatureEnabled: true };
        const result = buildHtmlEmail(options);
        
        expect(result).toContain('<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">Best regards,</div>');
        expect(result).toContain('<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">Jane Doe</div>');
      });

      it('should use blockquote styling for original message', () => {
        const result = buildHtmlEmail(baseOptions);
        
        expect(result).toContain('<blockquote style="border-left: 4px solid #ccc; padding-left: 16px; margin: 0; color: #666; font-style: italic;">');
      });

      it('should preserve original message formatting separately from user content', () => {
        const result = buildHtmlEmail(baseOptions);
        
        // User content should have user's font settings
        expect(result).toContain('<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">Thank you for your message!</div>');
        
        // Original message header should use default styling
        expect(result).toContain('<div style="color: #666; font-size: 12px;">On Dec 15, 2024, john@example.com wrote:</div>');
        
        // Original message content should be in blockquote (no user font settings applied)
        expect(result).toContain('<blockquote style="border-left: 4px solid #ccc; padding-left: 16px; margin: 0; color: #666; font-style: italic;">Project proposal</blockquote>');
      });

      it('should handle multiline signatures correctly', () => {
        const options = { 
          ...baseOptions, 
          autoSignatureEnabled: true,
          emailSignature: 'Best regards,\nJane Doe\nSoftware Engineer'
        };
        const result = buildHtmlEmail(options);
        
        expect(result).toContain('<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">Best regards,</div>');
        expect(result).toContain('<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">Jane Doe</div>');
        expect(result).toContain('<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">Software Engineer</div>');
      });

      it('should exclude original message when includeOriginalMessage is false', () => {
        const options = { ...baseOptions, includeOriginalMessage: false };
        const result = buildHtmlEmail(options);
        
        expect(result).not.toContain('On Dec 15, 2024, john@example.com wrote:');
        expect(result).not.toContain('<blockquote');
        expect(result).toContain('Thank you for your message!');
      });

      it('should handle missing originalEmail data gracefully', () => {
        const options = { ...baseOptions, originalEmail: null };
        const result = buildHtmlEmail(options);
        
        expect(result).toContain('Thank you for your message!');
        expect(result).not.toContain('wrote:');
      });

      it('should use fallback text when originalEmail has no subject', () => {
        const options = {
          ...baseOptions,
          originalEmail: {
            sender: 'john@example.com',
            date: 'Dec 15, 2024',
            subject: ''
          }
        };
        const result = buildHtmlEmail(options);
        
        expect(result).toContain('Original message');
      });

      it('should handle missing date gracefully', () => {
        const options = {
          ...baseOptions,
          originalEmail: {
            sender: 'john@example.com',
            subject: 'Test subject'
          }
        };
        const result = buildHtmlEmail(options);
        
        expect(result).toContain('On unknown date, john@example.com wrote:');
      });
    });

    describe('Email format integration', () => {
      const mockEmailComposer = {
        emailCompositionFormat: 'html',
        userContent: 'Hello world',
        originalEmail: { sender: 'test@example.com', subject: 'Test' },
        emailSignature: 'Regards',
        autoSignatureEnabled: true,
        replyQuotePosition: 'below',
        includeOriginalMessage: true,
        emailFontFamily: 'Arial, sans-serif',
        emailFontSize: '14px'
      };

      function buildEmail(format, options) {
        if (format === 'plaintext') {
          return buildPlainTextEmail(options);
        } else {
          return buildHtmlEmail(options);
        }
      }

      it('should use buildPlainTextEmail when emailCompositionFormat is plaintext', () => {
        const result = buildEmail('plaintext', mockEmailComposer);
        
        expect(result).toContain('Hello world');
        expect(result).toContain('--\nRegards');
        expect(result).not.toContain('<div>');
      });

      it('should use buildHtmlEmail when emailCompositionFormat is html', () => {
        const result = buildEmail('html', mockEmailComposer);
        
        expect(result).toContain('Hello world');
        expect(result).toContain('<div>--</div>');
        expect(result).toContain('<div style="font-family: Arial, sans-serif');
      });

      it('should maintain consistent signature behavior across formats', () => {
        const plainResult = buildEmail('plaintext', mockEmailComposer);
        const htmlResult = buildEmail('html', mockEmailComposer);
        
        // Both should include signature
        expect(plainResult).toContain('Regards');
        expect(htmlResult).toContain('Regards');
        
        // Both should have signature separator
        expect(plainResult).toContain('--');
        expect(htmlResult).toContain('--');
      });

      it('should maintain consistent quote positioning across formats', () => {
        const aboveOptions = { ...mockEmailComposer, replyQuotePosition: 'above' };
        
        const plainAbove = buildEmail('plaintext', aboveOptions);
        const htmlAbove = buildEmail('html', aboveOptions);
        
        // Both should have reply before original message
        const plainReplyIndex = plainAbove.indexOf('Hello world');
        const plainOriginalIndex = plainAbove.indexOf('test@example.com wrote:');
        expect(plainReplyIndex).toBeLessThan(plainOriginalIndex);
        
        const htmlReplyIndex = htmlAbove.indexOf('Hello world');
        const htmlOriginalIndex = htmlAbove.indexOf('test@example.com wrote:');
        expect(htmlReplyIndex).toBeLessThan(htmlOriginalIndex);
      });
    });
  });
});
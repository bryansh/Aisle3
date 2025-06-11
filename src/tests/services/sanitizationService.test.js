import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  InputSanitizer,
  HtmlSanitizer,
  ContentValidator,
  SanitizationService,
  createSanitizationService
} from '../../lib/services/sanitizationService.js';

describe('InputSanitizer', () => {
  describe('sanitizeEmail', () => {
    it('should sanitize valid email addresses', () => {
      const result = InputSanitizer.sanitizeEmail('  TEST@EXAMPLE.COM  ');
      
      expect(result.isValid).toBe(true);
      expect(result.cleanEmail).toBe('test@example.com');
      expect(result.error).toBe(null);
    });

    it('should reject invalid email addresses', () => {
      const testCases = [
        { email: '', expectedError: 'Email must be a string' },
        { email: 'invalid-email', expectedError: 'Invalid email format' },
        { email: '@example.com', expectedError: 'Invalid email format' },
        { email: 'test@', expectedError: 'Invalid email format' },
        { email: 'test..test@example.com', expectedError: 'Invalid email format' }
      ];

      testCases.forEach(({ email, expectedError }) => {
        const result = InputSanitizer.sanitizeEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain(expectedError);
      });
    });

    it('should enforce length limits', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = InputSanitizer.sanitizeEmail(longEmail, { maxLength: 20 });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Email too long');
    });

    it('should handle strict validation', () => {
      // Both strict and basic validation require proper domain format
      const result = InputSanitizer.sanitizeEmail('test@example', { strict: true });
      expect(result.isValid).toBe(false);
      
      // Valid email should pass both validations
      const validEmail = InputSanitizer.sanitizeEmail('test@example.com', { strict: true });
      expect(validEmail.isValid).toBe(true);
    });

    it('should handle non-string inputs', () => {
      const testCases = [null, undefined, 123, {}];
      
      testCases.forEach(input => {
        const result = InputSanitizer.sanitizeEmail(input);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Email must be a string');
      });
    });
  });

  describe('sanitizeText', () => {
    it('should sanitize basic text input', () => {
      const input = '  Hello World!  ';
      const result = InputSanitizer.sanitizeText(input);
      
      expect(result).toBe('Hello World!');
    });

    it('should remove HTML tags by default', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = InputSanitizer.sanitizeText(input);
      
      expect(result).toBe('Hello alert("xss") World');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should preserve line breaks when requested', () => {
      const input = 'Line 1\nLine 2\rLine 3\r\nLine 4';
      const result = InputSanitizer.sanitizeText(input, { preserveLineBreaks: true });
      
      expect(result).toContain('\n');
    });

    it('should enforce length limits', () => {
      const longText = 'a'.repeat(1000);
      const result = InputSanitizer.sanitizeText(longText, { maxLength: 10 });
      
      expect(result).toHaveLength(10);
    });

    it('should remove control characters', () => {
      const input = 'Hello\x00\x08\x1FWorld';
      const result = InputSanitizer.sanitizeText(input);
      
      expect(result).toBe('HelloWorld');
    });

    it('should handle non-string inputs', () => {
      const testCases = [null, undefined, 123, {}];
      
      testCases.forEach(input => {
        const result = InputSanitizer.sanitizeText(input);
        expect(result).toBe('');
      });
    });
  });

  describe('sanitizeUrl', () => {
    it('should sanitize valid URLs', () => {
      const result = InputSanitizer.sanitizeUrl('https://example.com/path');
      
      expect(result.isValid).toBe(true);
      expect(result.cleanUrl).toBe('https://example.com/path');
      expect(result.error).toBe(null);
    });

    it('should allow mailto URLs', () => {
      const result = InputSanitizer.sanitizeUrl('mailto:test@example.com');
      
      expect(result.isValid).toBe(true);
    });

    it('should reject dangerous protocols', () => {
      const dangerousUrls = [
        'javascript:alert("xss")',
        'vbscript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>'
      ];

      dangerousUrls.forEach(url => {
        const result = InputSanitizer.sanitizeUrl(url);
        expect(result.isValid).toBe(false);
      });
    });

    it('should handle relative URLs', () => {
      const relativeUrls = ['/path', './path', '../path'];
      
      relativeUrls.forEach(url => {
        const result = InputSanitizer.sanitizeUrl(url);
        expect(result.isValid).toBe(true);
      });
    });

    it('should enforce length limits', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(3000);
      const result = InputSanitizer.sanitizeUrl(longUrl, { maxLength: 100 });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('URL too long');
    });

    it('should handle invalid URL formats', () => {
      const invalidUrls = ['not-a-url', 'http://', ''];
      
      invalidUrls.forEach(url => {
        const result = InputSanitizer.sanitizeUrl(url);
        expect(result.isValid).toBe(false);
      });
    });
  });
});

describe('HtmlSanitizer', () => {
  describe('sanitizeHtml', () => {
    it('should preserve allowed HTML tags', () => {
      const html = '<p>Hello <strong>World</strong></p>';
      const result = HtmlSanitizer.sanitizeHtml(html);
      
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('</p>');
      expect(result).toContain('</strong>');
    });

    it('should remove dangerous script tags', () => {
      const html = '<p>Safe content</p><script>alert("xss")</script>';
      const result = HtmlSanitizer.sanitizeHtml(html);
      
      expect(result).toContain('<p>');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should remove dangerous event handlers', () => {
      const html = '<div onclick="alert(\'xss\')">Click me</div>';
      const result = HtmlSanitizer.sanitizeHtml(html);
      
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('alert');
    });

    it('should handle iframe and object tags', () => {
      const html = '<iframe src="evil.com"></iframe><object data="evil.swf"></object>';
      const result = HtmlSanitizer.sanitizeHtml(html);
      
      expect(result).not.toContain('<iframe>');
      expect(result).not.toContain('<object>');
    });

    it('should enforce length limits', () => {
      const longHtml = '<p>' + 'a'.repeat(1000) + '</p>';
      const result = HtmlSanitizer.sanitizeHtml(longHtml, { maxLength: 10 });
      
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('htmlToText', () => {
    it('should convert HTML to plain text', () => {
      const html = '<p>Hello <strong>World</strong></p>';
      const result = HtmlSanitizer.htmlToText(html);
      
      expect(result).toBe('Hello World');
      expect(result).not.toContain('<');
    });

    it('should preserve line breaks when requested', () => {
      const html = '<p>Line 1</p><p>Line 2</p>';
      const result = HtmlSanitizer.htmlToText(html, { preserveLineBreaks: true });
      
      expect(result).toContain('\n');
    });

    it('should decode HTML entities', () => {
      const html = 'Hello &amp; goodbye &lt;world&gt;';
      const result = HtmlSanitizer.htmlToText(html);
      
      expect(result).toContain('&');
      expect(result).toContain('<world>');
    });

    it('should handle line breaks from various HTML elements', () => {
      const html = '<div>Line 1</div><br><li>Item 1</li><h1>Title</h1>';
      const result = HtmlSanitizer.htmlToText(html, { preserveLineBreaks: true });
      
      expect(result.split('\n').length).toBeGreaterThan(1);
    });
  });

  describe('decodeHtmlEntities', () => {
    it('should decode common HTML entities', () => {
      const text = '&amp; &lt; &gt; &quot; &#39; &nbsp;';
      const result = HtmlSanitizer.decodeHtmlEntities(text);
      
      expect(result).toBe('& < > " \' \u00A0');
    });

    it('should leave unknown entities unchanged', () => {
      const text = '&unknown; &invalid;';
      const result = HtmlSanitizer.decodeHtmlEntities(text);
      
      expect(result).toBe('&unknown; &invalid;');
    });
  });
});

describe('ContentValidator', () => {
  describe('validateEmailContent', () => {
    it('should validate safe email content', () => {
      const content = 'Hello, this is a normal email message.';
      const result = ContentValidator.validateEmailContent(content);
      
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.riskLevel).toBe('low');
    });

    it('should detect phishing patterns', () => {
      const phishingContent = 'URGENT ACTION REQUIRED! Verify your account immediately!';
      const result = ContentValidator.validateEmailContent(phishingContent);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Potential phishing content detected');
      expect(result.riskLevel).toBe('high');
    });

    it('should detect spam patterns', () => {
      const spamContent = 'You won $$$! Act now for this 100% free prize!';
      const result = ContentValidator.validateEmailContent(spamContent);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Potential spam content detected');
    });

    it('should enforce length limits', () => {
      const longContent = 'a'.repeat(200000);
      const result = ContentValidator.validateEmailContent(longContent, { maxLength: 1000 });
      
      expect(result.isValid).toBe(false);
      expect(result.issues[0]).toContain('Content too long');
    });

    it('should handle non-string inputs', () => {
      const result = ContentValidator.validateEmailContent(null);
      
      expect(result.isValid).toBe(false);
      expect(result.riskLevel).toBe('high');
    });

    it('should allow disabling specific checks', () => {
      const phishingContent = 'URGENT ACTION REQUIRED!';
      const result = ContentValidator.validateEmailContent(phishingContent, { 
        checkPhishing: false 
      });
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateFileAttachment', () => {
    it('should validate safe file attachments', () => {
      const file = {
        name: 'document.pdf',
        type: 'application/pdf',
        size: 1024 * 1024 // 1MB
      };
      
      const result = ContentValidator.validateFileAttachment(file);
      
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.riskLevel).toBe('low');
    });

    it('should reject files that are too large', () => {
      const file = {
        name: 'huge-file.pdf',
        type: 'application/pdf',
        size: 100 * 1024 * 1024 // 100MB
      };
      
      const result = ContentValidator.validateFileAttachment(file, { maxSize: 10 * 1024 * 1024 });
      
      expect(result.isValid).toBe(false);
      expect(result.issues[0]).toContain('File too large');
    });

    it('should reject dangerous file types', () => {
      const file = {
        name: 'virus.exe',
        type: 'application/x-executable',
        size: 1024
      };
      
      const result = ContentValidator.validateFileAttachment(file);
      
      expect(result.isValid).toBe(false);
      expect(result.riskLevel).toBe('high');
    });

    it('should reject dangerous file extensions', () => {
      const file = {
        name: 'script.bat',
        type: 'text/plain',
        size: 1024
      };
      
      const result = ContentValidator.validateFileAttachment(file);
      
      expect(result.isValid).toBe(false);
      expect(result.issues[0]).toContain('Dangerous file extension');
    });

    it('should handle invalid file objects', () => {
      const result = ContentValidator.validateFileAttachment(null);
      
      expect(result.isValid).toBe(false);
      expect(result.riskLevel).toBe('high');
    });
  });
});

describe('SanitizationService', () => {
  let service;

  beforeEach(() => {
    service = new SanitizationService();
  });

  describe('sanitizeEmailData', () => {
    it('should sanitize complete email data', () => {
      const emailData = {
        to: '  TEST@EXAMPLE.COM  ',
        subject: 'Test <script>alert("xss")</script> Subject',
        body: '<p>Hello <strong>World</strong></p><script>alert("evil")</script>'
      };
      
      const result = service.sanitizeEmailData(emailData);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.to).toBe('test@example.com');
      expect(result.sanitizedData.subject).not.toContain('<script>');
      expect(result.sanitizedData.body).toContain('<p>');
      expect(result.sanitizedData.body).not.toContain('<script>');
    });

    it('should handle invalid email addresses', () => {
      const emailData = {
        to: 'invalid-email',
        subject: 'Test Subject',
        body: 'Test Body'
      };
      
      const result = service.sanitizeEmailData(emailData);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Invalid recipient email: Invalid email format');
    });

    it('should validate content and detect risks', () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Subject',
        body: 'URGENT ACTION REQUIRED! Verify account immediately!'
      };
      
      const result = service.sanitizeEmailData(emailData);
      
      expect(result.isValid).toBe(false);
      expect(result.validationResults.body.riskLevel).toBe('high');
    });

    it('should distinguish between HTML and plain text body', () => {
      const htmlEmailData = {
        body: '<p>HTML content</p>'
      };
      
      const textEmailData = {
        body: 'Plain text content'
      };
      
      const htmlResult = service.sanitizeEmailData(htmlEmailData);
      const textResult = service.sanitizeEmailData(textEmailData);
      
      expect(htmlResult.sanitizedData.body).toContain('<p>');
      expect(textResult.sanitizedData.body).toBe('Plain text content');
    });
  });

  describe('sanitizeEmailForDisplay', () => {
    it('should sanitize email for safe display', () => {
      const email = {
        id: 'email123',
        sender: '  SENDER@EXAMPLE.COM  ',
        subject: 'Test <script>alert("xss")</script> Subject',
        body: '<p>Safe content</p><script>alert("evil")</script>',
        snippet: 'Safe snippet <b>with formatting</b>'
      };
      
      const result = service.sanitizeEmailForDisplay(email);
      
      expect(result.sender).toBe('sender@example.com');
      expect(result.subject).not.toContain('<script>');
      expect(result.body).toContain('<p>');
      expect(result.body).not.toContain('<script>');
      expect(result.snippet).not.toContain('<b>');
    });

    it('should handle null or invalid email objects', () => {
      expect(service.sanitizeEmailForDisplay(null)).toBe(null);
      expect(service.sanitizeEmailForDisplay('invalid')).toBe(null);
    });

    it('should preserve email structure while sanitizing content', () => {
      const email = {
        id: 'email123',
        sender: 'test@example.com',
        subject: 'Test Subject',
        body: 'Test Body',
        timestamp: '2023-01-01',
        is_read: false
      };
      
      const result = service.sanitizeEmailForDisplay(email);
      
      expect(result.id).toBe('email123');
      expect(result.timestamp).toBe('2023-01-01');
      expect(result.is_read).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return sanitization statistics', () => {
      const stats = service.getStats();
      
      expect(stats).toHaveProperty('strictMode');
      expect(stats).toHaveProperty('logSanitization');
      expect(stats).toHaveProperty('allowedHtmlTags');
      expect(stats).toHaveProperty('dangerousPatterns');
      expect(typeof stats.allowedHtmlTags).toBe('number');
      expect(typeof stats.dangerousPatterns).toBe('number');
    });
  });

  describe('constructor options', () => {
    it('should respect strict mode option', () => {
      const strictService = new SanitizationService({ strictMode: true });
      
      expect(strictService.options.strictMode).toBe(true);
    });

    it('should respect logging option', () => {
      const loggingService = new SanitizationService({ logSanitization: true });
      
      expect(loggingService.options.logSanitization).toBe(true);
    });
  });
});

describe('createSanitizationService', () => {
  it('should create a sanitization service with default options', () => {
    const service = createSanitizationService();
    
    expect(service).toBeInstanceOf(SanitizationService);
    expect(service.options.strictMode).toBe(false);
  });

  it('should create a sanitization service with custom options', () => {
    const service = createSanitizationService({ 
      strictMode: true, 
      logSanitization: true 
    });
    
    expect(service).toBeInstanceOf(SanitizationService);
    expect(service.options.strictMode).toBe(true);
    expect(service.options.logSanitization).toBe(true);
  });
});
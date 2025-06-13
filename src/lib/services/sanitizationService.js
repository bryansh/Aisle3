/**
 * Sanitization Service - Comprehensive input sanitization and security utilities
 * Handles HTML cleaning, XSS prevention, and input validation
 */

/**
 * HTML tag whitelist for email content
 */
const ALLOWED_HTML_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'div', 'span',
  'a', 'img', 'table', 'tr', 'td', 'th', 'thead', 'tbody'
];

/**
 * Safe HTML attributes whitelist
 */
const ALLOWED_ATTRIBUTES = {
  'a': ['href', 'title', 'target'],
  'img': ['src', 'alt', 'title', 'width', 'height'],
  'div': ['class'],
  'span': ['class'],
  'p': ['class'],
  'table': ['class'],
  'tr': ['class'],
  'td': ['class', 'colspan', 'rowspan'],
  'th': ['class', 'colspan', 'rowspan']
};

/**
 * Dangerous patterns to remove
 */
const DANGEROUS_PATTERNS = [
  /javascript:/gi,
  /vbscript:/gi,
  /onload/gi,
  /onerror/gi,
  /onclick/gi,
  /onmouseover/gi,
  /onfocus/gi,
  /onblur/gi,
  /onsubmit/gi,
  /data:/gi,
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi
];

/**
 * Email address validation patterns
 */
const EMAIL_PATTERNS = {
  basic: /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/,
  rfc5322: /^[a-zA-Z0-9]([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/
};

/**
 * Additional validation for edge cases not handled by regex
 * @param {string} email - Email address to check
 * @returns {boolean} Whether the email has consecutive dots
 */
function hasConsecutiveDots(email) {
  return email.includes('..');
}

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Sanitize and validate email address
   * @param {string} email - Email address to validate
   * @param {{strict?: boolean, maxLength?: number}} options - Validation options
   * @returns {{isValid: boolean, cleanEmail: string, error: string|null}} Validation result with cleaned email
   */
  static sanitizeEmail(email, options = {}) {
    const { strict = false, maxLength = 254 } = options;
    
    if (!email || typeof email !== 'string') {
      return { isValid: false, cleanEmail: '', error: 'Email must be a string' };
    }

    // Basic cleanup
    const cleanEmail = email.trim().toLowerCase();
    
    // Check for empty string after trimming
    if (cleanEmail.length === 0) {
      return { isValid: false, cleanEmail: '', error: 'Email must be a string' };
    }
    
    // Length check
    if (cleanEmail.length > maxLength) {
      return { isValid: false, cleanEmail, error: `Email too long (max ${maxLength} characters)` };
    }

    // Pattern validation
    const pattern = strict ? EMAIL_PATTERNS.rfc5322 : EMAIL_PATTERNS.basic;
    const passesRegex = pattern.test(cleanEmail);
    
    // Additional checks for edge cases
    const hasConsecutiveDotsIssue = hasConsecutiveDots(cleanEmail);
    
    const isValid = passesRegex && !hasConsecutiveDotsIssue;

    return {
      isValid,
      cleanEmail,
      error: isValid ? null : 'Invalid email format'
    };
  }

  /**
   * Sanitize text input by removing potentially dangerous content
   * @param {string} input - Text to sanitize
   * @param {{maxLength?: number, preserveLineBreaks?: boolean, allowBasicFormatting?: boolean}} options - Sanitization options
   * @returns {string} Sanitized text
   */
  static sanitizeText(input, options = {}) {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const { 
      maxLength = 10000,
      preserveLineBreaks = true,
      allowBasicFormatting = false
    } = options;

    let sanitized = input.trim();

    // Length limit
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    if (!allowBasicFormatting) {
      // Remove all HTML tags
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Normalize whitespace but preserve line breaks if requested
    if (preserveLineBreaks) {
      sanitized = sanitized.replace(/[ \t]+/g, ' ');
    } else {
      sanitized = sanitized.replace(/\s+/g, ' ');
    }

    return sanitized.trim();
  }

  /**
   * Sanitize URL to prevent XSS and malicious links
   * @param {string} url - URL to sanitize
   * @param {{allowedProtocols?: string[], maxLength?: number}} options - Sanitization options
   * @returns {{isValid: boolean, cleanUrl: string, error: string|null}} Sanitization result
   */
  static sanitizeUrl(url, options = {}) {
    const { allowedProtocols = ['http:', 'https:', 'mailto:'], maxLength = 2048 } = options;

    if (!url || typeof url !== 'string') {
      return { isValid: false, cleanUrl: '', error: 'URL must be a string' };
    }

    let cleanUrl = url.trim();

    // Length check
    if (cleanUrl.length > maxLength) {
      return { isValid: false, cleanUrl, error: `URL too long (max ${maxLength} characters)` };
    }

    // Remove dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      cleanUrl = cleanUrl.replace(pattern, '');
    }

    try {
      const urlObj = new URL(cleanUrl);
      
      // Check if protocol is allowed
      if (!allowedProtocols.includes(urlObj.protocol)) {
        return { 
          isValid: false, 
          cleanUrl, 
          error: `Protocol '${urlObj.protocol}' not allowed` 
        };
      }

      return { isValid: true, cleanUrl: urlObj.href, error: null };
    } catch (error) {
      // If URL constructor fails, check if it's a relative URL
      if (cleanUrl.startsWith('/') || cleanUrl.startsWith('./') || cleanUrl.startsWith('../')) {
        return { isValid: true, cleanUrl, error: null };
      }
      
      return { isValid: false, cleanUrl, error: 'Invalid URL format' };
    }
  }
}

/**
 * HTML sanitization utilities for email content
 */
export class HtmlSanitizer {
  /**
   * Sanitize HTML content by removing dangerous elements and attributes
   * @param {string} html - HTML content to sanitize
   * @param {{allowedTags?: string[], allowedAttributes?: object, maxLength?: number}} options - Sanitization options
   * @returns {string} Sanitized HTML
   */
  static sanitizeHtml(html, options = {}) {
    if (!html || typeof html !== 'string') {
      return '';
    }

    const {
      allowedTags = ALLOWED_HTML_TAGS,
      allowedAttributes = ALLOWED_ATTRIBUTES,
      maxLength = 100000
    } = options;

    let sanitized = html.trim();

    // Length limit
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Remove dangerous patterns first
    for (const pattern of DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Parse and clean HTML
    sanitized = this.cleanHtmlTags(sanitized, allowedTags, /** @type {Record<string, string[]>} */ (allowedAttributes));

    return sanitized;
  }

  /**
   * Remove all HTML tags and return plain text
   * @param {string} html - HTML content
   * @param {{preserveLineBreaks?: boolean}} options - Options for text extraction
   * @returns {string} Plain text content
   */
  static htmlToText(html, options = {}) {
    if (!html || typeof html !== 'string') {
      return '';
    }

    const { preserveLineBreaks = true } = options;

    let text = html;

    // Convert common HTML elements to text equivalents
    if (preserveLineBreaks) {
      text = text.replace(/<br\s*\/?>/gi, '\n');
      text = text.replace(/<\/p>/gi, '\n\n');
      text = text.replace(/<\/div>/gi, '\n');
      text = text.replace(/<\/li>/gi, '\n');
      text = text.replace(/<\/h[1-6]>/gi, '\n\n');
    }

    // Remove all HTML tags
    text = text.replace(/<[^>]*>/g, '');

    // Decode HTML entities
    text = this.decodeHtmlEntities(text);

    // Clean up whitespace
    if (preserveLineBreaks) {
      text = text.replace(/[ \t]+/g, ' ');
      text = text.replace(/\n\s*\n/g, '\n\n');
    } else {
      text = text.replace(/\s+/g, ' ');
    }

    return text.trim();
  }

  /**
   * Clean HTML tags and attributes
   * @param {string} html - HTML content
   * @param {string[]} allowedTags - Allowed HTML tags
   * @param {Record<string, string[]>} allowedAttributes - Allowed attributes by tag
   * @returns {string} Cleaned HTML
   */
  static cleanHtmlTags(html, allowedTags, allowedAttributes) {
    // Simple regex-based cleaning (in production, consider using a proper HTML parser)
    let cleaned = html;

    // Remove disallowed tags
    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    cleaned = cleaned.replace(tagPattern, (match, tagName) => {
      const tag = tagName.toLowerCase();
      
      if (!allowedTags.includes(tag)) {
        return ''; // Remove disallowed tags
      }

      // Clean attributes for allowed tags
      if (allowedAttributes[tag]) {
        return this.cleanAttributes(match, tag, allowedAttributes[tag]);
      }

      // Return tag without attributes if no attributes are allowed
      const isClosing = match.startsWith('</');
      return isClosing ? `</${tag}>` : `<${tag}>`;
    });

    return cleaned;
  }

  /**
   * Clean attributes of an HTML tag
   * @param {string} tagMatch - Full tag match
   * @param {string} tagName - Tag name
   * @param {string[]} allowedAttrs - Allowed attributes
   * @returns {string} Cleaned tag
   */
  static cleanAttributes(tagMatch, tagName, allowedAttrs) {
    const isClosing = tagMatch.startsWith('</');
    if (isClosing) {
      return tagMatch; // Closing tags don't have attributes
    }

    const attrPattern = /(\w+)=["']([^"']*)["']/g;
    let cleanedTag = `<${tagName}`;
    let match;

    while ((match = attrPattern.exec(tagMatch)) !== null) {
      const [, attrName, attrValue] = match;
      
      if (allowedAttrs.includes(attrName.toLowerCase())) {
        // Additional validation for specific attributes
        let cleanValue = attrValue;
        
        if (attrName.toLowerCase() === 'href' || attrName.toLowerCase() === 'src') {
          const urlResult = InputSanitizer.sanitizeUrl(attrValue);
          if (urlResult.isValid) {
            cleanValue = urlResult.cleanUrl;
          } else {
            continue; // Skip invalid URLs
          }
        }

        cleanedTag += ` ${attrName}="${cleanValue}"`;
      }
    }

    cleanedTag += tagMatch.endsWith('/>') ? '/>' : '>';
    return cleanedTag;
  }

  /**
   * Decode common HTML entities
   * @param {string} text - Text with HTML entities
   * @returns {string} Decoded text
   */
  static decodeHtmlEntities(text) {
    /** @type {Record<string, string>} */
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': '\u00A0' // Use non-breaking space character instead of regular space
    };

    let decoded = text;
    
    // Handle double-encoded entities by decoding twice
    // First pass: decode &amp; back to &
    decoded = decoded.replace(/&amp;/g, '&');
    
    // Second pass: decode all entities
    decoded = decoded.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
      return entities[entity] || entity;
    });

    return decoded;
  }

  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  static escapeHtml(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    /** @type {Record<string, string>} */
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    return text.replace(/[&<>"']/g, (char) => escapeMap[char] || char);
  }
}

/**
 * Content validation utilities
 */
export class ContentValidator {
  /**
   * Validate email content for suspicious patterns
   * @param {string} content - Email content to validate
   * @param {{maxLength?: number, checkPhishing?: boolean, checkSpam?: boolean}} options - Validation options
   * @returns {{isValid: boolean, issues: string[], riskLevel: string}} Validation result
   */
  static validateEmailContent(content, options = {}) {
    const { 
      maxLength = 100000,
      checkPhishing = true,
      checkSpam = true 
    } = options;

    const issues = [];
    
    if (!content || typeof content !== 'string') {
      return { isValid: false, issues: ['Content must be a string'], riskLevel: 'high' };
    }

    // Length check
    if (content.length > maxLength) {
      issues.push(`Content too long (${content.length} > ${maxLength} characters)`);
    }

    // Check for suspicious patterns
    if (checkPhishing) {
      const phishingPatterns = [
        /urgent.{0,20}action.{0,20}required/gi,
        /verify.{0,20}account.{0,20}immediately/gi,
        /suspended.{0,20}account/gi,
        /click.{0,20}here.{0,20}now/gi
      ];

      for (const pattern of phishingPatterns) {
        if (pattern.test(content)) {
          issues.push('Potential phishing content detected');
          break;
        }
      }
    }

    // Check for spam indicators
    if (checkSpam) {
      const spamPatterns = [
        /\$\$\$|money|cash|prize|winner/gi,
        /act.{0,10}now|limited.{0,10}time/gi,
        /100%.{0,10}free|no.{0,10}cost/gi
      ];

      let spamScore = 0;
      for (const pattern of spamPatterns) {
        if (pattern.test(content)) {
          spamScore++;
        }
      }

      if (spamScore >= 2) {
        issues.push('Potential spam content detected');
      }
    }

    // Determine risk level
    let riskLevel = 'low';
    if (issues.length > 0) {
      riskLevel = issues.some(issue => 
        issue.includes('phishing') || issue.includes('suspicious')
      ) ? 'high' : 'medium';
    }

    return {
      isValid: issues.length === 0,
      issues,
      riskLevel
    };
  }

  /**
   * Validate file attachment safety
   * @param {{name?: string, type?: string, size?: number}} file - File object with name, type, size
   * @param {{maxSize?: number, allowedTypes?: string[], blockedExtensions?: string[]}} options - Validation options
   * @returns {{isValid: boolean, issues: string[], riskLevel: string}} Validation result
   */
  static validateFileAttachment(file, options = {}) {
    const {
      maxSize = 25 * 1024 * 1024, // 25MB
      allowedTypes = ['image/', 'text/', 'application/pdf'],
      blockedExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif']
    } = options;

    const issues = [];

    if (!file || typeof file !== 'object') {
      return { isValid: false, issues: ['Invalid file object'], riskLevel: 'high' };
    }

    // Size check
    if (file.size && file.size > maxSize) {
      issues.push(`File too large (${Math.round(file.size / 1024 / 1024)}MB > ${Math.round(maxSize / 1024 / 1024)}MB)`);
    }

    // Type check
    const isAllowedType = allowedTypes.some(type => file.type?.startsWith(type));
    if (!isAllowedType) {
      issues.push(`File type not allowed: ${file.type}`);
    }

    // Extension check
    const extension = file.name?.toLowerCase().split('.').pop();
    if (extension && blockedExtensions.some(blocked => extension === blocked.slice(1))) {
      issues.push(`Dangerous file extension: .${extension}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      riskLevel: issues.length > 0 ? 'high' : 'low'
    };
  }
}

/**
 * Main sanitization service that orchestrates all sanitization utilities
 */
export class SanitizationService {
  constructor(options = {}) {
    this.options = {
      strictMode: false,
      logSanitization: false,
      ...options
    };
  }

  /**
   * Sanitize email compose data
   * @param {{to?: string, subject?: string, body?: string}} emailData - Email data to sanitize
   * @returns {{sanitizedData: any, validationResults: any, isValid: boolean, issues: string[]}} Sanitized email data with validation results
   */
  sanitizeEmailData(emailData) {
    const result = {
      sanitizedData: /** @type {any} */ ({}),
      validationResults: /** @type {any} */ ({}),
      isValid: true,
      issues: /** @type {string[]} */ ([])
    };

    // Sanitize recipient email
    if (emailData.to) {
      const emailResult = InputSanitizer.sanitizeEmail(emailData.to, { strict: this.options.strictMode });
      result.sanitizedData.to = emailResult.cleanEmail;
      result.validationResults.to = emailResult;
      if (!emailResult.isValid) {
        result.isValid = false;
        result.issues.push(`Invalid recipient email: ${emailResult.error}`);
      }
    }

    // Sanitize subject
    if (emailData.subject) {
      result.sanitizedData.subject = InputSanitizer.sanitizeText(emailData.subject, {
        maxLength: 200,
        preserveLineBreaks: false,
        allowBasicFormatting: false
      });
    }

    // Sanitize body content
    if (emailData.body) {
      // Determine if body is HTML or plain text
      const isHtml = /<[^>]+>/.test(emailData.body);
      
      if (isHtml) {
        result.sanitizedData.body = HtmlSanitizer.sanitizeHtml(emailData.body);
      } else {
        result.sanitizedData.body = InputSanitizer.sanitizeText(emailData.body, {
          maxLength: 100000,
          preserveLineBreaks: true,
          allowBasicFormatting: false
        });
      }

      // Validate content
      const contentValidation = ContentValidator.validateEmailContent(result.sanitizedData.body);
      result.validationResults.body = contentValidation;
      if (!contentValidation.isValid) {
        result.isValid = false;
        result.issues.push(...contentValidation.issues);
      }
    }

    if (this.options.logSanitization) {
      console.log('Email sanitization result:', result);
    }

    return result;
  }

  /**
   * Sanitize email display content (incoming emails)
   * @param {any} email - Email object to sanitize for display
   * @returns {any} Sanitized email
   */
  sanitizeEmailForDisplay(email) {
    if (!email || typeof email !== 'object') {
      return null;
    }

    const sanitized = /** @type {any} */ ({ ...email });

    // Sanitize sender
    if (sanitized.sender) {
      const emailResult = InputSanitizer.sanitizeEmail(sanitized.sender);
      sanitized.sender = emailResult.cleanEmail;
    }

    // Sanitize subject
    if (sanitized.subject) {
      // First decode HTML entities, then sanitize
      const decodedSubject = HtmlSanitizer.decodeHtmlEntities(sanitized.subject);
      sanitized.subject = InputSanitizer.sanitizeText(decodedSubject, {
        maxLength: 500,
        preserveLineBreaks: false
      });
    }

    // Sanitize body for safe display
    if (sanitized.body) {
      sanitized.body = HtmlSanitizer.sanitizeHtml(sanitized.body);
    }

    // Sanitize snippet
    if (sanitized.snippet) {
      // First decode HTML entities, then sanitize
      const decodedSnippet = HtmlSanitizer.decodeHtmlEntities(sanitized.snippet);
      sanitized.snippet = InputSanitizer.sanitizeText(decodedSnippet, {
        maxLength: 300,
        preserveLineBreaks: false
      });
    }

    return sanitized;
  }

  /**
   * Get sanitization statistics
   * @returns {object} Statistics about sanitization operations
   */
  getStats() {
    return {
      strictMode: this.options.strictMode,
      logSanitization: this.options.logSanitization,
      allowedHtmlTags: ALLOWED_HTML_TAGS.length,
      dangerousPatterns: DANGEROUS_PATTERNS.length
    };
  }
}

/**
 * Create a sanitization service instance
 * @param {object} options - Configuration options
 * @returns {SanitizationService}
 */
export function createSanitizationService(options = {}) {
  return new SanitizationService(options);
}
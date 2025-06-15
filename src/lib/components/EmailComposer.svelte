<script lang="ts">
  import { slide } from 'svelte/transition';
  import type { Editor } from '@tiptap/core';
  import DOMPurify from 'dompurify';
  import ComposerHeader from './composer/ComposerHeader.svelte';
  import EditorToolbar from './composer/EditorToolbar.svelte';
  import EditorArea from './composer/EditorArea.svelte';
  import ComposerFooter from './composer/ComposerFooter.svelte';

  interface Email {
    id: string;
    subject: string;
    sender: string;
    date?: string;
  }

  // Props
  interface Props {
    originalEmail?: Email;
    onSend: (replyBody: string) => Promise<void>;
    onCancel: () => void;
    isVisible: boolean;
    emailCompositionFormat?: 'html' | 'plaintext';
    emailFontFamily?: string;
    emailFontSize?: string;
    autoSignatureEnabled?: boolean;
    emailSignature?: string;
    replyQuotePosition?: 'above' | 'below';
    includeOriginalMessage?: boolean;
  }

  let { 
    originalEmail,
    onSend,
    onCancel,
    isVisible = false,
    emailCompositionFormat = 'html',
    emailFontFamily = 'Arial, sans-serif',
    emailFontSize = '14px',
    autoSignatureEnabled = false,
    emailSignature = '',
    replyQuotePosition = 'below',
    includeOriginalMessage = true
  }: Props = $props();

  // Component state
  let replyBody = $state('');
  let isSending = $state(false);
  let editor = $state<Editor>();
  let editorElement = $state<HTMLElement>();
  let showLinkInput = $state(false);
  let linkUrl = $state('');
  let isLinkActive = $state(false);
  let showColorPicker = $state(false);
  let showFontSelector = $state(false);
  let showFontSizeSelector = $state(false);
  let currentFont = $state(emailFontFamily?.split(',')[0] || 'Arial');
  let currentFontSize = $state(emailFontSize);

  function getPlainText() {
    if (editor) {
      return editor.getText();
    }
    return '';
  }

  // Reactive content detection for button state
  let hasEditorContent = $state(false);

  // Update content detection when editor or replyBody changes
  $effect(() => {
    if (editor && replyBody !== undefined) {
      const text = editor.getText();
      const html = editor.getHTML();
      // Check both plain text and if HTML has meaningful content
      hasEditorContent = Boolean(text.trim().length > 0 || (html && html.replace(/<[^>]*>/g, '').trim().length > 0));
    } else {
      hasEditorContent = Boolean(replyBody.trim().length > 0);
    }
  });

  // Convert editor HTML to email-safe HTML with security sanitization
  function makeEmailSafe(html: string): string {
    if (!html) return '';
    
    let sanitized: string;
    
    // Use DOMPurify for sanitization if available (browser environment)
    // Check if we're in a browser environment by checking for window object
    if (typeof window !== 'undefined' && window.document) {
      // Browser environment
      try {
        sanitized = DOMPurify.sanitize(html, {
          ALLOWED_TAGS: [
            'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'img', 
            'table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot',
            'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'blockquote', 'hr'
          ],
          ALLOWED_ATTR: [
            'href', 'src', 'alt', 'title', 'style', 'target',
            'width', 'height', 'border', 'cellpadding', 'cellspacing', 'bgcolor', 'background'
          ],
          KEEP_CONTENT: true,
          RETURN_DOM: false,
          SANITIZE_DOM: true,
          FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
          ADD_ATTR: ['target']
        });
      } catch (error) {
        console.warn('DOMPurify sanitization failed, using fallback:', error);
        sanitized = html;
      }
    } else {
      // Server environment - use basic regex sanitization as fallback
      sanitized = html
        // Remove script tags and their content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove dangerous event handlers
        .replace(/\s+on\w+="[^"]*"/gi, '')
        .replace(/\s+on\w+='[^']*'/gi, '')
        // Remove javascript: URLs
        .replace(/javascript:[^"']*/gi, '');
    }

    // Then apply email-specific conversions for editor cleanup
    return sanitized
      // Remove any remaining data attributes that editors might add
      .replace(/\s+data-[a-z-]+="[^"]*"/gi, '')
      // Clean up any editor-specific classes
      .replace(/\s+class="[^"]*ProseMirror[^"]*"/gi, '')
      .replace(/\s+class="[^"]*node-[^"]*"/gi, '')
      // Ensure proper paragraph structure for email
      .replace(/<div([^>]*)>/gi, '<p$1>')
      .replace(/<\/div>/gi, '</p>');
  }

  async function handleSend() {
    if (isSending) return; // Prevent multiple sends
    
    const plainText = getPlainText().trim();
    if (!plainText) return;
    
    isSending = true;
    try {
      let finalContent = '';
      
      if (emailCompositionFormat === 'plaintext') {
        // Plain text email composition
        finalContent = buildPlainTextEmail();
      } else {
        // HTML email composition
        finalContent = buildHtmlEmail();
      }
      
      await onSend(finalContent);
      
      // Clear the editor after successful send
      if (editor) {
        editor.commands.setContent('');
        replyBody = '';
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
      // Keep the reply body so user can try again
    } finally {
      isSending = false;
    }
  }

  function buildPlainTextEmail(): string {
    let content = [];
    
    // Add user's reply content first if positioning above, or if no original message
    if (replyQuotePosition === 'above' || !includeOriginalMessage) {
      content.push(getPlainText());
      
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
      const quotedLines = originalText.split('\n').map((line: string) => `> ${line}`);
      content.push(...quotedLines);
      
      // Add user's reply below if positioning below
      if (replyQuotePosition === 'below') {
        content.push(''); // Empty line
        content.push(getPlainText());
        
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

  function buildHtmlEmail(): string {
    let content = [];
    
    // Apply user's font settings to their composed content
    const userContentStyle = `font-family: ${emailFontFamily}; font-size: ${emailFontSize}; line-height: 1.5;`;
    const userContent = `<div style="${userContentStyle}">${makeEmailSafe(replyBody)}</div>`;
    
    // Add user's reply content first if positioning above, or if no original message
    if (replyQuotePosition === 'above' || !includeOriginalMessage) {
      content.push(userContent);
      
      // Add signature if enabled
      if (autoSignatureEnabled && emailSignature.trim()) {
        content.push('<div>--</div>'); // Signature separator
        const signatureHtml = emailSignature.split('\n').map(line => `<div style="${userContentStyle}">${makeEmailSafe(line)}</div>`).join('');
        content.push(signatureHtml);
      }
    }
    
    // Add original message if enabled and it exists
    if (includeOriginalMessage && originalEmail) {
      content.push('<br>'); // Line break
      content.push(`<div style="color: #666; font-size: 12px;">On ${makeEmailSafe(originalEmail.date || 'unknown date')}, ${makeEmailSafe(originalEmail.sender)} wrote:</div>`);
      content.push('<br>');
      
      // Quote the original message (use original formatting, not user's font settings)
      const originalContent = originalEmail.subject || 'Original message';
      content.push(`<blockquote style="border-left: 4px solid #ccc; padding-left: 16px; margin: 0; color: #666; font-style: italic;">${makeEmailSafe(originalContent)}</blockquote>`);
      
      // Add user's reply below if positioning below
      if (replyQuotePosition === 'below') {
        content.push('<br>'); // Line break
        content.push(userContent);
        
        // Add signature if enabled
        if (autoSignatureEnabled && emailSignature.trim()) {
          content.push('<div>--</div>'); // Signature separator
          const signatureHtml = emailSignature.split('\n').map(line => `<div style="${userContentStyle}">${makeEmailSafe(line)}</div>`).join('');
          content.push(signatureHtml);
        }
      }
    }
    
    return content.join('');
  }

  function handleCancel() {
    // Destroy the editor completely
    if (editor) {
      console.log('Destroying editor on cancel');
      editor.destroy();
      editor = undefined;
      replyBody = '';
    }
    onCancel();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      handleEscape();
      return;
    }
    
    if (event.key === 'Enter') {
      // Handle Enter key in link input
      const target = event.target as HTMLElement;
      if (target?.getAttribute('data-link-input') === 'true') {
        event.preventDefault();
        return;
      }
      
      // Handle Ctrl/Cmd+Enter for send
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        handleSend();
      }
    }
  }

  function handleEscape() {
    // Priority 1: Close dropdowns and dialogs first
    if (showLinkInput) {
      showLinkInput = false;
      linkUrl = '';
      editor?.commands.focus();
      return;
    }
    
    if (showColorPicker) {
      showColorPicker = false;
      editor?.commands.focus();
      return;
    }
    
    if (showFontSelector) {
      showFontSelector = false;
      editor?.commands.focus();
      return;
    }
    
    if (showFontSizeSelector) {
      showFontSizeSelector = false;
      editor?.commands.focus();
      return;
    }
    
    // Priority 2: Close the email composer if no dropdowns are open
    handleCancel();
  }

  function closeDropdowns() {
    showFontSelector = false;
    showFontSizeSelector = false;
    showColorPicker = false;
  }

  // Focus the editor when visible
  $effect(() => {
    if (isVisible && editor) {
      // Delay focus to ensure DOM is ready
      setTimeout(() => {
        editor?.commands.focus();
      }, 100);
    }
  });
</script>

{#if isVisible}
  <!-- Simple Bottom Composer -->
  <div 
    class="fixed bottom-2 left-0 right-0 h-[60vh] bg-white bg-opacity-90 backdrop-blur-md shadow-2xl border-t border-gray-300 z-50 rounded-t-lg"
    transition:slide={{ duration: 300, axis: 'y' }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="reply-composer-title"
    onkeydown={handleKeydown}
    tabindex="-1"
  >
    <!-- Header -->
    <ComposerHeader
      {originalEmail}
      onCancel={handleCancel}
      {isSending}
    />

    <!-- Simple Rich Text Editor -->
    <div class="h-[calc(100%-120px)] flex flex-col">
      <!-- Gmail-style Toolbar -->
      <EditorToolbar
        bind:editor
        bind:showLinkInput
        bind:linkUrl
        bind:isLinkActive
        bind:showColorPicker
        bind:showFontSelector
        bind:showFontSizeSelector
        bind:currentFont
        bind:currentFontSize
      />
      
      <!-- Editor -->
      <EditorArea
        bind:editor
        bind:editorElement
        bind:replyBody
        bind:isLinkActive
        {closeDropdowns}
      />
    </div>

    <!-- Footer -->
    <ComposerFooter
      {isSending}
      onSend={handleSend}
      onCancel={handleCancel}
      isDisabled={!hasEditorContent}
    />
  </div>
{/if}
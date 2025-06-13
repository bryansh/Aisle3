<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Card, Button } from 'flowbite-svelte';
  import { Reply } from 'lucide-svelte';
  import { onMount, onDestroy } from 'svelte';
  import { emailOperations } from '../stores/emailStore.js';
  import EmailComposer from './EmailComposer.svelte';

  interface EmailContent {
    id: string;
    subject: string;
    sender: string;
    date?: string;
    body_text: string;
    body_html?: string;
    snippet: string;
    is_read?: boolean;
  }

  // Props
  interface Props {
    email: EmailContent;
    sanitizeEmailHtml: (html: string) => string;
    autoMarkReadDelay?: number;
    onReply?: (replyBody: string) => Promise<void>;
  }

  let { 
    email, 
    sanitizeEmailHtml,
    autoMarkReadDelay = 1500,
    onReply
  }: Props = $props();

  let emailIframe: HTMLIFrameElement;
  let iframeLoaded = false;
  let readMarkingTimer: number | null = null;
  let hasBeenMarkedRead = false;
  let showReplyComposer = $state(false);

  // Helper function to format date to local time
  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) return dateString;
      
      // Format to local date and time
      return date.toLocaleString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || '';
    }
  }

  // Enhanced email HTML with Gmail-like styling and CSP
  function createEmailDocument(emailHtml: string): string {
    const sanitizedHtml = sanitizeEmailHtml(emailHtml);
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; base-uri 'none'; img-src * data: https:;">
  <base target="_parent">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 20px;
      word-wrap: break-word;
      background-color: #fff;
    }
    
    /* Basic image handling */
    img {
      max-width: 100%;
      height: auto;
      border: 0;
    }
    
    /* Hide potentially problematic elements */
    script, object, embed, applet, form, input, button, textarea, select {
      display: none;
    }
    
    /* Support bgcolor attribute */
    [bgcolor] {
      background-color: attr(bgcolor);
    }
    
    /* Basic responsive table behavior */
    @media screen and (max-width: 600px) {
      table {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  ${sanitizedHtml}
</body>
</html>`;
  }

  // Auto-mark email as read after delay
  function startReadMarkingTimer() {
    // Only start timer if email is unread, auto-mark is enabled, and hasn't been marked already
    if (email.is_read || hasBeenMarkedRead || readMarkingTimer || autoMarkReadDelay <= 0) {
      return;
    }

    readMarkingTimer = window.setTimeout(async () => {
      try {
        if (!email.is_read && !hasBeenMarkedRead) {
          await emailOperations.markAsRead(email.id, true); // true = automatic
          hasBeenMarkedRead = true;
          console.log(`📧 Auto-marked email "${email.subject}" as read after ${autoMarkReadDelay}ms`);
        }
      } catch (error) {
        console.error('Error auto-marking email as read:', error);
      } finally {
        readMarkingTimer = null;
      }
    }, autoMarkReadDelay);
  }

  function clearReadMarkingTimer() {
    if (readMarkingTimer) {
      window.clearTimeout(readMarkingTimer);
      readMarkingTimer = null;
    }
  }

  // Reply handling functions
  function handleReplyClick() {
    showReplyComposer = true;
  }

  // Keyboard shortcut handler
  function handleKeydown(event: KeyboardEvent) {
    // Only handle if not already in composer and onReply is available
    if (showReplyComposer || !onReply) return;
    
    // Check if focus is in an input/textarea to avoid interfering with typing
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    )) {
      return;
    }

    if (event.key.toLowerCase() === 'r' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      handleReplyClick();
    }
  }

  function handleCancelReply() {
    showReplyComposer = false;
  }

  async function handleSendReply(replyBody: string) {
    if (onReply) {
      await onReply(replyBody);
      showReplyComposer = false;
    }
  }

  // Setup iframe content when component mounts or email changes
  onMount(() => {
    setupIframeContent();
    startReadMarkingTimer();
    
    // Add keyboard event listener
    document.addEventListener('keydown', handleKeydown);
  });

  // Cleanup timer on destroy
  onDestroy(() => {
    clearReadMarkingTimer();
    
    // Remove keyboard event listener
    document.removeEventListener('keydown', handleKeydown);
  });

  function setupIframeContent() {
    if (!emailIframe) return;
    
    try {
      const emailDoc = email.body_html 
        ? createEmailDocument(email.body_html)
        : `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 20px;
      white-space: pre-wrap;
      background-color: #fff;
    }
  </style>
</head>
<body>${email.body_text}</body>
</html>`;

      emailIframe.srcdoc = emailDoc;
      iframeLoaded = true;
    } catch (error) {
      console.error('Error setting up iframe content:', error);
    }
  }

  // Adjust iframe height based on content
  function adjustIframeHeight() {
    if (!emailIframe || !emailIframe.contentDocument) return;
    
    try {
      const contentHeight = emailIframe.contentDocument.documentElement.scrollHeight;
      emailIframe.style.height = Math.max(contentHeight, 400) + 'px';
    } catch (error) {
      console.error('Error adjusting iframe height:', error);
      emailIframe.style.height = '400px';
    }
  }

  // Handle iframe load event
  function handleIframeLoad() {
    adjustIframeHeight();
    
    // Convert HTML background attributes to CSS styles
    if (emailIframe.contentDocument) {
      const elementsWithBackground = emailIframe.contentDocument.querySelectorAll('[background]');
      
      elementsWithBackground.forEach((element: Element) => {
        const bgUrl = element.getAttribute('background');
        if (bgUrl) {
          (element as HTMLElement).style.backgroundImage = `url("${bgUrl}")`;
          (element as HTMLElement).style.backgroundRepeat = 'no-repeat';
          (element as HTMLElement).style.backgroundPosition = 'center';
          (element as HTMLElement).style.backgroundSize = 'cover';
        }
      });
      
      // Add click handler to open links in parent window
      emailIframe.contentDocument.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'A') {
          e.preventDefault();
          const href = (target as HTMLAnchorElement).href;
          if (href && href.startsWith('http')) {
            window.open(href, '_blank', 'noopener,noreferrer');
          }
        }
      });
    }
  }

  // Re-setup content when email changes
  $effect(() => {
    if (email && emailIframe) {
      setupIframeContent();
      
      // Reset timer state for new email
      clearReadMarkingTimer();
      hasBeenMarkedRead = false;
      startReadMarkingTimer();
    }
  });

  // Force reload when component updates
  $effect(() => {
    if (emailIframe && iframeLoaded) {
      setupIframeContent();
    }
  });
</script>

<!-- Email Reading View -->
<div in:fade={{ duration: 300 }} class="w-full">
  <div class="overflow-hidden shadow-lg w-full bg-white rounded-lg border border-gray-200">
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-8">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4 leading-tight">
            {email.subject}
          </h2>
          <div class="space-y-2">
            <p class="font-medium text-gray-700 m-0">From: {email.sender}</p>
            {#if email.date}
              <p class="text-sm text-gray-600 m-0">Date: {formatDate(email.date)}</p>
            {/if}
          </div>
        </div>
        
        <!-- Reply Button -->
        {#if onReply}
          <Button
            size="sm"
            color="blue"
            class="flex items-center gap-2 ml-4"
            onclick={handleReplyClick}
            title="Reply to this email (Press R)"
          >
            <Reply class="w-4 h-4" />
            Reply
            <kbd class="hidden sm:inline-block ml-1 px-1 py-0.5 text-xs font-mono bg-blue-200 text-blue-800 rounded">R</kbd>
          </Button>
        {/if}
      </div>
    </div>
    
    <div class="p-0 bg-white min-h-[60vh] overflow-hidden">
      <iframe
        bind:this={emailIframe}
        onload={handleIframeLoad}
        title="Email content"
        class="w-full border-0 bg-white"
        style="height: 400px;"
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
        loading="lazy"
      ></iframe>
    </div>
  </div>
  
  <!-- Simple Bottom Composer -->
  <EmailComposer
    originalEmail={email}
    onSend={handleSendReply}
    onCancel={handleCancelReply}
    isVisible={showReplyComposer}
  />
</div>
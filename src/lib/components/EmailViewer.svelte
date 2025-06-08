<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Card } from 'flowbite-svelte';
  import { onMount } from 'svelte';

  interface EmailContent {
    id: string;
    subject: string;
    sender: string;
    date?: string;
    body_text: string;
    body_html?: string;
    snippet: string;
  }

  // Props
  interface Props {
    email: EmailContent;
    sanitizeEmailHtml: (html: string) => string;
  }

  let { 
    email, 
    sanitizeEmailHtml 
  }: Props = $props();

  let emailIframe: HTMLIFrameElement;
  let iframeLoaded = false;

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

  // Setup iframe content when component mounts or email changes
  onMount(() => {
    setupIframeContent();
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
</div>
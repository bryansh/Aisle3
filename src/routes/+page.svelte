<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import AuthSection from '$lib/components/AuthSection.svelte';
  import Header from '$lib/components/Header.svelte';
  import EmailList from '$lib/components/EmailList.svelte';
  import EmailViewer from '$lib/components/EmailViewer.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import Settings from '$lib/components/Settings.svelte';
  import DOMPurify from 'dompurify';

  interface Email {
    id: string;
    subject: string;
    sender: string;
    snippet: string;
    is_read: boolean;
  }

  interface EmailContent {
    id: string;
    subject: string;
    sender: string;
    date?: string;
    body_text: string;
    body_html?: string;
    snippet: string;
  }

  // State using runes
  let isAuthenticated = $state(false);
  let emails = $state<Email[]>([]);
  let totalCount = $state(0);
  let unreadCount = $state(0);
  let loading = $state(false);
  let showEmailView = $state(false);
  let showSettings = $state(false);
  let selectedEmail = $state<EmailContent | null>(null);
  let loadingEmail = $state(false);
  
  // Real-time updates state
  let autoPollingEnabled = $state(false);
  let pollingIntervalSeconds = $state(30);
  let pollingInterval = $state(null);

  // Load settings from localStorage on mount
  const loadSettings = () => {
    if (typeof window !== 'undefined') {
      const savedAutoPolling = localStorage.getItem('autoPollingEnabled');
      const savedInterval = localStorage.getItem('pollingIntervalSeconds');
      
      if (savedAutoPolling !== null) {
        autoPollingEnabled = JSON.parse(savedAutoPolling);
      }
      if (savedInterval !== null) {
        pollingIntervalSeconds = parseInt(savedInterval, 10);
      }
    }
  };

  // Save settings to localStorage
  const saveSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('autoPollingEnabled', JSON.stringify(autoPollingEnabled));
      localStorage.setItem('pollingIntervalSeconds', pollingIntervalSeconds.toString());
    }
  };

  // Check authentication status on mount
  onMount(async () => {
    try {
      // Load saved settings first
      loadSettings();
      
      isAuthenticated = await invoke<boolean>('get_auth_status');
      if (isAuthenticated) {
        await loadEmails();
        await loadStats();
        
        // Start auto-polling if it was enabled
        if (autoPollingEnabled) {
          startAutoPolling();
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }

    // Add ESC key event listener
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showEmailView) {
        handleBackToInbox();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    
    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });

  const handleAuthSuccess = async () => {
    isAuthenticated = true;
    await loadEmails();
    await loadStats();
  };

  const loadEmails = async () => {
    loading = true;
    try {
      emails = await invoke<Email[]>('get_emails');
    } catch (error) {
      console.error('Error loading emails:', error);
    }
    loading = false;
  };

  // Background loading without spinner - used for auto-polling
  const loadEmailsInBackground = async () => {
    try {
      const newEmails = await invoke<Email[]>('get_emails');
      emails = newEmails; // Update emails seamlessly
    } catch (error) {
      console.error('Error loading emails in background:', error);
    }
  };

  const loadStats = async () => {
    try {
      const stats = await invoke<[number, number]>('get_inbox_stats');
      totalCount = stats[0];
      unreadCount = stats[1];
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Background stats loading
  const loadStatsInBackground = async () => {
    try {
      const stats = await invoke<[number, number]>('get_inbox_stats');
      totalCount = stats[0];
      unreadCount = stats[1];
    } catch (error) {
      console.error('Error loading stats in background:', error);
    }
  };

  const handleEmailSelect = async (email: Email) => {
    loadingEmail = true;
    try {
      const emailContent = await invoke<EmailContent>('get_email_content', { 
        emailId: email.id 
      });
      selectedEmail = emailContent;
      showEmailView = true;
    } catch (error) {
      console.error('Error loading email content:', error);
    }
    loadingEmail = false;
  };

  const handleBackToInbox = () => {
    showEmailView = false;
    showSettings = false;
    selectedEmail = null;
  };

  const handleShowSettings = () => {
    showSettings = true;
    showEmailView = false;
    selectedEmail = null;
  };


  const checkForNewEmails = async (useBackgroundLoading = false) => {
    try {
      const newEmailIds = await invoke<string[]>('check_for_new_emails_since_last_check');
      if (newEmailIds && newEmailIds.length > 0) {
        console.log(`📬 Found ${newEmailIds.length} new emails:`, newEmailIds);
        // Refresh emails - use background loading if specified
        if (useBackgroundLoading) {
          await loadEmailsInBackground();
          await loadStatsInBackground();
        } else {
          await loadEmails();
          await loadStats();
        }
        return true; // Found new emails
      }
      return false; // No new emails
    } catch (error) {
      console.error('Error checking for new emails:', error);
      return false;
    }
  };

  const startAutoPolling = () => {
    if (pollingInterval) return; // Already running
    
    pollingInterval = setInterval(async () => {
      if (isAuthenticated) {
        // Use background loading for auto-polling to avoid loading spinner
        await checkForNewEmails(true);
      }
    }, pollingIntervalSeconds * 1000); // Convert seconds to milliseconds
    
    console.log(`🔄 Auto-polling started (every ${pollingIntervalSeconds} seconds)`);
  };

  const stopAutoPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    console.log('⏹️ Auto-polling stopped');
  };

  // Settings event handlers
  const handleToggleAutoPolling = () => {
    if (autoPollingEnabled) {
      startAutoPolling();
    } else {
      stopAutoPolling();
    }
    saveSettings();
  };

  const handleIntervalChanged = () => {
    console.log(`🔄 Polling interval changed to ${pollingIntervalSeconds} seconds`);
    
    // Restart polling with new interval if it's currently running
    if (autoPollingEnabled && pollingInterval) {
      stopAutoPolling();
      startAutoPolling();
    }
    saveSettings();
  };

  const handleCheckNow = async () => {
    // Manual check uses regular loading (with spinner)
    await checkForNewEmails(false);
  };

  // Cleanup polling on component unmount
  $effect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  });

  function sanitizeEmailHtml(html: string): string {
    if (!html) return '';
    
    return DOMPurify.sanitize(html, {
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
      ALLOWED_STYLES: [
        'color', 'font-size', 'font-weight', 'font-family', 'text-align', 
        'text-decoration', 'line-height', 'background-color',
        'padding', 'margin', 'border', 'border-radius'
      ],
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      SANITIZE_DOM: true,
      FORBID_ATTR: ['onerror', 'onload', 'onclick'],
      ADD_ATTR: ['target'],
      TRANSFORM_TAGS: {
        'img': function(tagName, attribs) {
          const width = attribs.width;
          const height = attribs.height;
          
          if (width === '1' && height === '1') {
            return null;
          }
          
          attribs.style = (attribs.style || '') + '; max-width: 100%; height: auto;';
          delete attribs.width;
          delete attribs.height;
          
          return { tagName: tagName, attribs: attribs };
        }
      }
    });
  }
</script>

<main class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
  <div class="max-w-7xl mx-auto">
    {#if isAuthenticated}
      <Header 
        {showEmailView}
        {showSettings}
        {totalCount}
        {unreadCount}
        {isAuthenticated}
        onBackToInbox={handleBackToInbox}
        onShowSettings={handleShowSettings}
      />

      {#if showEmailView && selectedEmail}
        {#if loadingEmail}
          <LoadingSpinner />
        {:else}
          <EmailViewer 
            email={selectedEmail}
            {sanitizeEmailHtml}
          />
        {/if}
      {:else if showSettings}
        <Settings 
          bind:autoPollingEnabled
          bind:pollingInterval={pollingIntervalSeconds}
          onToggleAutoPolling={handleToggleAutoPolling}
          onIntervalChanged={handleIntervalChanged}
          onCheckNow={handleCheckNow}
        />
      {:else}
        {#if loading}
          <LoadingSpinner />
        {:else}
          <EmailList 
            {emails}
            onEmailSelect={handleEmailSelect}
          />
        {/if}
      {/if}
    {:else}
      <AuthSection onAuthSuccess={handleAuthSuccess} />
    {/if}
  </div>
</main>

<style>
:global(.email-content-clean) {
    line-height: 1.6;
    max-width: 100%;
    overflow-wrap: break-word;
    word-wrap: break-word;
    font-family: system-ui, -apple-system, sans-serif;
    color: #374151;
  }
  
  :global(.email-content-clean img) {
    max-width: 100%;
    height: auto;
  }
  
  :global(.email-content-clean table) {
    width: 100%;
    max-width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
  }
  
  :global(.email-content-clean td, .email-content-clean th) {
    padding: 8px;
    text-align: left;
  }
  
  :global(.email-content-clean p) {
    margin: 1em 0;
  }
</style>
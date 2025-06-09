<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import AuthSection from './AuthSection.svelte';
  import Header from './Header.svelte';
  import EmailList from './EmailList.svelte';
  import EmailViewer from './EmailViewer.svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import Settings from './Settings.svelte';
  import ConversationList from './ConversationList.svelte';
  import ConversationViewer from './ConversationViewer.svelte';
  import DOMPurify from 'dompurify';
  import { decode } from 'he';

  // Import stores
  import {
    emails,
    totalCount,
    unreadCount,
    loading,
    viewMode,
    showSingleMessageThreads,
    selectedEmail,
    selectedConversation,
    loadingEmail,
    showEmailView,
    showSettings,
    loadingEmailStates,
    conversations,
    conversationStats,
    emailOperations,
    navigationOperations
  } from '../stores/emailStore.js';

  // Authentication state
  let isAuthenticated = $state(false);

  // Auto-polling state
  let autoPollingEnabled = $state(false);
  let pollingIntervalSeconds = $state(30);
  let pollingInterval: number | null = $state(null);

  // Load settings from localStorage
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
  onMount(() => {
    const initializeApp = async () => {
      try {
        loadSettings();
        
        isAuthenticated = await invoke<boolean>('get_auth_status');
        if (isAuthenticated) {
          await emailOperations.loadEmails();
          await emailOperations.loadStats();
          
          if (autoPollingEnabled) {
            startAutoPolling();
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    };

    initializeApp();

    // Add ESC key event listener
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && $showEmailView) {
        navigationOperations.backToInbox();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  });

  // Authentication handler
  const handleAuthSuccess = async () => {
    isAuthenticated = true;
    await emailOperations.loadEmails();
    await emailOperations.loadStats();
  };

  // Email selection handlers
  const handleEmailSelect = async (email: any) => {
    try {
      await emailOperations.getEmailContent(email.id);
    } catch (error) {
      console.error('Error selecting email:', error);
    }
  };

  const handleConversationSelect = (conversation: any) => {
    navigationOperations.selectConversation(conversation);
  };

  // Auto-polling functions
  const startAutoPolling = () => {
    if (pollingInterval) return;
    
    pollingInterval = setInterval(async () => {
      if (isAuthenticated) {
        await emailOperations.checkForNewEmails(true);
      }
    }, pollingIntervalSeconds * 1000);
    
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
    
    if (autoPollingEnabled && pollingInterval) {
      stopAutoPolling();
      startAutoPolling();
    }
    saveSettings();
  };

  const handleCheckNow = async () => {
    await emailOperations.checkForNewEmails(false);
  };

  // DOMPurify function
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
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      SANITIZE_DOM: true,
      FORBID_ATTR: ['onerror', 'onload', 'onclick'],
      ADD_ATTR: ['target']
    });
  }
</script>

<main class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
  <div class="max-w-7xl mx-auto">
    {#if isAuthenticated}
      <Header 
        showEmailView={$showEmailView}
        showSettings={$showSettings}
        totalCount={$totalCount}
        unreadCount={$unreadCount}
        {isAuthenticated}
        viewMode={$viewMode as "emails" | "conversations"}
        onBackToInbox={navigationOperations.backToInbox}
        onShowSettings={navigationOperations.showSettingsView}
        onViewModeToggle={navigationOperations.toggleViewMode}
      />

      {#if $showEmailView && ($selectedEmail || $selectedConversation)}
        {#if $loadingEmail}
          <LoadingSpinner />
        {:else if $selectedConversation}
          <ConversationViewer 
            conversation={$selectedConversation}
            onEmailSelect={handleEmailSelect}
            onMarkAsRead={emailOperations.markAsRead}
            onMarkAsUnread={emailOperations.markAsUnread}
            loadingEmailStates={$loadingEmailStates}
            {decode}
          />
        {:else if $selectedEmail}
          <EmailViewer 
            email={$selectedEmail}
            {sanitizeEmailHtml}
          />
        {/if}
      {:else if $showSettings}
        <Settings 
          bind:autoPollingEnabled
          bind:pollingInterval={pollingIntervalSeconds}
          onToggleAutoPolling={handleToggleAutoPolling}
          onIntervalChanged={handleIntervalChanged}
          onCheckNow={handleCheckNow}
        />
      {:else}
        {#if $loading}
          <LoadingSpinner />
        {:else if $viewMode === 'conversations'}
          {#if $conversationStats && $conversationStats.multiMessageThreads === 0}
            <div class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-yellow-800">
                    <strong>No multi-message conversations found.</strong> 
                    All your emails have unique thread IDs.
                  </p>
                  <p class="text-xs text-yellow-700 mt-1">
                    This is normal - most emails are standalone messages.
                  </p>
                </div>
                <label class="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    bind:checked={$showSingleMessageThreads}
                    class="rounded"
                  />
                  <span class="text-sm text-yellow-800">Show all as threads</span>
                </label>
              </div>
            </div>
          {/if}
          
          <ConversationList 
            conversations={$conversations}
            onConversationSelect={handleConversationSelect}
          />
        {:else}
          <EmailList 
            emails={$emails}
            onEmailSelect={handleEmailSelect}
            onMarkAsRead={emailOperations.markAsRead}
            onMarkAsUnread={emailOperations.markAsUnread}
            loadingEmailStates={$loadingEmailStates}
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
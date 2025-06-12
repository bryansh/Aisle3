<script lang="ts">
  import { onMount } from 'svelte';
  import AuthSection from './AuthSection.svelte';
  import Header from './Header.svelte';
  import EmailList from './EmailList.svelte';
  import EmailListVirtualized from './EmailListVirtualized.svelte';
  import EmailViewer from './EmailViewer.svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import Settings from './Settings.svelte';
  import ConversationList from './ConversationList.svelte';
  import ConversationViewer from './ConversationViewer.svelte';
  import DOMPurify from 'dompurify';
  import { decode } from 'he';
  import { performanceSuite } from '../utils/performance.js';
  import { debounce, globalOptimizer } from '../utils/performanceOptimizations.js';
  
  // Import utility modules
  import { SettingsManager } from '../utils/settingsManager.js';
  import { AuthManager, initializeAuth, handleAuthSuccess as handleAuthSuccessUtil } from '../utils/authManager.js';
  import { createEmailPollingManager } from '../utils/pollingManager.js';

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

  // Initialize utility managers
  const settingsManager = new SettingsManager();
  let authManager: AuthManager;
  let pollingManager: any;
  
  // Authentication state
  let isAuthenticated = $state(false);
  
  // Settings state (bound to settingsManager)
  let autoPollingEnabled = $state(settingsManager.getSetting('autoPollingEnabled'));
  let pollingIntervalSeconds = $state(settingsManager.getSetting('pollingIntervalSeconds'));
  let autoMarkReadEnabled = $state(settingsManager.getSetting('autoMarkReadEnabled'));
  let autoMarkReadDelay = $state(settingsManager.getSetting('autoMarkReadDelay'));

  // Load settings from settingsManager
  const loadSettings = () => {
    const settings = settingsManager.getSettings();
    autoPollingEnabled = settings.autoPollingEnabled;
    pollingIntervalSeconds = settings.pollingIntervalSeconds;
    autoMarkReadEnabled = settings.autoMarkReadEnabled;
    autoMarkReadDelay = settings.autoMarkReadDelay;
  };

  // Save settings via settingsManager
  const saveSettings = () => {
    settingsManager.updateSettings({
      autoPollingEnabled,
      pollingIntervalSeconds,
      autoMarkReadEnabled,
      autoMarkReadDelay
    });
  };

  // Check authentication status on mount
  onMount(() => {
    // Initialize performance monitoring
    globalOptimizer.init();
    performanceSuite.startMonitoring();
    
    const initializeApp = async () => {
      try {
        // Load settings from settingsManager
        loadSettings();
        
        // Initialize authentication
        const authResult = await initializeAuth(emailOperations);
        if (authResult.success) {
          authManager = authResult.data.authManager;
          isAuthenticated = authResult.data.isAuthenticated;
          
          // Set up auth state listener
          authManager.addListener((authState) => {
            isAuthenticated = authState.isAuthenticated;
          });
          
          // Initialize polling manager if authenticated
          if (isAuthenticated) {
            pollingManager = createEmailPollingManager(emailOperations, {
              intervalSeconds: pollingIntervalSeconds,
              enabled: autoPollingEnabled
            });
            
            if (autoPollingEnabled) {
              pollingManager.start();
            }
          }
        }
      } catch (error) {
        console.error('Error initializing app:', error);
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
      
      // Cleanup utility managers
      if (pollingManager) {
        pollingManager.cleanup();
      }
      if (authManager) {
        authManager.cleanup();
      }
      
      // Cleanup performance monitoring
      performanceSuite.stopMonitoring();
      globalOptimizer.cleanup();
    };
  });

  // Authentication handler
  const handleAuthSuccess = async () => {
    if (authManager) {
      const result = await handleAuthSuccessUtil(authManager, emailOperations);
      if (result.success) {
        // Initialize polling manager for authenticated user
        pollingManager = createEmailPollingManager(emailOperations, {
          intervalSeconds: pollingIntervalSeconds,
          enabled: autoPollingEnabled
        });
        
        if (autoPollingEnabled) {
          pollingManager.start();
        }
      }
    }
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

  // Auto-polling functions (delegated to pollingManager)
  const startAutoPolling = () => {
    if (pollingManager) {
      pollingManager.start();
    }
  };

  const stopAutoPolling = () => {
    if (pollingManager) {
      pollingManager.stop();
    }
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
    
    if (pollingManager) {
      pollingManager.setInterval(pollingIntervalSeconds);
    }
    saveSettings();
  };

  const handleCheckNow = async () => {
    if (pollingManager) {
      await pollingManager.poll();
    } else {
      await emailOperations.checkForNewEmails(false);
    }
  };

  // Reply handling
  const handleEmailReply = async (replyBody: string) => {
    const email = $selectedEmail as any;
    if (email && email.id) {
      try {
        await emailOperations.sendReply(email.id, replyBody);
        console.log('✅ Reply sent successfully!');
        
        // Optionally refresh emails in background to show the sent reply
        await emailOperations.loadEmailsInBackground();
      } catch (error) {
        console.error('❌ Failed to send reply:', error);
        throw error; // Re-throw to let the composer handle the error
      }
    }
  };

  // Auto-mark read settings handlers
  const handleToggleAutoMarkRead = () => {
    saveSettings();
  };

  const handleAutoMarkReadDelayChanged = () => {
    saveSettings();
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
            loadingEmailStates={loadingEmailStates}
            {decode}
          />
        {:else if $selectedEmail}
          <EmailViewer 
            email={$selectedEmail}
            {sanitizeEmailHtml}
            autoMarkReadDelay={autoMarkReadEnabled ? autoMarkReadDelay : 0}
            onReply={handleEmailReply}
          />
        {/if}
      {:else if $showSettings}
        <Settings 
          bind:autoPollingEnabled
          bind:pollingInterval={pollingIntervalSeconds}
          bind:autoMarkReadEnabled
          bind:autoMarkReadDelay
          onToggleAutoPolling={handleToggleAutoPolling}
          onIntervalChanged={handleIntervalChanged}
          onToggleAutoMarkRead={handleToggleAutoMarkRead}
          onAutoMarkReadDelayChanged={handleAutoMarkReadDelayChanged}
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
          <EmailListVirtualized 
            emails={$emails}
            onEmailSelect={handleEmailSelect}
            onMarkAsRead={emailOperations.markAsRead}
            onMarkAsUnread={emailOperations.markAsUnread}
            loadingEmailStates={loadingEmailStates}
            containerHeight={600}
            itemHeight={120}
            useVirtualization={true}
            virtualizationThreshold={50}
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
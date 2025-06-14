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
  let isDemoMode = $state(false);
  let isValidatingCredentials = $state(true);
  
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
        
        // Credential validation complete
        isValidatingCredentials = false;
      } catch (error) {
        console.error('Error initializing app:', error);
        // Even on error, stop showing loading screen
        isValidatingCredentials = false;
      }
    };

    initializeApp();

    // Add ESC key event listener
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showDemoMessage) {
          showDemoMessage = false;
        } else if ($showEmailView) {
          navigationOperations.backToInbox();
        } else if ($showSettings) {
          navigationOperations.backToInbox();
        }
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

  // Demo mode handler
  const handleTryDemo = async () => {
    isDemoMode = true;
    isAuthenticated = true; // Treat demo as authenticated to show main UI
    
    // Load mock emails immediately
    try {
      await emailOperations.loadEmails();
    } catch (error) {
      console.error('Error loading demo emails:', error);
    }
  };

  // Demo message state
  let showDemoMessage = $state(false);

  // Email selection handlers
  const handleEmailSelect = async (email: any) => {
    if (isDemoMode) {
      // In demo mode, show a message encouraging login instead of trying to fetch content
      showDemoMessage = true;
      return;
    }
    
    try {
      await emailOperations.getEmailContent(email.id);
    } catch (error) {
      console.error('Error selecting email:', error);
    }
  };

  const handleConversationSelect = (conversation: any) => {
    navigationOperations.selectConversation(conversation);
  };

  // Demo-aware mark as read handler
  const handleMarkAsRead = async (emailId: string, isAutomatic = false) => {
    if (isDemoMode) {
      showDemoMessage = true;
      return;
    }
    return emailOperations.markAsRead(emailId, isAutomatic);
  };

  // Demo-aware mark as unread handler
  const handleMarkAsUnread = async (emailId: string) => {
    if (isDemoMode) {
      showDemoMessage = true;
      return;
    }
    return emailOperations.markAsUnread(emailId);
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
    {#if isValidatingCredentials}
      <div class="flex flex-col items-center justify-center min-h-[400px]">
        <div class="mb-6">
          <LoadingSpinner />
        </div>
        <h2 class="text-xl font-semibold text-gray-700 mb-2">Checking credentials...</h2>
        <p class="text-gray-500 text-center max-w-md">
          Please wait while we verify your authentication status.
        </p>
      </div>
    {:else if isAuthenticated}
      {#if isDemoMode}
        <div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="w-2 h-2 bg-amber-400 rounded-full mr-2"></div>
              <span class="text-sm font-medium text-amber-800">Demo Mode</span>
              <span class="text-xs text-amber-600 ml-2">Showing sample emails</span>
            </div>
            <button 
              onclick={() => { isDemoMode = false; isAuthenticated = false; }}
              class="text-amber-600 hover:text-amber-800 text-sm font-medium"
            >
              Exit Demo
            </button>
          </div>
        </div>
      {/if}
      
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
            onMarkAsRead={handleMarkAsRead}
            onMarkAsUnread={handleMarkAsUnread}
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
            onMarkAsRead={handleMarkAsRead}
            onMarkAsUnread={handleMarkAsUnread}
            loadingEmailStates={loadingEmailStates}
            containerHeight={600}
            itemHeight={120}
            useVirtualization={true}
            virtualizationThreshold={50}
          />
        {/if}
      {/if}
    {:else}
      <AuthSection onAuthSuccess={handleAuthSuccess} onTryDemo={handleTryDemo} />
    {/if}
  </div>

  <!-- Demo Message Modal -->
  {#if showDemoMessage}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
      onclick={() => showDemoMessage = false}
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-modal-title"
      tabindex="-1"
    >
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4" onclick={(e) => e.stopPropagation()}>
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h3 id="demo-modal-title" class="text-lg font-semibold text-gray-900 mb-2">Connect Gmail for Full Access</h3>
          <p class="text-gray-600 mb-6">
            To read email content and access all features, please connect your Gmail account.
          </p>
          <div class="space-y-3">
            <button 
              onclick={() => { showDemoMessage = false; isDemoMode = false; isAuthenticated = false; }}
              class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Connect Gmail Account
            </button>
            <button 
              onclick={() => showDemoMessage = false}
              class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Continue Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
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
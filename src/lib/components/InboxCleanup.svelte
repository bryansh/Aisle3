<script lang="ts">
  import { Trash2, Mail, MailOpen, Loader2, RefreshCw } from 'lucide-svelte';
  import { emailOperations } from '../stores/emailStore.js';

  let {
    senderStats = [],
    onTrashSender,
    onRefresh,
    onClose
  }: {
    senderStats?: any[];
    onTrashSender: (sender: any) => Promise<void>;
    onRefresh: () => Promise<void>;
    onClose: () => void;
  } = $props();

  let selectedSender = $state<any>(null);
  let isDeleting = $state(false);
  let isLoadingEmails = $state(false);
  let isRefreshing = $state(false);
  let senderEmails = $state<any[]>([]);

  async function handleRefresh() {
    isRefreshing = true;
    try {
      await onRefresh();
    } catch (error) {
      console.error('Error refreshing stats:', error);
      alert('Failed to refresh statistics.');
    } finally {
      isRefreshing = false;
    }
  }

  // Show top 50 senders by default
  const topSenders = $derived(senderStats.slice(0, 50));

  async function selectSender(sender: any) {
    selectedSender = sender;
    senderEmails = [];

    // Fetch actual emails from this sender for preview
    isLoadingEmails = true;
    try {
      const emails = await emailOperations.getEmailsFromSender(sender.sender);
      senderEmails = emails;
    } catch (error) {
      console.error('Error loading sender emails:', error);
      alert('Failed to load emails from this sender.');
    } finally {
      isLoadingEmails = false;
    }
  }

  async function handleTrashSender(sender: any) {
    if (!confirm(`Are you sure you want to trash all ${sender.count} emails from "${sender.sender}"?\n\nThis will move them to your Gmail trash folder.`)) {
      return;
    }

    isDeleting = true;
    try {
      // Create a sender object with the actual email IDs
      const senderWithEmails = {
        ...sender,
        emails: senderEmails
      };
      await onTrashSender(senderWithEmails);

      // Remove this sender from the list
      senderStats = senderStats.filter(s => s.sender !== sender.sender);
      selectedSender = null;
      senderEmails = [];
    } catch (error) {
      console.error('Error trashing emails:', error);
      alert('Failed to trash emails. Please try again.');
    } finally {
      isDeleting = false;
    }
  }

  function parseSenderName(senderString: string): { name: string; email: string } {
    // Parse "Name <email@domain.com>" format
    const match = senderString.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    return { name: senderString, email: senderString };
  }
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div class="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between p-6 border-b border-gray-200">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Inbox Cleanup</h2>
        <p class="text-sm text-gray-600 mt-1">
          Analyzing {senderStats.length} senders across your entire inbox
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          onclick={handleRefresh}
          disabled={isRefreshing}
          class="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh sender statistics"
        >
          <RefreshCw class="w-4 h-4 {isRefreshing ? 'animate-spin' : ''}" />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
        <button
          onclick={onClose}
          class="text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Close"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden flex">
      <!-- Sender List -->
      <div class="w-2/5 border-r border-gray-200 overflow-y-auto">
        {#if topSenders.length === 0}
          <div class="p-6 text-center text-gray-500">
            <Loader2 class="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
            <p>Loading sender statistics...</p>
          </div>
        {:else}
          <div class="divide-y divide-gray-200">
            {#each topSenders as sender}
              {@const parsed = parseSenderName(sender.sender)}
              {@const isSelected = selectedSender?.sender === sender.sender}
              <button
                onclick={() => selectSender(sender)}
                class="w-full text-left p-4 hover:bg-gray-50 transition-colors {isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''}"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-900 truncate">
                      {parsed.name}
                    </div>
                    <div class="text-xs text-gray-500 truncate mt-0.5">
                      {parsed.email !== parsed.name ? parsed.email : ''}
                    </div>
                    <div class="flex items-center gap-3 mt-2 text-xs text-gray-600">
                      <span class="flex items-center gap-1 font-medium">
                        <Mail class="w-3 h-3" />
                        {sender.count}
                      </span>
                      {#if sender.unreadCount > 0}
                        <span class="flex items-center gap-1 text-blue-600 font-medium">
                          <MailOpen class="w-3 h-3" />
                          {sender.unreadCount} unread
                        </span>
                      {/if}
                    </div>
                  </div>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Preview & Actions -->
      <div class="w-3/5 overflow-y-auto">
        {#if selectedSender}
          {@const parsed = parseSenderName(selectedSender.sender)}
          <div class="p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              {parsed.name}
            </h3>
            {#if parsed.email !== parsed.name}
              <p class="text-sm text-gray-600 mb-4">{parsed.email}</p>
            {/if}

            <div class="bg-gray-50 rounded-lg p-4 mb-6">
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Total emails:</span>
                  <span class="font-medium text-gray-900">{selectedSender.count}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Unread:</span>
                  <span class="font-medium text-gray-900">{selectedSender.unreadCount}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Read:</span>
                  <span class="font-medium text-gray-900">{selectedSender.count - selectedSender.unreadCount}</span>
                </div>
              </div>
            </div>

            <!-- Sample emails preview -->
            <div class="mb-6">
              <h4 class="text-sm font-semibold text-gray-700 mb-3">
                Email preview
              </h4>

              {#if isLoadingEmails}
                <div class="flex items-center justify-center p-8">
                  <Loader2 class="w-6 h-6 text-blue-600 animate-spin" />
                  <span class="ml-2 text-sm text-gray-600">Loading emails...</span>
                </div>
              {:else if senderEmails.length > 0}
                <div class="space-y-2 mb-4">
                  {#each senderEmails.slice(0, 5) as email}
                    <div class="p-3 bg-white border border-gray-200 rounded text-sm">
                      <div class="font-medium text-gray-900 truncate mb-1">
                        {email.subject || '(No Subject)'}
                      </div>
                      <div class="text-gray-600 text-xs truncate">
                        {email.snippet}
                      </div>
                    </div>
                  {/each}
                </div>
                <p class="text-xs text-gray-500 italic">
                  Showing {Math.min(5, senderEmails.length)} of {senderEmails.length} loaded emails (total: {selectedSender.count})
                </p>
              {:else}
                <p class="text-sm text-gray-500 italic">No emails loaded</p>
              {/if}
            </div>

            <!-- Action button -->
            <button
              onclick={() => handleTrashSender(selectedSender)}
              disabled={isDeleting || senderEmails.length === 0}
              class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {#if isDeleting}
                <Loader2 class="w-5 h-5 animate-spin" />
                Deleting...
              {:else}
                <Trash2 class="w-5 h-5" />
                Delete all {selectedSender.count} emails
              {/if}
            </button>
          </div>
        {:else}
          <div class="p-6 text-center text-gray-500 flex flex-col items-center justify-center h-full">
            <Mail class="w-16 h-16 mb-4 text-gray-400" />
            <p class="text-lg font-medium">Select a sender to preview and delete emails</p>
            <p class="text-sm mt-2">Click on any sender from the list to see their emails</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

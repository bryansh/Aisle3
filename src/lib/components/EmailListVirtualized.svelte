<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Badge, Button } from 'flowbite-svelte';
  import { Mail, MailOpen, MailX } from 'lucide-svelte';
  import VirtualScrollList from './VirtualScrollList.svelte';

  interface Email {
    id: string;
    thread_id: string;
    subject: string;
    sender: string;
    snippet: string;
    is_read: boolean;
  }

  // Props
  interface Props {
    emails?: Email[];
    onEmailSelect: (email: Email) => void;
    onMarkAsRead: (emailId: string) => Promise<void>;
    onMarkAsUnread: (emailId: string) => Promise<void>;
    loadingEmailStates: { has: (id: string) => boolean };
    containerHeight?: number;
    itemHeight?: number;
    useVirtualization?: boolean;
    virtualizationThreshold?: number;
  }

  let { 
    emails = [], 
    onEmailSelect,
    onMarkAsRead,
    onMarkAsUnread,
    loadingEmailStates,
    containerHeight = 600,
    itemHeight = 120,
    useVirtualization = true,
    virtualizationThreshold = 50
  }: Props = $props();

  let virtualScrollRef: VirtualScrollList | undefined = $state();
  let scrollStats = $state({ 
    totalItems: 0, 
    renderedItems: 0, 
    renderRatio: 0 
  });

  // Determine if we should use virtualization
  const shouldVirtualize = $derived(
    useVirtualization && emails.length > virtualizationThreshold
  );

  const handleToggleReadStatus = async (event: Event, email: Email) => {
    event.stopPropagation();
    
    try {
      if (email.is_read) {
        await onMarkAsUnread(email.id);
      } else {
        await onMarkAsRead(email.id);
      }
    } catch (error) {
      console.error('Error toggling read status:', error);
    }
  };

  // Update performance stats
  const updateStats = () => {
    if (virtualScrollRef) {
      scrollStats = virtualScrollRef.getPerformanceStats();
    }
  };

  // Public API
  export const scrollToEmail = (emailIndex: number) => {
    if (virtualScrollRef) {
      virtualScrollRef.scrollToItem(emailIndex);
    }
  };

  export const getPerformanceMetrics = () => {
    return {
      totalEmails: emails.length,
      isVirtualized: shouldVirtualize,
      ...scrollStats
    };
  };
</script>

{#if emails.length === 0}
  <div class="text-center py-20">
    <Mail class="w-20 h-20 mx-auto mb-6 text-gray-300" />
    <p class="text-gray-600 text-lg">No emails found</p>
  </div>
{:else if shouldVirtualize}
  <!-- Virtualized Email List for Large Datasets -->
  <div in:fade={{ duration: 500, delay: 300 }} data-testid="email-list-virtualized">
    <div class="mb-4 text-sm text-gray-500">
      Showing {emails.length} emails (virtualized for performance)
      {#if scrollStats.totalItems > 0}
        - Rendering {scrollStats.renderedItems} of {scrollStats.totalItems} items
      {/if}
    </div>
    
    <VirtualScrollList
      bind:this={virtualScrollRef}
      items={emails}
      {itemHeight}
      {containerHeight}
      overscan={10}
      onScroll={updateStats}
    >
      {#snippet children({ item: email, index }: { item: any, index: any })}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          class="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-300 transform hover:-translate-y-1 mx-2 my-1 {!email.is_read ? 'border-l-4 border-l-blue-500 bg-white border-blue-200 shadow-md' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'} rounded-lg border shadow-sm"
          style="height: {itemHeight - 8}px; box-sizing: border-box;"
          data-testid="email-item"
          onclick={() => onEmailSelect(email)}
        >
          <div class="p-4 h-full flex flex-col justify-between">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center min-w-0 flex-1">
                {#if !email.is_read}
                  <Badge color="blue" class="mr-2 flex-shrink-0 text-xs">New</Badge>
                {/if}
                <span class="truncate max-w-xs mr-4 text-sm {!email.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}">
                  {email.sender}
                </span>
                <span class="truncate flex-1 text-sm {!email.is_read ? 'font-bold text-gray-900' : 'font-normal text-gray-600'}">
                  {email.subject}
                </span>
              </div>
              <div class="flex items-center gap-2 ml-3 flex-shrink-0">
                <Button
                  size="xs"
                  color="light"
                  onclick={(event: Event) => handleToggleReadStatus(event, email)}
                  disabled={loadingEmailStates.has(email.id)}
                  class="p-1"
                  title={email.is_read ? 'Mark as unread' : 'Mark as read'}
                >
                  {#if loadingEmailStates.has(email.id)}
                    <div class="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  {:else if email.is_read}
                    <MailX class="w-3 h-3" />
                  {:else}
                    <MailOpen class="w-3 h-3" />
                  {/if}
                </Button>
              </div>
            </div>
            <p class="text-xs truncate m-0 leading-relaxed {!email.is_read ? 'text-gray-700 font-medium' : 'text-gray-500 font-normal'}">
              {email.snippet}
            </p>
          </div>
        </div>
      {/snippet}
    </VirtualScrollList>
  </div>
{:else}
  <!-- Regular Email List for Small Datasets -->
  <div in:fade={{ duration: 500, delay: 300 }} data-testid="email-list">
    <div class="space-y-3">
      {#each emails as email}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          class="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-300 transform hover:-translate-y-1 {!email.is_read ? 'border-l-4 border-l-blue-500 bg-white border-blue-200 shadow-md' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'} rounded-lg border shadow-sm"
          data-testid="email-item"
          onclick={() => onEmailSelect(email)}
        >
          <div class="p-5">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center min-w-0 flex-1">
                {#if !email.is_read}
                  <Badge color="blue" class="mr-2 flex-shrink-0">New</Badge>
                {/if}
                <span class="truncate max-w-xs mr-4 {!email.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}">
                  {email.sender}
                </span>
                <span class="truncate flex-1 {!email.is_read ? 'font-bold text-gray-900' : 'font-normal text-gray-600'}">
                  {email.subject}
                </span>
              </div>
              <div class="flex items-center gap-2 ml-3 flex-shrink-0">
                <Button
                  size="xs"
                  color="light"
                  onclick={(event: Event) => handleToggleReadStatus(event, email)}
                  disabled={loadingEmailStates.has(email.id)}
                  class="p-1"
                  title={email.is_read ? 'Mark as unread' : 'Mark as read'}
                >
                  {#if loadingEmailStates.has(email.id)}
                    <div class="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  {:else if email.is_read}
                    <MailX class="w-4 h-4" />
                  {:else}
                    <MailOpen class="w-4 h-4" />
                  {/if}
                </Button>
              </div>
            </div>
            <p class="text-sm truncate m-0 leading-relaxed {!email.is_read ? 'text-gray-700 font-medium' : 'text-gray-500 font-normal'}">
              {email.snippet}
            </p>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  /* Performance optimizations */
  :global(.virtual-scroll-container) {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 #f7fafc;
  }
  
  :global(.virtual-scroll-container::-webkit-scrollbar) {
    width: 8px;
  }
  
  :global(.virtual-scroll-container::-webkit-scrollbar-track) {
    background: #f7fafc;
  }
  
  :global(.virtual-scroll-container::-webkit-scrollbar-thumb) {
    background: #cbd5e0;
    border-radius: 4px;
  }
  
  :global(.virtual-scroll-container::-webkit-scrollbar-thumb:hover) {
    background: #a0aec0;
  }
</style>
<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Badge, Button } from 'flowbite-svelte';
  import { Mail, MailOpen, MailX } from 'lucide-svelte';

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
    onMarkAsRead: (emailId: string) => void;
    onMarkAsUnread: (emailId: string) => void;
  }

  let { 
    emails = [], 
    onEmailSelect,
    onMarkAsRead,
    onMarkAsUnread
  }: Props = $props();

  // Track loading state for each email
  let loadingEmails = $state(new Set<string>());

  const handleToggleReadStatus = async (event: Event, email: Email) => {
    event.stopPropagation(); // Prevent email selection
    
    // Add to loading set
    loadingEmails.add(email.id);
    loadingEmails = new Set(loadingEmails); // Trigger reactivity
    
    try {
      if (email.is_read) {
        await onMarkAsUnread(email.id);
      } else {
        await onMarkAsRead(email.id);
      }
    } finally {
      // Remove from loading set
      loadingEmails.delete(email.id);
      loadingEmails = new Set(loadingEmails); // Trigger reactivity
    }
  };
</script>

{#if emails.length === 0}
  <div class="text-center py-20">
    <Mail class="w-20 h-20 mx-auto mb-6 text-gray-300" />
    <p class="text-gray-600 text-lg">No emails found</p>
  </div>
{:else}
  <!-- Email List View -->
  <div in:fade={{ duration: 500, delay: 300 }}>
    <div class="space-y-3">
      {#each emails as email}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div 
          class="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-300 transform hover:-translate-y-1 {!email.is_read ? 'border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white' : 'bg-white hover:bg-gray-50'} rounded-lg border border-gray-200 shadow-sm"
          onclick={() => onEmailSelect(email)}
        >
          <div class="p-5">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center min-w-0 flex-1">
                {#if !email.is_read}
                  <Badge color="blue" class="mr-2 flex-shrink-0">New</Badge>
                {/if}
                <span class="font-semibold text-gray-900 truncate max-w-xs mr-4">
                  {email.sender}
                </span>
                <span class="text-gray-700 truncate flex-1 font-medium">
                  {email.subject}
                </span>
              </div>
              <div class="flex items-center gap-2 ml-3 flex-shrink-0">
                <Button
                  size="xs"
                  color="light"
                  onclick={(event) => handleToggleReadStatus(event, email)}
                  disabled={loadingEmails.has(email.id)}
                  class="p-1"
                  title={email.is_read ? 'Mark as unread' : 'Mark as read'}
                >
                  {#if loadingEmails.has(email.id)}
                    <div class="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  {:else if email.is_read}
                    <MailX class="w-4 h-4" />
                  {:else}
                    <MailOpen class="w-4 h-4" />
                  {/if}
                </Button>
              </div>
            </div>
            <p class="text-sm text-gray-500 truncate m-0 leading-relaxed">
              {email.snippet}
            </p>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
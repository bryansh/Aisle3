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
    onMarkAsRead: (emailId: string) => Promise<void>;
    onMarkAsUnread: (emailId: string) => Promise<void>;
    loadingEmailStates: Set<string>;
  }

  let { 
    emails = [], 
    onEmailSelect,
    onMarkAsRead,
    onMarkAsUnread,
    loadingEmailStates
  }: Props = $props();

  const handleToggleReadStatus = async (event: Event, email: Email) => {
    event.stopPropagation(); // Prevent email selection
    
    if (email.is_read) {
      await onMarkAsUnread(email.id);
    } else {
      await onMarkAsRead(email.id);
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
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          class="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-300 transform hover:-translate-y-1 {!email.is_read ? 'border-l-4 border-l-blue-500 bg-white border-blue-200 shadow-md' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'} rounded-lg border shadow-sm"
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
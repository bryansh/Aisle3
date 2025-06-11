<script lang="ts">
  interface Email {
    id: string;
    thread_id: string;
    subject: string;
    sender: string;
    snippet: string;
    is_read: boolean;
  }
  
  interface Conversation {
    thread_id: string;
    subject: string;
    sender: string;
    snippet: string;
    message_count: number;
    has_unread: boolean;
    latest_date: string;
    emails: Email[];
  }

  interface Props {
    conversation: Conversation;
    onEmailSelect: (email: Email) => void;
    onMarkAsRead: (emailId: string) => Promise<void>;
    onMarkAsUnread: (emailId: string) => Promise<void>;
    loadingEmailStates: { has: (id: string) => boolean };
    decode: (text: string) => string;
  }

  let { 
    conversation, 
    onEmailSelect, 
    onMarkAsRead, 
    onMarkAsUnread,
    loadingEmailStates,
    decode
  }: Props = $props();

  const handleToggleReadStatus = async (event: Event, email: Email) => {
    event.stopPropagation();
    if (email.is_read) {
      await onMarkAsUnread(email.id);
    } else {
      await onMarkAsRead(email.id);
    }
  };
</script>

<div class="bg-white rounded-lg border border-gray-200 p-6">
  <h2 class="text-lg font-semibold mb-4">
    Conversation: {conversation.subject}
  </h2>
  <p class="text-sm text-gray-600 mb-4">
    {conversation.message_count} messages in this thread
  </p>
  
  <div class="space-y-4">
    {#each conversation.emails as email}
      <div class="border border-gray-100 rounded-lg p-4 {email.is_read ? 'bg-gray-50' : 'bg-blue-50'}">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h3 class="font-medium text-gray-900">{email.subject}</h3>
            <p class="text-sm text-gray-600">{email.sender}</p>
          </div>
          {#if !email.is_read}
            <span class="text-xs bg-blue-500 text-white px-2 py-1 rounded">Unread</span>
          {/if}
        </div>
        <p class="text-sm text-gray-700">{decode(email.snippet)}</p>
        <div class="flex items-center justify-between mt-2">
          <button 
            class="text-sm text-blue-600 hover:text-blue-800"
            onclick={() => onEmailSelect(email)}
          >
            View full message →
          </button>
          <button
            class="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            disabled={loadingEmailStates.has(email.id)}
            onclick={(event) => handleToggleReadStatus(event, email)}
          >
            {#if loadingEmailStates.has(email.id)}
              <div class="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              Loading...
            {:else}
              {email.is_read ? 'Mark unread' : 'Mark read'}
            {/if}
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>
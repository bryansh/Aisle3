<script lang="ts">
  import { Badge } from 'flowbite-svelte';
  import { decode } from 'he';
  
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
    conversations: Conversation[];
    onConversationSelect: (conversation: Conversation) => void;
  }

  let { conversations, onConversationSelect }: Props = $props();

  const handleConversationClick = (conversation: Conversation) => {
    onConversationSelect(conversation);
  };
</script>

<div class="space-y-2">
  {#each conversations as conversation (conversation.thread_id)}
    <button 
      class="w-full bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer text-left"
      onclick={() => handleConversationClick(conversation)}
    >
      <div class="flex justify-between items-start mb-2">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="text-sm font-medium text-gray-900 truncate">
              {conversation.subject}
            </h3>
            {#if conversation.has_unread}
              <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
            {/if}
          </div>
          <p class="text-xs text-gray-600 truncate">
            {conversation.sender}
          </p>
        </div>
        <div class="flex items-center gap-2 ml-2">
          <Badge color="blue" class="text-xs px-2 py-1">
            {conversation.message_count} {conversation.message_count === 1 ? 'message' : 'messages'}
          </Badge>
        </div>
      </div>
      
      <p class="text-sm text-gray-600 line-clamp-2">
        {decode(conversation.snippet)}
      </p>
      
      {#if conversation.message_count > 1}
        <div class="mt-2 text-xs text-gray-500">
          Thread with {conversation.message_count} messages
        </div>
      {/if}
    </button>
  {/each}
  
  {#if conversations.length === 0}
    <div class="text-center py-8">
      <div class="max-w-md mx-auto">
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Conversations Found</h3>
        <p class="text-gray-500 text-sm mb-4">
          Conversations appear when you have email threads with replies. Most emails are single messages.
        </p>
        <p class="text-gray-400 text-xs">
          Try replying to an email or look for emails with "Re:" in the subject line.
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-clamp: 2;
    overflow: hidden;
  }
</style>
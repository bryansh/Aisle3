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
      class="w-full rounded-lg border p-4 hover:shadow-md transition-all duration-200 cursor-pointer text-left {conversation.has_unread ? 'bg-white border-blue-200 shadow-md border-l-4 border-l-blue-500' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'}"
      onclick={() => handleConversationClick(conversation)}
    >
      <div class="flex justify-between items-start mb-2">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="text-sm truncate {conversation.has_unread ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}">
              {conversation.subject}
            </h3>
            {#if conversation.has_unread}
              <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
            {/if}
          </div>
          <p class="text-xs truncate {conversation.has_unread ? 'text-gray-700 font-medium' : 'text-gray-600 font-normal'}">
            {conversation.sender}
          </p>
        </div>
        <div class="flex items-center gap-2 ml-2">
          <Badge color="blue" class="text-xs px-2 py-1">
            {conversation.message_count} {conversation.message_count === 1 ? 'message' : 'messages'}
          </Badge>
        </div>
      </div>
      
      <p class="text-sm line-clamp-2 {conversation.has_unread ? 'text-gray-700 font-medium' : 'text-gray-600 font-normal'}">
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
<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Card } from 'flowbite-svelte';

  interface EmailContent {
    id: string;
    subject: string;
    sender: string;
    date?: string;
    body_text: string;
    body_html?: string;
    snippet: string;
  }

  // Props
  interface Props {
    email: EmailContent;
    sanitizeEmailHtml: (html: string) => string;
  }

  let { 
    email, 
    sanitizeEmailHtml 
  }: Props = $props();

  // Helper function to format date to local time
  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) return dateString;
      
      // Format to local date and time
      return date.toLocaleString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || '';
    }
  }
</script>

<!-- Email Reading View -->
<div in:fade={{ duration: 300 }} class="w-full">
  <div class="overflow-hidden shadow-lg w-full bg-white rounded-lg border border-gray-200">
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-8">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4 leading-tight">
        {email.subject}
      </h2>
      <div class="space-y-2">
        <p class="font-medium text-gray-700 m-0">From: {email.sender}</p>
        {#if email.date}
          <p class="text-sm text-gray-600 m-0">Date: {formatDate(email.date)}</p>
        {/if}
      </div>
    </div>
    
    <div class="p-12 bg-white min-h-[60vh]">
      <div class="w-full border">
        {#if email.body_html}
          <div class="email-content-clean w-full">
            {@html sanitizeEmailHtml(email.body_html)}
          </div>
        {:else}
          <div class="whitespace-pre-wrap text-gray-800 leading-relaxed text-base w-full">
            {email.body_text}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
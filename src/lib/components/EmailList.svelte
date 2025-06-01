<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Badge } from 'flowbite-svelte';
  import { Mail } from 'lucide-svelte';

  interface Email {
    id: string;
    subject: string;
    sender: string;
    snippet: string;
    is_read: boolean;
  }

  // Props
  interface Props {
    emails?: Email[];
    onEmailSelect: (email: Email) => void;
  }

  let { 
    emails = [], 
    onEmailSelect 
  }: Props = $props();
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
                <span class="font-semibold text-gray-900 truncate max-w-xs mr-4">
                  {email.sender}
                </span>
                <span class="text-gray-700 truncate flex-1 font-medium">
                  {email.subject}
                </span>
              </div>
              {#if !email.is_read}
                <Badge color="blue" class="ml-3 flex-shrink-0">New</Badge>
              {/if}
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
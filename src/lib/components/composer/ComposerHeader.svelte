<script>
  import { Button } from 'flowbite-svelte';
  import { X } from 'lucide-svelte';

  // Props
  let {
    originalEmail,
    onCancel,
    isSending = false
  } = $props();
</script>

<div class="flex items-center justify-between p-4 border-b border-gray-200">
  <div class="flex items-center gap-4">
    <h4 id="reply-composer-title" class="text-lg font-semibold text-gray-900">Reply</h4>
    {#if originalEmail}
      <span class="text-sm text-gray-600">
        Re: {originalEmail.subject}
      </span>
    {/if}
  </div>
  <Button
    size="sm"
    color="light"
    onclick={onCancel}
    disabled={isSending}
    title="Close (Esc)"
  >
    <X class="w-4 h-4" />
  </Button>
</div>
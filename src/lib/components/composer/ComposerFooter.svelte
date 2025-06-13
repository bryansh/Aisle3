<script>
  import { Send } from 'lucide-svelte';
  import { Button } from 'flowbite-svelte';
  import LoadingButton from '../ui/LoadingButton.svelte';

  // Props
  let {
    isSending = false,
    onSend,
    onCancel,
    isDisabled = false
  } = $props();

  // Detect platform for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const sendShortcut = isMac ? 'Cmd+Enter' : 'Ctrl+Enter';
</script>

<div class="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
  <div class="text-sm text-gray-500">
    <kbd class="px-2 py-1 text-xs font-mono bg-gray-200 rounded">{sendShortcut}</kbd> to send
  </div>
  <div class="flex gap-3">
    <Button
      size="sm"
      color="light"
      onclick={onCancel}
      disabled={isSending}
    >
      Cancel
    </Button>
    <LoadingButton
      size="sm"
      color="blue"
      onclick={onSend}
      loading={isSending}
      disabled={isDisabled}
      loadingText="Sending..."
    >
      <Send class="w-4 h-4" />
      Send Reply
    </LoadingButton>
  </div>
</div>
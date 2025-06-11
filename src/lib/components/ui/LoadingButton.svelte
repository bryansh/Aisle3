<script>
  import { Button } from 'flowbite-svelte';
  import { Loader2 } from 'lucide-svelte';

  // Props
  let {
    loading = false,
    loadingText = 'Loading...',
    disabled = false,
    children,
    ...buttonProps
  } = $props();

  // Combine loading and disabled states
  let isDisabled = $derived(loading || disabled);
</script>

<Button disabled={isDisabled} {...buttonProps}>
  {#if loading}
    <Loader2 class="w-4 h-4 animate-spin mr-2" />
    {loadingText}
  {:else}
    {@render children()}
  {/if}
</Button>
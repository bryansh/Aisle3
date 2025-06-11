<script>
  import { Spinner } from 'flowbite-svelte';

  // Props
  let {
    size = "8",
    message = "Loading...",
    overlay = false,
    variant = "default", // "default" | "button" | "inline" | "small"
    color = "blue"
  } = $props();

  // Size mappings for different variants
  const sizeMap = {
    small: "4",
    button: "4", 
    inline: "4",
    default: size
  };

  $: spinnerSize = sizeMap[variant] || size;
</script>

{#if overlay}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 text-center">
      <Spinner size={spinnerSize} {color} class="mb-4" />
      {#if message}
        <p class="text-gray-600 text-lg">{message}</p>
      {/if}
    </div>
  </div>
{:else}
  <div class="text-center {variant === 'inline' ? 'inline-flex items-center' : variant === 'small' ? 'py-4' : 'py-20'}">
    <Spinner size={spinnerSize} {color} class={variant === 'inline' || variant === 'button' ? 'mr-2' : 'mb-4'} />
    {#if message}
      <p class="text-gray-600 {
        variant === 'inline' ? 'text-sm' : 
        variant === 'small' ? 'text-sm' :
        variant === 'button' ? 'text-sm' :
        'text-lg'
      }">{message}</p>
    {/if}
  </div>
{/if}
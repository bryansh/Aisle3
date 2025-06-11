<script>
  import { onMount } from 'svelte';

  // Props
  let {
    showLinkInput = $bindable(false),
    linkUrl = $bindable(''),
    editor
  } = $props();

  let linkInputElement;

  function applyLink() {
    if (linkUrl && linkUrl.trim() && linkUrl !== 'https://') {
      console.log('Setting link with URL:', linkUrl);
      editor?.chain().focus().setLink({ href: linkUrl.trim() }).run();
      console.log('Link set successfully');
    }
    showLinkInput = false;
    linkUrl = '';
    editor?.commands.focus();
  }

  function cancelLink() {
    showLinkInput = false;
    linkUrl = '';
    editor?.commands.focus();
  }

  function handleKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyLink();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelLink();
    }
  }

  // Focus the input when component mounts
  onMount(() => {
    setTimeout(() => {
      linkInputElement?.focus();
    }, 10);
  });
</script>

<div class="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded border">
  <input
    bind:this={linkInputElement}
    type="text"
    bind:value={linkUrl}
    placeholder="Enter URL..."
    data-link-input="true"
    class="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    onkeydown={handleKeydown}
  />
  <button
    type="button"
    onclick={applyLink}
    class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
  >
    Apply
  </button>
  <button
    type="button"
    onclick={cancelLink}
    class="px-3 py-1 text-sm bg-gray-400 text-white rounded hover:bg-gray-500"
  >
    Cancel
  </button>
</div>
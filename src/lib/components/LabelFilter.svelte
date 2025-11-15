<script lang="ts">
  import { ChevronDown, ChevronUp, X } from 'lucide-svelte';

  let {
    availableLabels = [],
    selectedFilters = [],
    onToggleFilter,
    onClearFilters
  }: {
    availableLabels?: any[];
    selectedFilters?: string[];
    onToggleFilter: (labelId: string) => void;
    onClearFilters: () => void;
  } = $props();

  let isExpanded = $state(false);

  // Filter out system labels and sort
  const userLabels = $derived(
    availableLabels
      .filter(label =>
        label.type === 'user' &&
        label.id !== 'INBOX' &&
        label.id !== 'SENT' &&
        label.id !== 'DRAFT' &&
        label.id !== 'SPAM' &&
        label.id !== 'TRASH'
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  const systemLabels = $derived(
    availableLabels
      .filter(label =>
        label.id === 'INBOX' ||
        label.id === 'SENT' ||
        label.id === 'DRAFT' ||
        label.id === 'IMPORTANT' ||
        label.id === 'STARRED'
      )
      .sort((a, b) => {
        const order = ['INBOX', 'IMPORTANT', 'STARRED', 'SENT', 'DRAFT'];
        return order.indexOf(a.id) - order.indexOf(b.id);
      })
  );

  function toggleExpanded() {
    isExpanded = !isExpanded;
  }

  async function handleToggleFilter(labelId: string) {
    console.log('🏷️ Label clicked:', labelId);
    try {
      await onToggleFilter(labelId);
    } catch (error) {
      console.error('Error toggling filter:', error);
    }
  }

  async function handleClearAll() {
    console.log('🧹 Clearing all filters');
    try {
      await onClearFilters();
    } catch (error) {
      console.error('Error clearing filters:', error);
    }
  }
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
  <!-- Header -->
  <div class="flex items-center justify-between mb-3">
    <button
      onclick={toggleExpanded}
      class="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
    >
      {#if isExpanded}
        <ChevronUp class="w-4 h-4" />
      {:else}
        <ChevronDown class="w-4 h-4" />
      {/if}
      <span>Filter by Labels</span>
      {#if selectedFilters.length > 0}
        <span class="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
          {selectedFilters.length}
        </span>
      {/if}
    </button>

    {#if selectedFilters.length > 0}
      <button
        onclick={handleClearAll}
        class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <X class="w-4 h-4" />
        Clear all
      </button>
    {/if}
  </div>

  {#if isExpanded}
    <div class="space-y-4">
      <!-- System Labels -->
      {#if systemLabels.length > 0}
        <div>
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            System Labels
          </h4>
          <div class="flex flex-wrap gap-2">
            {#each systemLabels as label}
              <button
                onclick={() => handleToggleFilter(label.id)}
                class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors {selectedFilters.includes(
                  label.id
                )
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
              >
                {label.name}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- User Labels -->
      {#if userLabels.length > 0}
        <div>
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Custom Labels
          </h4>
          <div class="flex flex-wrap gap-2">
            {#each userLabels as label}
              <button
                onclick={() => handleToggleFilter(label.id)}
                class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors {selectedFilters.includes(
                  label.id
                )
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
              >
                {label.name}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#if systemLabels.length === 0 && userLabels.length === 0}
        <p class="text-sm text-gray-500 italic">No labels available</p>
      {/if}
    </div>
  {/if}
</div>

<script>
  import { Palette } from 'lucide-svelte';

  // Props
  let {
    showColorPicker = $bindable(false),
    setTextColor
  } = $props();

  const colors = [
    { color: '#000000', name: 'Black' },
    { color: '#333333', name: 'Dark Gray' },
    { color: '#666666', name: 'Gray' },
    { color: '#999999', name: 'Light Gray' },
    { color: '#CCCCCC', name: 'Very Light Gray' },
    { color: '#FFFFFF', name: 'White' },
    { color: '#FF0000', name: 'Red' },
    { color: '#FF6600', name: 'Orange' },
    { color: '#FFFF00', name: 'Yellow' },
    { color: '#00FF00', name: 'Green' },
    { color: '#0000FF', name: 'Blue' },
    { color: '#800080', name: 'Purple' },
    { color: '#FF69B4', name: 'Hot Pink' },
    { color: '#FFA500', name: 'Orange' },
    { color: '#32CD32', name: 'Lime Green' },
    { color: '#00CED1', name: 'Dark Turquoise' },
    { color: '#4169E1', name: 'Royal Blue' },
    { color: '#8A2BE2', name: 'Blue Violet' }
  ];
</script>

<div class="relative">
  <button
    type="button"
    onclick={() => showColorPicker = !showColorPicker}
    class="p-2 rounded hover:bg-gray-200"
    title="Text Color"
  >
    <Palette class="w-4 h-4" />
  </button>
  {#if showColorPicker}
    <div class="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 p-3">
      <div class="grid grid-cols-6 gap-2 w-48">
        {#each colors as colorItem}
          <button
            type="button"
            onclick={() => setTextColor(colorItem.color)}
            class="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-500 hover:scale-105 transition-all duration-150 shadow-sm"
            style="background-color: {colorItem.color}; {colorItem.color === '#FFFFFF' ? 'border-color: #d1d5db;' : ''}"
            title={colorItem.name + ' (' + colorItem.color + ')'}
            aria-label={colorItem.name + ' (' + colorItem.color + ')'}
          ></button>
        {/each}
      </div>
      <div class="mt-3 pt-2 border-t border-gray-200">
        <button
          type="button"
          onclick={() => setTextColor('')}
          class="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
        >
          Reset to default
        </button>
      </div>
    </div>
  {/if}
</div>
<script>
  // Props
  let {
    showFontSelector = $bindable(false),
    showFontSizeSelector = $bindable(false),
    currentFont = $bindable('Arial'),
    currentFontSize = $bindable('14px'),
    setFontFamily,
    setFontSize
  } = $props();

  const fonts = ['Arial', 'Times New Roman', 'Courier New', 'Helvetica', 'Georgia', 'Verdana'];
  const sizes = ['10', '12', '14', '16', '18', '20', '24', '28', '36'];
</script>

<!-- Font Family -->
<div class="relative">
  <button
    type="button"
    onclick={() => showFontSelector = !showFontSelector}
    class="px-3 py-2 text-sm rounded hover:bg-gray-200 min-w-[80px] text-left"
    title="Font Family"
  >
    {currentFont}
  </button>
  {#if showFontSelector}
    <div class="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 min-w-[120px]">
      {#each fonts as font}
        <button
          type="button"
          onclick={() => setFontFamily(font)}
          class="block w-full px-3 py-2 text-sm text-left hover:bg-gray-100 {currentFont === font ? 'bg-blue-100' : ''}"
          style="font-family: {font}"
        >
          {font}
        </button>
      {/each}
    </div>
  {/if}
</div>

<!-- Font Size -->
<div class="relative">
  <button
    type="button"
    onclick={() => showFontSizeSelector = !showFontSizeSelector}
    class="px-3 py-2 text-sm rounded hover:bg-gray-200 min-w-[60px] text-left"
    title="Font Size"
  >
    {currentFontSize.replace('px', '')}
  </button>
  {#if showFontSizeSelector}
    <div class="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10">
      {#each sizes as size}
        <button
          type="button"
          onclick={() => setFontSize(size)}
          class="block w-full px-3 py-2 text-sm text-left hover:bg-gray-100 {(size + 'px') === currentFontSize ? 'bg-blue-100' : ''}"
        >
          {size}
        </button>
      {/each}
    </div>
  {/if}
</div>
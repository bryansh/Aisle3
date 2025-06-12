<script lang="ts">
  import { onMount, tick } from 'svelte';

  interface VirtualScrollProps {
    items: any[];
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
    onScroll?: (scrollTop: number) => void;
    children?: any;
  }

  let {
    items = [],
    itemHeight = 80,
    containerHeight = 400,
    overscan = 5,
    onScroll = () => {},
    children
  }: VirtualScrollProps = $props();

  let scrollContainer: HTMLDivElement;
  let scrollTop = $state(0);
  let containerRef: HTMLDivElement;

  // Calculate visible range
  const visibleRange = $derived(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  });

  // Calculate visible items
  const visibleItems = $derived(() => {
    const { startIndex, endIndex } = visibleRange();
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight
    }));
  });

  // Total height of all items
  const totalHeight = $derived(items.length * itemHeight);

  // Handle scroll events
  const handleScroll = (event: Event) => {
    const target = event.target as HTMLDivElement;
    scrollTop = target.scrollTop;
    onScroll(scrollTop);
  };

  // Scroll to specific item
  export const scrollToItem = (index: number) => {
    if (scrollContainer) {
      const targetScrollTop = index * itemHeight;
      scrollContainer.scrollTop = targetScrollTop;
    }
  };

  // Get visible item count
  export const getVisibleItemCount = () => {
    const { startIndex, endIndex } = visibleRange();
    return endIndex - startIndex + 1;
  };

  // Performance monitoring
  export const getPerformanceStats = () => {
    return {
      totalItems: items.length,
      renderedItems: visibleItems().length,
      renderRatio: items.length > 0 ? (visibleItems().length / items.length) : 0,
      scrollTop,
      visibleRange
    };
  };

  onMount(() => {
    // Initialize scroll position
    scrollTop = scrollContainer?.scrollTop || 0;
  });
</script>

<!-- Virtual Scroll Container -->
<div 
  bind:this={scrollContainer}
  class="virtual-scroll-container overflow-auto"
  style="height: {containerHeight}px;"
  onscroll={handleScroll}
>
  <!-- Spacer for total height -->
  <div style="height: {totalHeight}px; position: relative;">
    <!-- Rendered visible items -->
    {#each visibleItems() as { item, index, top }}
      <div 
        class="virtual-item"
        style="position: absolute; top: {top}px; left: 0; right: 0; height: {itemHeight}px;"
      >
        {@render children?.({ item, index })}
      </div>
    {/each}
  </div>
</div>

<style>
  .virtual-scroll-container {
    position: relative;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .virtual-item {
    contain: layout style paint;
  }
  
  /* Smooth scrolling performance */
  .virtual-scroll-container {
    transform: translateZ(0);
    will-change: scroll-position;
  }
</style>
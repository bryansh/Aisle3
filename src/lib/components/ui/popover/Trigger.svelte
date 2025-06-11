<script>
  let { children, ...props } = $props();
</script>

<button {...props}>
  {#if children}
    {@render children()}
  {/if}
</button>
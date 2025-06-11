<script>
  let { children, ...props } = $props();
</script>

<span {...props}>
  {#if children}
    {@render children()}
  {/if}
</span>
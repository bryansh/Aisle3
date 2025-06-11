<script>
  let { children, ...props } = $props();
</script>

<div {...props}>
  {#if children}
    {@render children()}
  {/if}
</div>
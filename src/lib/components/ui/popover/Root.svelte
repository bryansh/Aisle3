<script>
  let { children, open = $bindable(), onOpenChange = undefined, ...props } = $props();
</script>

<div {...props}>
  {#if children}
    {@render children()}
  {/if}
</div>
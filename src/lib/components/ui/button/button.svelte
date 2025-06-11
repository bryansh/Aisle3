<script>
  import { Button as FlowbiteButton } from 'flowbite-svelte';
  
  // Accept any props to be maximally compatible
  let props = $props();
  
  // Extract children separately
  let { children, ...buttonProps } = props;
</script>

<FlowbiteButton {...buttonProps}>
  {#if children}
    {@render children()}
  {/if}
</FlowbiteButton>
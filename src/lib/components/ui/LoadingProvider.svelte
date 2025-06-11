<script>
  import { setContext } from 'svelte';
  import { LoadingStateManager } from '../../utils/loading.js';

  // Props
  let {
    children
  } = $props();

  // Create loading manager instance for this context
  const loadingManager = new LoadingStateManager();
  
  // Provide to child components
  setContext('loading', loadingManager);
</script>

{@render children()}
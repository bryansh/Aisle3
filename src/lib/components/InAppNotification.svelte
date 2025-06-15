<script lang="ts">
  import { onMount } from 'svelte';
  
  // Props
  interface Props {
    show: boolean;
    type: 'email' | 'update' | 'info' | 'error';
    title: string;
    message: string;
    autoClose?: boolean;
    autoCloseDelay?: number;
    animationMode?: 'default' | 'quick';
    onClose: () => void;
  }
  
  const {
    show = false,
    type = 'info',
    title,
    message,
    autoClose = true,
    autoCloseDelay = 8000,
    animationMode = 'default',
    onClose
  }: Props = $props();
  
  let visible = $state(false);
  let timeoutId: number | null = null;
  
  // Watch for show changes
  $effect(() => {
    if (show) {
      visible = true;
      
      if (autoClose && autoCloseDelay > 0) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          handleClose();
        }, autoCloseDelay);
      }
    } else {
      visible = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }
  });
  
  const handleClose = () => {
    visible = false;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    onClose();
  };
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'email': return '📧';
      case 'update': return '🔄';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };
  
  const getColorClasses = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'update': return 'bg-green-50 border-green-200 text-green-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };
</script>

{#if visible}
  <div 
    class="fixed top-4 right-6 z-50 max-w-md w-full mx-4 transition-all duration-300 ease-in-out"
    class:animate-in={show && animationMode === 'default'}
    class:animate-in-quick={show && animationMode === 'quick'}
    class:animate-out={!show}
  >
    <div 
      class="border rounded-lg shadow-lg p-4 {getColorClasses(type)}"
      role="alert"
      aria-live="assertive"
    >
      <div class="flex items-start justify-between">
        <div class="flex items-start space-x-3 flex-1">
          <div class="text-lg flex-shrink-0">
            {getIcon(type)}
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-medium text-sm mb-1">
              {title}
            </h4>
            <p class="text-sm opacity-90 break-words">
              {message}
            </p>
          </div>
        </div>
        <button
          onclick={handleClose}
          class="ml-2 flex-shrink-0 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
          aria-label="Close notification"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .animate-in {
    animation: slideDown 0.3s ease-out forwards, slideRight 0.4s ease-in-out 0.3s forwards;
  }

  .animate-in-quick {
    animation: quickSlideIn 0.3s ease-out forwards;
  }
  
  .animate-out {
    animation: slideOutToTop 0.3s ease-in forwards;
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translate(-150%, -120%);
    }
    to {
      opacity: 1;
      transform: translate(-150%, 0);
    }
  }
  
  @keyframes slideRight {
    from {
      transform: translate(-150%, 0);
    }
    to {
      transform: translate(0, 0);
    }
  }

  @keyframes quickSlideIn {
    from {
      opacity: 0;
      transform: translate(0, -120%);
    }
    to {
      opacity: 1;
      transform: translate(0, 0);
    }
  }
  
  @keyframes slideOutToTop {
    from {
      opacity: 1;
      transform: translate(0, 0);
    }
    to {
      opacity: 0;
      transform: translate(0, -120%);
    }
  }
</style>
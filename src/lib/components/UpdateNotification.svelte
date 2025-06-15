<script lang="ts">
  // Props
  interface Props {
    show: boolean;
    type: 'available' | 'installing' | 'complete' | 'error';
    message: string;
    onInstall?: () => void;
    onDismiss: () => void;
  }

  let {
    show = false,
    type = 'available',
    message = '',
    onInstall,
    onDismiss
  }: Props = $props();

  // Auto-dismiss after 10 seconds for non-critical notifications
  let dismissTimer: number | null = null;

  $effect(() => {
    if (show && (type === 'complete' || type === 'error')) {
      dismissTimer = setTimeout(() => {
        onDismiss();
      }, 10000) as unknown as number;
    }

    return () => {
      if (dismissTimer) {
        clearTimeout(dismissTimer);
        dismissTimer = null;
      }
    };
  });

  function handleInstall() {
    if (onInstall) {
      onInstall();
    }
  }

  function handleDismiss() {
    onDismiss();
  }

  // Get notification styling based on type
  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'available':
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: '🔄',
          iconBg: 'bg-blue-100',
          iconText: 'text-blue-600',
          titleText: 'text-blue-800',
          bodyText: 'text-blue-700',
          button: 'bg-blue-600 hover:bg-blue-700'
        };
      case 'installing':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          icon: '⬇️',
          iconBg: 'bg-yellow-100',
          iconText: 'text-yellow-600',
          titleText: 'text-yellow-800',
          bodyText: 'text-yellow-700',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        };
      case 'complete':
        return {
          bg: 'bg-green-50 border-green-200',
          icon: '✅',
          iconBg: 'bg-green-100',
          iconText: 'text-green-600',
          titleText: 'text-green-800',
          bodyText: 'text-green-700',
          button: 'bg-green-600 hover:bg-green-700'
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: '❌',
          iconBg: 'bg-red-100',
          iconText: 'text-red-600',
          titleText: 'text-red-800',
          bodyText: 'text-red-700',
          button: 'bg-red-600 hover:bg-red-700'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          icon: 'ℹ️',
          iconBg: 'bg-gray-100',
          iconText: 'text-gray-600',
          titleText: 'text-gray-800',
          bodyText: 'text-gray-700',
          button: 'bg-gray-600 hover:bg-gray-700'
        };
    }
  };

  const getTitle = (type: string) => {
    switch (type) {
      case 'available': return 'Update Available';
      case 'installing': return 'Installing Update';
      case 'complete': return 'Update Complete';
      case 'error': return 'Update Error';
      default: return 'Update';
    }
  };

  let style = $derived(getNotificationStyle(type));
  let title = $derived(getTitle(type));
</script>

<!-- Update Notification -->
{#if show}
  <div 
    class="fixed top-4 right-4 z-50 max-w-md w-full transform transition-all duration-300 ease-in-out"
    role="alert"
    aria-live="polite"
    aria-atomic="true"
  >
    <div class="rounded-lg border p-4 shadow-lg {style.bg}">
      <div class="flex items-start">
        <!-- Icon -->
        <div class="flex-shrink-0">
          <div class="w-8 h-8 rounded-full flex items-center justify-center {style.iconBg}">
            <span class="text-lg {style.iconText}" aria-hidden="true">{style.icon}</span>
          </div>
        </div>
        
        <!-- Content -->
        <div class="ml-3 flex-1">
          <h3 class="text-sm font-medium {style.titleText}">{title}</h3>
          <p class="text-xs mt-1 {style.bodyText}">{message}</p>
          
          <!-- Action buttons -->
          <div class="mt-3 flex space-x-2">
            {#if type === 'available' && onInstall}
              <button
                onclick={handleInstall}
                class="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium text-white transition-colors {style.button}"
              >
                Install Now
              </button>
            {/if}
            
            {#if type === 'complete'}
              <div class="text-xs {style.bodyText}">
                Please restart the app to use the new version.
              </div>
            {/if}
            
            <button
              onclick={handleDismiss}
              class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium {style.bodyText} hover:bg-black hover:bg-opacity-10 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
        
        <!-- Close button -->
        <div class="flex-shrink-0 ml-2">
          <button
            onclick={handleDismiss}
            class="inline-flex rounded-md p-1 {style.bodyText} hover:bg-black hover:bg-opacity-10 transition-colors"
            aria-label="Close notification"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
<script>
  // Props
  let {
    size = "8",
    message = "Loading...",
    overlay = false,
    variant = "default", // "default" | "button" | "inline" | "small"
    color = "blue"
  } = $props();

  // Safe property access for variant-based size mapping
  const getSpinnerSize = () => {
    if (variant === 'small' || variant === 'button' || variant === 'inline') {
      return "4";
    }
    return size;
  };

  let spinnerSize = $derived(getSpinnerSize());

  // CSS size mapping
  const sizeClass = {
    "4": "w-4 h-4",
    "5": "w-5 h-5", 
    "6": "w-6 h-6",
    "8": "w-8 h-8",
    "10": "w-10 h-10",
    "12": "w-12 h-12",
    "16": "w-16 h-16"
  };

  // Color mapping
  const colorClass = {
    blue: "text-blue-600",
    gray: "text-gray-600",
    green: "text-green-600",
    red: "text-red-600"
  };

  let sizeClasses = $derived(sizeClass[/** @type {keyof typeof sizeClass} */ (spinnerSize)] || "w-8 h-8");
  let colorClasses = $derived(colorClass[/** @type {keyof typeof colorClass} */ (color)] || "text-blue-600");
</script>

{#if overlay}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 text-center">
      <div class="{sizeClasses} {colorClasses} animate-spin mx-auto mb-4">
        <svg fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      {#if message}
        <p class="text-gray-600 text-lg">{message}</p>
      {/if}
    </div>
  </div>
{:else}
  <div class="text-center {variant === 'inline' ? 'inline-flex items-center' : variant === 'small' ? 'py-4' : 'py-20'}">
    <div class="{sizeClasses} {colorClasses} animate-spin {variant === 'inline' || variant === 'button' ? 'mr-2' : 'mb-4'}">
      <svg fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
    {#if message}
      <p class="text-gray-600 {
        variant === 'inline' ? 'text-sm' : 
        variant === 'small' ? 'text-sm' :
        variant === 'button' ? 'text-sm' :
        'text-lg'
      }">{message}</p>
    {/if}
  </div>
{/if}
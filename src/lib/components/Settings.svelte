<script lang="ts">
  // Props
  interface Props {
    autoPollingEnabled: boolean;
    pollingInterval: number; // in seconds
    autoMarkReadEnabled: boolean;
    autoMarkReadDelay: number; // in milliseconds
    onToggleAutoPolling: () => void;
    onIntervalChanged: () => void;
    onToggleAutoMarkRead: () => void;
    onAutoMarkReadDelayChanged: () => void;
    onCheckNow: () => void;
  }

  let { 
    autoPollingEnabled = $bindable(),
    pollingInterval = $bindable(),
    autoMarkReadEnabled = $bindable(),
    autoMarkReadDelay = $bindable(),
    onToggleAutoPolling,
    onIntervalChanged,
    onToggleAutoMarkRead,
    onAutoMarkReadDelayChanged,
    onCheckNow
  }: Props = $props();

  // Available polling intervals
  const intervalOptions = [
    { value: 15, label: '15 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 300, label: '5 minutes' }
  ];

  // Available auto-mark read delay options
  const autoMarkReadDelayOptions = [
    { value: 500, label: '0.5 seconds' },
    { value: 1000, label: '1 second' },
    { value: 1500, label: '1.5 seconds' },
    { value: 2000, label: '2 seconds' },
    { value: 3000, label: '3 seconds' },
    { value: 5000, label: '5 seconds' }
  ];

  function handleToggleAutoPolling() {
    onToggleAutoPolling();
  }

  function handleIntervalChange() {
    onIntervalChanged();
  }

  function handleToggleAutoMarkRead() {
    onToggleAutoMarkRead();
  }

  function handleAutoMarkReadDelayChange() {
    onAutoMarkReadDelayChanged();
  }

  function handleCheckNow() {
    onCheckNow();
  }
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-xl font-semibold text-gray-800 mb-4">📧 Email Settings</h2>
  </div>

  <!-- Auto-Polling Settings -->
  <div class="bg-white rounded-lg border border-gray-200 p-4">
    <h3 class="text-lg font-medium text-gray-800 mb-4">Real-time Updates</h3>
    
    <!-- Auto-polling toggle -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <label for="auto-polling-toggle" class="text-sm font-medium text-gray-700">Automatic email checking</label>
        <p class="text-xs text-gray-500">Automatically check for new emails in the background</p>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input 
          id="auto-polling-toggle"
          type="checkbox" 
          bind:checked={autoPollingEnabled}
          onchange={handleToggleAutoPolling}
          class="sr-only peer"
        />
        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>

    <!-- Polling interval -->
    {#if autoPollingEnabled}
      <div class="mb-4">
        <label for="polling-interval" class="block text-sm font-medium text-gray-700 mb-2">Check frequency</label>
        <select 
          id="polling-interval" 
          bind:value={pollingInterval}
          onchange={handleIntervalChange}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {#each intervalOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
    {/if}

    <!-- Status and manual check -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-2">
        {#if autoPollingEnabled}
          <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span class="text-sm text-green-700">
            Auto-checking every {intervalOptions.find(opt => opt.value === pollingInterval)?.label.toLowerCase()}
          </span>
        {:else}
          <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span class="text-sm text-gray-500">Auto-checking disabled</span>
        {/if}
      </div>
      
      <button
        onclick={handleCheckNow}
        class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        🔍 Check Now
      </button>
    </div>
  </div>

  <!-- Auto-Mark Read Settings -->
  <div class="bg-white rounded-lg border border-gray-200 p-4">
    <h3 class="text-lg font-medium text-gray-800 mb-4">📖 Reading Behavior</h3>
    
    <!-- Auto-mark read toggle -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <label for="auto-mark-read-toggle" class="text-sm font-medium text-gray-700">Automatically mark as read</label>
        <p class="text-xs text-gray-500">Mark emails as read after viewing them for a short time</p>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input 
          id="auto-mark-read-toggle"
          type="checkbox" 
          bind:checked={autoMarkReadEnabled}
          onchange={handleToggleAutoMarkRead}
          class="sr-only peer"
        />
        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>

    <!-- Auto-mark read delay -->
    {#if autoMarkReadEnabled}
      <div class="mb-4">
        <label for="auto-mark-read-delay" class="block text-sm font-medium text-gray-700 mb-2">Mark as read after</label>
        <select 
          id="auto-mark-read-delay" 
          bind:value={autoMarkReadDelay}
          onchange={handleAutoMarkReadDelayChange}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {#each autoMarkReadDelayOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
      
      <div class="flex items-center space-x-2">
        <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span class="text-sm text-blue-700">
          Emails will be marked as read after {autoMarkReadDelayOptions.find(opt => opt.value === autoMarkReadDelay)?.label.toLowerCase()} of viewing
        </span>
      </div>
    {:else}
      <div class="flex items-center space-x-2">
        <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span class="text-sm text-gray-500">Automatic read marking disabled - mark manually only</span>
      </div>
    {/if}
  </div>

  <!-- Future settings sections can go here -->
  <div class="bg-gray-50 rounded-lg border border-gray-200 p-4">
    <h3 class="text-lg font-medium text-gray-600 mb-2">More Settings</h3>
    <p class="text-sm text-gray-500">Additional email and app settings will appear here in future updates.</p>
  </div>
</div>
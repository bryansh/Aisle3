<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import CompositionPreview from './CompositionPreview.svelte';

  // Props
  interface Props {
    autoPollingEnabled: boolean;
    pollingInterval: number; // in seconds
    autoMarkReadEnabled: boolean;
    autoMarkReadDelay: number; // in milliseconds
    osNotificationsEnabled: boolean;
    inAppNotificationsEnabled: boolean;
    notificationAnimationMode: 'default' | 'quick';
    emailCompositionFormat: 'html' | 'plaintext';
    emailFontFamily: string;
    emailFontSize: string;
    autoSignatureEnabled: boolean;
    emailSignature: string;
    replyQuotePosition: 'above' | 'below';
    includeOriginalMessage: boolean;
    isUsingTauriStore?: boolean;
    onToggleAutoPolling: () => void;
    onIntervalChanged: () => void;
    onToggleAutoMarkRead: () => void;
    onAutoMarkReadDelayChanged: () => void;
    onNotificationSettingsChanged: () => void;
    onCompositionSettingsChanged: () => void;
    onCheckNow: () => void;
  }

  let { 
    autoPollingEnabled = $bindable(),
    pollingInterval = $bindable(),
    autoMarkReadEnabled = $bindable(),
    autoMarkReadDelay = $bindable(),
    osNotificationsEnabled = $bindable(),
    inAppNotificationsEnabled = $bindable(),
    notificationAnimationMode = $bindable(),
    emailCompositionFormat = $bindable(),
    emailFontFamily = $bindable(),
    emailFontSize = $bindable(),
    autoSignatureEnabled = $bindable(),
    emailSignature = $bindable(),
    replyQuotePosition = $bindable(),
    includeOriginalMessage = $bindable(),
    isUsingTauriStore = false,
    onToggleAutoPolling,
    onIntervalChanged,
    onToggleAutoMarkRead,
    onAutoMarkReadDelayChanged,
    onNotificationSettingsChanged,
    onCompositionSettingsChanged,
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

  // Available font families
  const fontFamilyOptions = [
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Helvetica, sans-serif', label: 'Helvetica' },
    { value: 'Times New Roman, serif', label: 'Times New Roman' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Courier New, monospace', label: 'Courier New' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
    { value: 'system-ui, sans-serif', label: 'System Default' }
  ];

  // Available font sizes
  const fontSizeOptions = [
    { value: '12px', label: 'Small (12px)' },
    { value: '14px', label: 'Medium (14px)' },
    { value: '16px', label: 'Large (16px)' },
    { value: '18px', label: 'Extra Large (18px)' }
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

  function handleNotificationSettingsChanged() {
    onNotificationSettingsChanged();
  }

  function handleCompositionSettingsChanged() {
    onCompositionSettingsChanged();
  }

  // Update functionality state
  let checking_updates = $state(false);
  let updateMessage = $state('');
  let updateAvailable = $state(false);

  // Update event handlers
  const handleCheckUpdates = async () => {
    checking_updates = true;
    updateMessage = '';
    updateAvailable = false;
    try {
      const result = await invoke<string>('check_for_updates');
      updateMessage = result;
      updateAvailable = result.includes('Update available');
    } catch (error) {
      updateMessage = `Error: ${error}`;
    } finally {
      checking_updates = false;
    }
  };

  const handleInstallUpdate = async () => {
    try {
      updateMessage = 'Installing update...';
      const result = await invoke<string>('install_update');
      updateMessage = result;
    } catch (error) {
      updateMessage = `Install error: ${error}`;
    }
  };
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-xl font-semibold text-gray-800 mb-4">⚙️ Settings</h2>
    {#if isUsingTauriStore}
      <p class="text-xs text-green-600 mb-2">✅ Using Tauri Store (persistent storage)</p>
    {:else}
      <p class="text-xs text-yellow-600 mb-2">⚠️ Using browser localStorage (may be cleared)</p>
    {/if}
  </div>

  <!-- App Updates Settings -->
  <div class="bg-white rounded-lg border border-gray-200 p-4">
    <h3 class="text-lg font-medium text-gray-800 mb-4">🔄 App Updates</h3>
    
    <div class="space-y-4">
      <!-- Auto-update checking toggle -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <label for="auto-update-toggle" class="text-sm font-medium text-gray-700">Automatic update checking</label>
          <p class="text-xs text-gray-500">Automatically check for updates on startup and every hour</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input 
            id="auto-update-toggle"
            type="checkbox" 
            checked={true}
            class="sr-only peer"
          />
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <!-- Manual update check button -->
      <div class="flex items-center justify-between">
        <div>
          <span class="text-sm font-medium text-gray-700">Manual check</span>
          <p class="text-xs text-gray-500">Check for updates right now</p>
        </div>
        <button
          onclick={handleCheckUpdates}
          disabled={checking_updates}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {#if checking_updates}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Checking...
          {:else}
            🔍 Check Now
          {/if}
        </button>
      </div>

      <!-- Install update button (shown when available) -->
      {#if updateAvailable}
        <div class="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div>
            <span class="text-sm font-medium text-green-800">Update available!</span>
            <p class="text-xs text-green-600">A new version is ready to install</p>
          </div>
          <button
            onclick={handleInstallUpdate}
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            ⬇️ Install Update
          </button>
        </div>
      {/if}

      <!-- Update status message -->
      {#if updateMessage}
        <div class="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p class="text-sm text-gray-700">{updateMessage}</p>
        </div>
      {/if}
      
      <!-- Update info -->
      <div class="text-xs text-gray-500 space-y-1">
        <p>• Updates are checked automatically on startup and every hour</p>
        <p>• You'll be notified when updates are available</p>
        <p>• Updates are downloaded and verified automatically</p>
        <p>• You'll need to restart the app after installing an update</p>
        <p>• Aisle3 checks for updates from the official repository</p>
      </div>
    </div>
  </div>

  <!-- Notification Settings -->
  <div class="bg-white rounded-lg border border-gray-200 p-4">
    <h3 class="text-lg font-medium text-gray-800 mb-4">🔔 Notifications</h3>
    
    <div class="space-y-4">
      <!-- OS notifications toggle -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <label for="os-notifications-toggle" class="text-sm font-medium text-gray-700">System notifications</label>
          <p class="text-xs text-gray-500">Show notifications in your operating system</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input 
            id="os-notifications-toggle"
            type="checkbox" 
            bind:checked={osNotificationsEnabled}
            onchange={handleNotificationSettingsChanged}
            class="sr-only peer"
          />
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <!-- In-app notifications toggle -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <label for="inapp-notifications-toggle" class="text-sm font-medium text-gray-700">In-app notifications</label>
          <p class="text-xs text-gray-500">Show notification banners within the app {osNotificationsEnabled ? '(fallback when system notifications fail)' : '(since system notifications are disabled)'}</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input 
            id="inapp-notifications-toggle"
            type="checkbox" 
            bind:checked={inAppNotificationsEnabled}
            onchange={handleNotificationSettingsChanged}
            class="sr-only peer"
          />
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <!-- Animation mode selector -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <label for="animation-mode-select" class="text-sm font-medium text-gray-700">Notification animation</label>
          <p class="text-xs text-gray-500">Choose how in-app notifications appear</p>
        </div>
        <select 
          id="animation-mode-select"
          bind:value={notificationAnimationMode}
          onchange={handleNotificationSettingsChanged}
          class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 shadow-sm w-56"
        >
          <option value="default">🎭 Default (slide from left)</option>
          <option value="quick">⚡ Quick (slide from top)</option>
        </select>
      </div>


      <!-- Notification info -->
      <div class="text-xs text-gray-500 space-y-1">
        <p>• Email notifications appear when new messages arrive</p>
        <p>• System notifications work even when the app is minimized</p>
        <p>• You can disable notifications during quiet hours</p>
        <p>• Notifications respect your operating system's Do Not Disturb settings</p>
      </div>
    </div>
  </div>

  <!-- Auto-Polling Settings -->
  <div class="bg-white rounded-lg border border-gray-200 p-4">
    <h3 class="text-lg font-medium text-gray-800 mb-4">📧 Real-time Updates</h3>
    
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
          class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 shadow-sm w-full"
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
          class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 shadow-sm w-full"
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

  <!-- Email Composition Settings -->
  <div class="bg-white rounded-lg border border-gray-200 p-4">
    <h3 class="text-lg font-medium text-gray-800 mb-4">✉️ Email Composition</h3>
    
    <!-- Composition format -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <label for="composition-format" class="text-sm font-medium text-gray-700">Default format</label>
        <p class="text-xs text-gray-500">Choose between rich text (HTML) or plain text</p>
      </div>
      <select 
        id="composition-format"
        bind:value={emailCompositionFormat}
        onchange={handleCompositionSettingsChanged}
        class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 shadow-sm w-48"
      >
        <option value="html">🎨 Rich Text (HTML)</option>
        <option value="plaintext">📝 Plain Text</option>
      </select>
    </div>

    <!-- Font family -->
    <div class="flex items-center justify-between mb-4 {emailCompositionFormat === 'plaintext' ? 'opacity-50' : ''}">
      <div>
        <label for="font-family" class="text-sm font-medium text-gray-700">Font family</label>
        <p class="text-xs text-gray-500">
          {emailCompositionFormat === 'plaintext' ? 'Not used in plain text mode' : 'Default font for composing emails'}
        </p>
      </div>
      <select 
        id="font-family"
        bind:value={emailFontFamily}
        onchange={handleCompositionSettingsChanged}
        disabled={emailCompositionFormat === 'plaintext'}
        class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 shadow-sm w-48 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {#each fontFamilyOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    <!-- Font size -->
    <div class="flex items-center justify-between mb-4 {emailCompositionFormat === 'plaintext' ? 'opacity-50' : ''}">
      <div>
        <label for="font-size" class="text-sm font-medium text-gray-700">Font size</label>
        <p class="text-xs text-gray-500">
          {emailCompositionFormat === 'plaintext' ? 'Not used in plain text mode' : 'Default text size for composing emails'}
        </p>
      </div>
      <select 
        id="font-size"
        bind:value={emailFontSize}
        onchange={handleCompositionSettingsChanged}
        disabled={emailCompositionFormat === 'plaintext'}
        class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 shadow-sm w-48 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {#each fontSizeOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    <!-- Auto-signature toggle -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <label for="auto-signature-toggle" class="text-sm font-medium text-gray-700">Automatic signature</label>
        <p class="text-xs text-gray-500">Automatically add signature to outgoing emails</p>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input 
          id="auto-signature-toggle"
          type="checkbox" 
          bind:checked={autoSignatureEnabled}
          onchange={handleCompositionSettingsChanged}
          class="sr-only peer"
        />
        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>

    <!-- Signature text -->
    {#if autoSignatureEnabled}
      <div class="mb-4">
        <label for="email-signature" class="block text-sm font-medium text-gray-700 mb-2">Email signature</label>
        <textarea 
          id="email-signature"
          bind:value={emailSignature}
          onchange={handleCompositionSettingsChanged}
          placeholder="Enter your email signature..."
          rows="3"
          class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm resize-none"
        ></textarea>
        <p class="text-xs text-gray-500 mt-1">This signature will be automatically added to your emails</p>
      </div>
    {/if}

    <!-- Reply settings -->
    <div class="border-t border-gray-200 pt-4">
      <h4 class="text-md font-medium text-gray-700 mb-3">Reply Settings</h4>
      
      <!-- Include original message -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <label for="include-original-toggle" class="text-sm font-medium text-gray-700">Include original message</label>
          <p class="text-xs text-gray-500">Include the original email when replying</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input 
            id="include-original-toggle"
            type="checkbox" 
            bind:checked={includeOriginalMessage}
            onchange={handleCompositionSettingsChanged}
            class="sr-only peer"
          />
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <!-- Quote position -->
      {#if includeOriginalMessage}
        <div class="flex items-center justify-between mb-4">
          <div>
            <label for="quote-position" class="text-sm font-medium text-gray-700">Original message position</label>
            <p class="text-xs text-gray-500">Where to place the original message in replies</p>
          </div>
          <select 
            id="quote-position"
            bind:value={replyQuotePosition}
            onchange={handleCompositionSettingsChanged}
            class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 shadow-sm w-48"
          >
            <option value="below">📄 Below new message</option>
            <option value="above">📄 Above new message</option>
          </select>
        </div>
      {/if}
    </div>

    <!-- Live Preview -->
    <div class="mt-6 pt-4 border-t border-gray-200">
      <CompositionPreview
        {emailCompositionFormat}
        {emailFontFamily}
        {emailFontSize}
        {autoSignatureEnabled}
        {emailSignature}
        {replyQuotePosition}
        {includeOriginalMessage}
      />
    </div>

    <!-- Composition info -->
    <div class="text-xs text-gray-500 space-y-1 mt-4 pt-4 border-t border-gray-200">
      <p>• <strong>HTML format:</strong> Font settings apply only to content you compose (not quoted text)</p>
      <p>• <strong>Plain text format:</strong> Font settings are ignored - recipients see default client font</p>
      <p>• <strong>Quoted content:</strong> Usually retains original formatting from sender</p>
      <p>• <strong>Signatures:</strong> Use your font settings in HTML mode, plain text in text mode</p>
    </div>
  </div>
</div>
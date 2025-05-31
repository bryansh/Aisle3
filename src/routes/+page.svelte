<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';

  interface Email {
    id: string;
    subject: string;
    sender: string;
    snippet: string;
    is_read: boolean;
  }

  let emails: Email[] = [];
  let totalCount = 0;
  let unreadCount = 0;
  let loading = true;
  let checking_updates = false;
  let updateMessage = '';
  let updateAvailable = false;

  onMount(async () => {
    try {
      const [total, unread] = await invoke<[number, number]>('get_inbox_stats');
      totalCount = total;
      unreadCount = unread;

      emails = await invoke<Email[]>('get_emails');
    } catch (error) {
      console.error('Failed to load emails:', error);
    } finally {
      loading = false;
    }
  });

  async function checkForUpdates() {
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
  }

  async function installUpdate() {
  try {
    updateMessage = 'Installing update...';
    const result = await invoke<string>('install_update');
    updateMessage = result;
  } catch (error) {
    updateMessage = `Install error: ${error}`;
  }
}
</script>

<!-- In your header section, update the button area: -->
<div class="header-controls">
  <div class="stats">
    <span class="stat total">Total: {totalCount}</span>
    <span class="stat unread">Unread: {unreadCount}</span>
  </div>
  <div class="update-controls">
    <button 
      class="update-btn" 
      on:click={checkForUpdates}
      disabled={checking_updates}
    >
      {checking_updates ? '🔄 Checking...' : '🔄 Check Updates'}
    </button>
    
    {#if updateAvailable}
      <button 
        class="install-btn" 
        on:click={installUpdate}
      >
        📦 Install Update
      </button>
    {/if}
  </div>
</div>
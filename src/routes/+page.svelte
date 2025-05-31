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
    try {
      const result = await invoke<string>('check_for_updates');
      updateMessage = result;
    } catch (error) {
      updateMessage = `Error: ${error}`;
    } finally {
      checking_updates = false;
    }
  }
</script>

<svelte:head>
  <title>Aisle 3</title>
</svelte:head>

<div class="app">
  <header class="header">
    <h1>📧 Aisle 3</h1>
    <div class="header-controls">
      <div class="stats">
        <span class="stat total">Total: {totalCount}</span>
        <span class="stat unread">Unread: {unreadCount}</span>
      </div>
      <button 
        class="update-btn" 
        on:click={checkForUpdates}
        disabled={checking_updates}
      >
        {checking_updates ? '🔄 Checking...' : '🔄 Check Updates'}
      </button>
    </div>
  </header>

  {#if updateMessage}
    <div class="update-message" class:error={updateMessage.startsWith('Error')}>
      {updateMessage}
    </div>
  {/if}

  <main>
    {#if loading}
      <div class="loading">Loading emails...</div>
    {:else}
      <div class="email-list">
        {#each emails as email}
          <div class="email-item" class:unread={!email.is_read}>
            <div class="email-header">
              <span class="sender">{email.sender}</span>
              <span class="subject">{email.subject}</span>
            </div>
            <div class="snippet">{email.snippet}</div>
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>

<style>
  .app {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: system-ui, sans-serif;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #ddd;
  }

  h1 {
    margin: 0;
    color: #333;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .stats {
    display: flex;
    gap: 15px;
  }

  .stat {
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 600;
  }

  .total {
    background: #e6f3ff;
    color: #0066cc;
  }

  .unread {
    background: #ffe6e6;
    color: #cc0000;
  }

  .update-btn {
    padding: 8px 16px;
    border: 1px solid #0066cc;
    background: white;
    color: #0066cc;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
  }

  .update-btn:hover:not(:disabled) {
    background: #0066cc;
    color: white;
  }

  .update-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .update-message {
    padding: 12px;
    margin-bottom: 20px;
    border-radius: 6px;
    background: #e6f3ff;
    color: #0066cc;
    border: 1px solid #b3d9ff;
  }

  .update-message.error {
    background: #ffe6e6;
    color: #cc0000;
    border: 1px solid #ffb3b3;
  }

  .loading {
    text-align: center;
    padding: 40px;
    font-size: 18px;
    color: #666;
  }

  .email-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .email-item {
    padding: 16px;
    background: white;
    border: 1px solid #ddd;
    cursor: pointer;
  }

  .email-item:hover {
    background: #f5f5f5;
  }

  .email-item.unread {
    background: #f0f8ff;
    border-left: 4px solid #0066cc;
  }

  .email-header {
    display: flex;
    margin-bottom: 8px;
  }

  .sender {
    font-weight: 600;
    color: #333;
    min-width: 200px;
  }

  .subject {
    color: #666;
    margin-left: 20px;
  }

  .snippet {
    color: #888;
    font-size: 14px;
  }
</style>
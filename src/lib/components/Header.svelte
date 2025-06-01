<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { Button, Badge } from 'flowbite-svelte';
  import { Mail, ArrowLeft, Download, RotateCw, LogOut } from 'lucide-svelte';

  // Props
  interface Props {
    showEmailView?: boolean;
    totalCount?: number;
    unreadCount?: number;
    isAuthenticated?: boolean;
    onBackToInbox: () => void;
  }

  let {
    showEmailView = false,
    totalCount = 0,
    unreadCount = 0,
    isAuthenticated = false,
    onBackToInbox
  }: Props = $props();

  // Local state using runes
  let checking_updates = $state(false);
  let loggingOut = $state(false);
  let updateMessage = $state('');
  let updateAvailable = $state(false);

  // Event handlers
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

  const handleLogoutGmail = async () => {
    loggingOut = true;
    try {
      await invoke('logout_gmail');
      location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      loggingOut = false;
    }
  };
</script>

<header class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 sticky top-0 z-10">
  <div class="flex justify-between items-center p-6">
    <div class="flex items-center">
      {#if showEmailView}
        <Button color="light" onclick={onBackToInbox} class="mr-4">
          <ArrowLeft class="w-4 h-4 mr-2" />
          Back to Inbox
        </Button>
      {:else}
        <div class="flex items-center">
          <Mail class="w-8 h-8 mr-3 text-blue-600" />
          <h1 class="text-3xl font-bold text-gray-800 m-0">Aisle3</h1>
        </div>
      {/if}
    </div>
    
    <div class="flex items-center gap-6">
      <!-- Stats -->
      <div class="flex gap-3">
        <Badge color="blue" large class="px-4 py-2">Total: {totalCount}</Badge>
        <Badge color="red" large class="px-4 py-2">Unread: {unreadCount}</Badge>
      </div>
      
      <!-- Controls -->
      <div class="flex gap-3">
        <Button 
          color="blue" 
          outline 
          onclick={handleCheckUpdates}
          disabled={checking_updates}
        >
          {#if checking_updates}
            <RotateCw class="w-4 h-4 mr-2 animate-spin" />
            Checking...
          {:else}
            <RotateCw class="w-4 h-4 mr-2" />
            Check Updates
          {/if}
        </Button>
        
        {#if updateAvailable}
          <Button color="blue" onclick={handleInstallUpdate}>
            <Download class="w-4 h-4 mr-2" />
            Install Update
          </Button>
        {/if}

        {#if isAuthenticated}
          <Button 
            color="red" 
            outline 
            onclick={handleLogoutGmail}
            disabled={loggingOut}
          >
            {#if loggingOut}
              <RotateCw class="w-4 h-4 mr-2 animate-spin" />
              Logging out...
            {:else}
              <LogOut class="w-4 h-4 mr-2" />
              Logout
            {/if}
          </Button>
        {/if}
      </div>
    </div>
  </div>
</header>
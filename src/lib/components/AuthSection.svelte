<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { Button, Card, Input, Alert } from 'flowbite-svelte';
  import { Mail, AlertTriangle, CheckCircle } from 'lucide-svelte';

  // Props
  interface Props {
    onAuthSuccess: () => void;
  }

  let { onAuthSuccess }: Props = $props();

  // Local state using runes
  let authenticating = $state(false);
  let authMessage = $state('');
  let callbackUrl = $state('');

  const handleConnectGmail = async () => {
    authenticating = true;
    authMessage = '';
    
    try {
      const authUrl = await invoke<string>('start_gmail_auth');
      await invoke('open_url', { url: authUrl });
      authMessage = 'Please complete authentication in your browser, then paste the callback URL below.';
    } catch (error) {
      authMessage = `Error starting authentication: ${error}`;
      authenticating = false;
    }
  };

  const handleCompleteAuthentication = async () => {
    if (!callbackUrl) {
      authMessage = 'Please enter the callback URL';
      return;
    }

    try {
      const result = await invoke<string>('complete_gmail_auth', { callbackUrl });
      authMessage = result;
      onAuthSuccess();
    } catch (error) {
      authMessage = `Authentication error: ${error}`;
    }
  };
</script>

<div class="mb-6">
  <Card class="max-w-2xl mx-auto">
    <div class="text-center p-6">
      <Mail class="w-16 h-16 mx-auto mb-6 text-blue-600" />
      <h2 class="mb-4 text-2xl font-semibold">Connect Gmail</h2>
      <p class="mb-6 text-gray-600 text-lg">Connect your Gmail account to start managing your emails</p>
      
      {#if !authenticating}
        <Button color="blue" size="lg" onclick={handleConnectGmail}>
          Connect Gmail Account
        </Button>
      {:else}
        <div class="space-y-4 max-w-md mx-auto">
          <p class="text-gray-700">Complete authentication in your browser, then paste the callback URL here:</p>
          <Input 
            bind:value={callbackUrl}
            placeholder="Paste callback URL here..."
            size="lg"
            class="w-full"
          />
          <Button color="green" size="lg" onclick={handleCompleteAuthentication}>
            Complete Authentication
          </Button>
        </div>
      {/if}
      
      {#if authMessage}
        <div class="mt-6">
          {#if authMessage.includes('Error')}
            <div class="flex items-center p-4 mb-4 text-sm text-red-800 border border-red-300 rounded-lg bg-red-50">
              <AlertTriangle class="w-4 h-4 mr-2" />
              {authMessage}
            </div>
          {:else if authMessage.includes('Successfully')}
            <div class="flex items-center p-4 mb-4 text-sm text-green-800 border border-green-300 rounded-lg bg-green-50">
              <CheckCircle class="w-4 h-4 mr-2" />
              {authMessage}
            </div>
          {:else}
            <Alert color="blue">
              {authMessage}
            </Alert>
          {/if}
        </div>
      {/if}
    </div>
  </Card>
</div>
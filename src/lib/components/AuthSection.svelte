<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { Button, Card, Input, Alert } from 'flowbite-svelte';
  import { Mail, AlertTriangle, CheckCircle } from 'lucide-svelte';

  // Props
  interface Props {
    onAuthSuccess: () => void;
    onTryDemo: () => void;
  }

  let { onAuthSuccess, onTryDemo }: Props = $props();

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

<div class="min-h-screen flex items-center justify-center p-6">
  <div class="w-full max-w-md">
    <div class="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
      <div class="text-center">
        <!-- Icon and title -->
        <div class="mb-8">
          <Mail class="w-20 h-20 mx-auto mb-4 text-blue-600" />
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Aisle 3</h1>
          <p class="text-gray-600">Gmail Client for Inbox Management</p>
        </div>
        
        {#if !authenticating}
          <!-- Main action buttons -->
          <div class="space-y-4 mb-6">
            <Button 
              color="blue" 
              size="lg" 
              onclick={handleConnectGmail}
              class="w-full py-3 bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-base"
            >
              Connect Gmail Account
            </Button>
            
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>
            
            <Button 
              color="light" 
              size="lg" 
              onclick={onTryDemo}
              class="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-base"
            >
              Try Demo Mode
            </Button>
          </div>
          
          <!-- Description -->
          <p class="text-sm text-gray-500">
            Connect your Gmail account for full functionality, or try the demo to explore the interface.
          </p>
        {:else}
          <!-- Authentication flow -->
          <div class="space-y-6">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p class="text-blue-800 text-sm">Complete authentication in your browser, then paste the callback URL below:</p>
            </div>
            
            <Input 
              bind:value={callbackUrl}
              placeholder="Paste callback URL here..."
              size="lg"
              class="w-full"
            />
            
            <div class="space-y-3">
              <Button 
                color="green" 
                size="lg" 
                onclick={handleCompleteAuthentication}
                class="w-full py-3 bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-base"
              >
                Complete Authentication
              </Button>
              
              <Button 
                color="light" 
                size="sm" 
                onclick={() => { authenticating = false; authMessage = ''; callbackUrl = ''; }}
                class="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-300 rounded-lg text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        {/if}
        
        {#if authMessage}
          <div class="mt-6">
            {#if authMessage.includes('Error')}
              <div class="flex items-center p-4 text-sm text-red-800 border border-red-300 rounded-lg bg-red-50">
                <AlertTriangle class="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{authMessage}</span>
              </div>
            {:else if authMessage.includes('Successfully')}
              <div class="flex items-center p-4 text-sm text-green-800 border border-green-300 rounded-lg bg-green-50">
                <CheckCircle class="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{authMessage}</span>
              </div>
            {:else}
              <div class="p-4 text-sm text-blue-800 border border-blue-300 rounded-lg bg-blue-50">
                {authMessage}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
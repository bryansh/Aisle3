<script lang="ts">
  import { slide } from 'svelte/transition';
  import type { Editor } from '@tiptap/core';
  import ComposerHeader from './composer/ComposerHeader.svelte';
  import EditorToolbar from './composer/EditorToolbar.svelte';
  import EditorArea from './composer/EditorArea.svelte';
  import ComposerFooter from './composer/ComposerFooter.svelte';

  interface Email {
    id: string;
    subject: string;
    sender: string;
    date?: string;
  }

  // Props
  interface Props {
    originalEmail?: Email;
    onSend: (replyBody: string) => Promise<void>;
    onCancel: () => void;
    isVisible: boolean;
  }

  let { 
    originalEmail,
    onSend,
    onCancel,
    isVisible = false
  }: Props = $props();

  // Component state
  let replyBody = $state('');
  let isSending = $state(false);
  let editor = $state<Editor>();
  let editorElement = $state<HTMLElement>();
  let showLinkInput = $state(false);
  let linkUrl = $state('');
  let isLinkActive = $state(false);
  let showColorPicker = $state(false);
  let showFontSelector = $state(false);
  let showFontSizeSelector = $state(false);
  let currentFont = $state('Arial');
  let currentFontSize = $state('14px');

  function getPlainText() {
    if (editor) {
      return editor.getText();
    }
    return '';
  }

  // Reactive content detection for button state
  let hasEditorContent = $state(false);

  // Update content detection when editor or replyBody changes
  $effect(() => {
    if (editor && replyBody !== undefined) {
      const text = editor.getText();
      const html = editor.getHTML();
      // Check both plain text and if HTML has meaningful content
      hasEditorContent = Boolean(text.trim().length > 0 || (html && html.replace(/<[^>]*>/g, '').trim().length > 0));
    } else {
      hasEditorContent = Boolean(replyBody.trim().length > 0);
    }
  });

  // Convert editor HTML to email-safe HTML
  function makeEmailSafe(html: string): string {
    // Simple email-safe conversions for common editor elements
    return html
      // Remove any data attributes that editors might add
      .replace(/\s+data-[a-z-]+="[^"]*"/gi, '')
      // Clean up any editor-specific classes
      .replace(/\s+class="[^"]*ProseMirror[^"]*"/gi, '')
      .replace(/\s+class="[^"]*node-[^"]*"/gi, '')
      // Ensure proper paragraph structure for email
      .replace(/<div([^>]*)>/gi, '<p$1>')
      .replace(/<\/div>/gi, '</p>');
  }

  async function handleSend() {
    const plainText = getPlainText().trim();
    if (!plainText) return;
    
    isSending = true;
    try {
      // Convert editor HTML to email-safe HTML before sending
      const emailSafeHtml = makeEmailSafe(replyBody);
      await onSend(emailSafeHtml);
      // Clear the editor after successful send
      if (editor) {
        editor.commands.setContent('');
        replyBody = '';
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
      // Keep the reply body so user can try again
    } finally {
      isSending = false;
    }
  }

  function handleCancel() {
    // Destroy the editor completely
    if (editor) {
      console.log('Destroying editor on cancel');
      editor.destroy();
      editor = undefined;
      replyBody = '';
    }
    onCancel();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      handleEscape();
      return;
    }
    
    if (event.key === 'Enter') {
      // Handle Enter key in link input
      const target = event.target as HTMLElement;
      if (target?.getAttribute('data-link-input') === 'true') {
        event.preventDefault();
        return;
      }
      
      // Handle Ctrl/Cmd+Enter for send
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        handleSend();
      }
    }
  }

  function handleEscape() {
    // Priority 1: Close dropdowns and dialogs first
    if (showLinkInput) {
      showLinkInput = false;
      linkUrl = '';
      editor?.commands.focus();
      return;
    }
    
    if (showColorPicker) {
      showColorPicker = false;
      editor?.commands.focus();
      return;
    }
    
    if (showFontSelector) {
      showFontSelector = false;
      editor?.commands.focus();
      return;
    }
    
    if (showFontSizeSelector) {
      showFontSizeSelector = false;
      editor?.commands.focus();
      return;
    }
    
    // Priority 2: Close the email composer if no dropdowns are open
    handleCancel();
  }

  function closeDropdowns() {
    showFontSelector = false;
    showFontSizeSelector = false;
    showColorPicker = false;
  }

  // Focus the editor when visible
  $effect(() => {
    if (isVisible && editor) {
      // Delay focus to ensure DOM is ready
      setTimeout(() => {
        editor?.commands.focus();
      }, 100);
    }
  });
</script>

{#if isVisible}
  <!-- Simple Bottom Composer -->
  <div 
    class="fixed bottom-2 left-0 right-0 h-[60vh] bg-white bg-opacity-90 backdrop-blur-md shadow-2xl border-t border-gray-300 z-50 rounded-t-lg"
    transition:slide={{ duration: 300, axis: 'y' }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="reply-composer-title"
    onkeydown={handleKeydown}
    tabindex="-1"
  >
    <!-- Header -->
    <ComposerHeader
      {originalEmail}
      onCancel={handleCancel}
      {isSending}
    />

    <!-- Simple Rich Text Editor -->
    <div class="h-[calc(100%-120px)] flex flex-col">
      <!-- Gmail-style Toolbar -->
      <EditorToolbar
        bind:editor
        bind:showLinkInput
        bind:linkUrl
        bind:isLinkActive
        bind:showColorPicker
        bind:showFontSelector
        bind:showFontSizeSelector
        bind:currentFont
        bind:currentFontSize
      />
      
      <!-- Editor -->
      <EditorArea
        bind:editor
        bind:editorElement
        bind:replyBody
        bind:isLinkActive
        {closeDropdowns}
      />
    </div>

    <!-- Footer -->
    <ComposerFooter
      {isSending}
      onSend={handleSend}
      onCancel={handleCancel}
      isDisabled={!hasEditorContent}
    />
  </div>
{/if}
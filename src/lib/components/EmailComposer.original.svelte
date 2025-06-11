<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from 'flowbite-svelte';
  import { Send, X, Loader2, Bold, Italic, Underline, List, ListOrdered, Link2, Strikethrough, Indent, Outdent, Unlink, Undo, Redo, Palette, AlignLeft, AlignCenter, AlignRight, Quote, RotateCcw } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import type { Editor } from '@tiptap/core';

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
  let linkInputElement = $state<HTMLInputElement>();
  let isLinkActive = $state(false);
  let showColorPicker = $state(false);
  let showFontSelector = $state(false);
  let showFontSizeSelector = $state(false);
  let currentFont = $state('Arial');
  let currentFontSize = $state('14px');

  // Handle Edra content changes
  function handleEdraUpdate() {
    if (editor) {
      replyBody = editor.getHTML();
    }
  }

  function getPlainText() {
    if (editor) {
      return editor.getText();
    }
    return '';
  }

  // Simple toolbar functions
  function toggleBold() {
    editor?.chain().focus().toggleBold().run();
  }
  
  function toggleItalic() {
    editor?.chain().focus().toggleItalic().run();
  }
  
  function toggleUnderline() {
    editor?.chain().focus().toggleUnderline().run();
  }
  
  function toggleBulletList() {
    editor?.chain().focus().toggleBulletList().run();
  }
  
  function toggleOrderedList() {
    editor?.chain().focus().toggleOrderedList().run();
  }

  function toggleStrike() {
    editor?.chain().focus().toggleStrike().run();
  }

  function toggleLink() {
    console.log('Link button clicked');
    
    // Check if already a link - if so, remove it
    if (isLinkActive) {
      console.log('Removing link');
      editor?.chain().focus().unsetLink().run();
      return;
    }

    // Show inline link input
    showLinkInput = true;
    linkUrl = 'https://';
    
    // Focus the input after it's rendered
    setTimeout(() => {
      linkInputElement?.focus();
    }, 10);
  }

  function applyLink() {
    if (linkUrl && linkUrl.trim() && linkUrl !== 'https://') {
      console.log('Setting link with URL:', linkUrl);
      editor?.chain().focus().setLink({ href: linkUrl.trim() }).run();
      console.log('Link set successfully');
    }
    showLinkInput = false;
    linkUrl = '';
    editor?.commands.focus();
  }

  function cancelLink() {
    showLinkInput = false;
    linkUrl = '';
    editor?.commands.focus();
  }

  function indentContent() {
    // For lists, indent the list item
    if (editor?.isActive('listItem')) {
      editor?.chain().focus().sinkListItem('listItem').run();
    }
  }

  function outdentContent() {
    // For lists, outdent the list item
    if (editor?.isActive('listItem')) {
      editor?.chain().focus().liftListItem('listItem').run();
    }
  }

  function undo() {
    editor?.chain().focus().undo().run();
  }

  function redo() {
    editor?.chain().focus().redo().run();
  }

  function toggleBlockquote() {
    editor?.chain().focus().toggleBlockquote().run();
  }

  function clearFormatting() {
    editor?.chain().focus().clearNodes().unsetAllMarks().run();
  }

  function setTextAlign(alignment: 'left' | 'center' | 'right') {
    editor?.chain().focus().setTextAlign(alignment).run();
  }

  function setTextColor(color: string) {
    editor?.chain().focus().setColor(color).run();
    showColorPicker = false;
  }

  function setFontFamily(font: string) {
    editor?.chain().focus().setFontFamily(font).run();
    currentFont = font;
    showFontSelector = false;
  }

  function setFontSize(size: string) {
    editor?.chain().focus().setFontSize(size + 'px').run();
    currentFontSize = size + 'px';
    showFontSizeSelector = false;
  }

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
        applyLink();
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

  // Initialize editor when element becomes available
  async function initializeEditor() {
    if (!editorElement) {
      console.error('Editor element not found');
      return;
    }

    console.log('Starting editor initialization...');
    
    try {
      // Import Tiptap extensions for Gmail-like features
      const { Editor } = await import('@tiptap/core');
      const { default: StarterKit } = await import('@tiptap/starter-kit');
      const { default: Link } = await import('@tiptap/extension-link');
      const { default: Underline } = await import('@tiptap/extension-underline');
      const { default: TextAlign } = await import('@tiptap/extension-text-align');
      const { default: Color } = await import('@tiptap/extension-color');
      const { default: TextStyle } = await import('@tiptap/extension-text-style');
      const { default: FontFamily } = await import('@tiptap/extension-font-family');
      const { Extension } = await import('@tiptap/core');
      
      console.log('Tiptap modules loaded');

      // Create a custom FontSize extension
      const FontSize = Extension.create({
        name: 'fontSize',
        
        addGlobalAttributes() {
          return [
            {
              types: ['textStyle'],
              attributes: {
                fontSize: {
                  default: null,
                  parseHTML: element => element.style.fontSize || null,
                  renderHTML: attributes => {
                    if (!attributes.fontSize) {
                      return {}
                    }
                    return {
                      style: `font-size: ${attributes.fontSize}`
                    }
                  },
                },
              },
            },
          ]
        },

        addCommands() {
          return {
            setFontSize: (fontSize) => ({ chain }) => {
              return chain()
                .setMark('textStyle', { fontSize })
                .run()
            },
            unsetFontSize: () => ({ chain }) => {
              return chain()
                .setMark('textStyle', { fontSize: null })
                .removeEmptyTextStyle()
                .run()
            },
          }
        },
      });
      
      editor = new Editor({
        element: editorElement,
        content: '',
        extensions: [
          StarterKit,
          Link.configure({
            openOnClick: false,
            autolink: true,
            defaultProtocol: 'https'
          }),
          Underline,
          TextAlign.configure({
            types: ['heading', 'paragraph'],
          }),
          TextStyle.configure({
            HTMLAttributes: {
              style: ''
            }
          }),
          Color,
          FontFamily.configure({
            types: ['textStyle'],
          }),
          FontSize
        ],
        editable: true,
        autofocus: true,
        onUpdate: ({ editor }) => {
          console.log('Editor content updated:', editor.getHTML());
          replyBody = editor.getHTML();
          isLinkActive = editor.isActive('link');
        },
        onSelectionUpdate: ({ editor }) => {
          isLinkActive = editor.isActive('link');
        },
        onFocus: () => {
          console.log('Editor focused');
        },
        onCreate: ({ editor }) => {
          console.log('Editor created successfully');
          console.log('Editor is editable:', editor.isEditable);
          console.log('Editor element:', editor.view.dom);
        },
        onTransaction: ({ transaction }) => {
          if (transaction.docChanged) {
            console.log('Document changed');
          }
        }
      });
    } catch (error) {
      console.error('Error creating editor:', error);
    }
  }

  // Watch for when editorElement becomes available or when composer becomes visible
  $effect(() => {
    if (editorElement && !editor && isVisible) {
      console.log('Initializing editor - element available and composer visible');
      initializeEditor();
    }
  });

  onMount(() => {
    return () => {
      console.log('Destroying editor');
      editor?.destroy();
    };
  });
</script>

{#if isVisible}
  <!-- Simple Bottom Composer -->
  <div 
    class="fixed bottom-0 left-0 right-0 h-[60vh] bg-white bg-opacity-90 backdrop-blur-md shadow-2xl border-t border-gray-300 z-50"
    transition:slide={{ duration: 300, axis: 'y' }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="reply-composer-title"
    onkeydown={handleKeydown}
    tabindex="-1"
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200">
      <div class="flex items-center gap-4">
        <h4 id="reply-composer-title" class="text-lg font-semibold text-gray-900">Reply</h4>
        {#if originalEmail}
          <span class="text-sm text-gray-600">
            Re: {originalEmail.subject}
          </span>
        {/if}
      </div>
      <Button
        size="sm"
        color="light"
        onclick={handleCancel}
        disabled={isSending}
        title="Close (Esc)"
      >
        <X class="w-4 h-4" />
      </Button>
    </div>

    <!-- Simple Rich Text Editor -->
    <div class="h-[calc(100%-120px)] flex flex-col">
      <!-- Gmail-style Toolbar -->
      <div class="border-b border-gray-200 bg-gray-50 px-4 py-2">
        <div class="flex items-center gap-1 flex-wrap">
          <!-- Undo/Redo -->
          <button
            type="button"
            onclick={undo}
            class="p-2 rounded hover:bg-gray-200"
            title="Undo (Ctrl+Z)"
          >
            <Undo class="w-4 h-4" />
          </button>
          <button
            type="button"
            onclick={redo}
            class="p-2 rounded hover:bg-gray-200"
            title="Redo (Ctrl+Y)"
          >
            <Redo class="w-4 h-4" />
          </button>

          <!-- Separator -->
          <div class="w-px h-6 bg-gray-300 mx-1"></div>

          <!-- Font Family -->
          <div class="relative">
            <button
              type="button"
              onclick={() => showFontSelector = !showFontSelector}
              class="px-3 py-2 text-sm rounded hover:bg-gray-200 min-w-[80px] text-left"
              title="Font Family"
            >
              {currentFont}
            </button>
            {#if showFontSelector}
              <div class="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 min-w-[120px]">
                {#each ['Arial', 'Times New Roman', 'Courier New', 'Helvetica', 'Georgia', 'Verdana'] as font}
                  <button
                    type="button"
                    onclick={() => setFontFamily(font)}
                    class="block w-full px-3 py-2 text-sm text-left hover:bg-gray-100 {currentFont === font ? 'bg-blue-100' : ''}"
                    style="font-family: {font}"
                  >
                    {font}
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Font Size -->
          <div class="relative">
            <button
              type="button"
              onclick={() => showFontSizeSelector = !showFontSizeSelector}
              class="px-3 py-2 text-sm rounded hover:bg-gray-200 min-w-[60px] text-left"
              title="Font Size"
            >
              {currentFontSize.replace('px', '')}
            </button>
            {#if showFontSizeSelector}
              <div class="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10">
                {#each ['10', '12', '14', '16', '18', '20', '24', '28', '36'] as size}
                  <button
                    type="button"
                    onclick={() => setFontSize(size)}
                    class="block w-full px-3 py-2 text-sm text-left hover:bg-gray-100 {(size + 'px') === currentFontSize ? 'bg-blue-100' : ''}"
                  >
                    {size}
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Separator -->
          <div class="w-px h-6 bg-gray-300 mx-1"></div>

          <!-- Text Formatting -->
          <button
            type="button"
            onclick={toggleBold}
            class="p-2 rounded hover:bg-gray-200 {editor?.isActive('bold') ? 'bg-blue-100 text-blue-600' : ''}"
            title="Bold (Ctrl+B)"
          >
            <Bold class="w-4 h-4" />
          </button>
          <button
            type="button"
            onclick={toggleItalic}
            class="p-2 rounded hover:bg-gray-200 {editor?.isActive('italic') ? 'bg-blue-100 text-blue-600' : ''}"
            title="Italic (Ctrl+I)"
          >
            <Italic class="w-4 h-4" />
          </button>
          <button
            type="button"
            onclick={toggleUnderline}
            class="p-2 rounded hover:bg-gray-200 {editor?.isActive('underline') ? 'bg-blue-100 text-blue-600' : ''}"
            title="Underline (Ctrl+U)"
          >
            <Underline class="w-4 h-4" />
          </button>
          <button
            type="button"
            onclick={toggleStrike}
            class="p-2 rounded hover:bg-gray-200 {editor?.isActive('strike') ? 'bg-blue-100 text-blue-600' : ''}"
            title="Strikethrough"
          >
            <Strikethrough class="w-4 h-4" />
          </button>

          <!-- Text Color -->
          <div class="relative">
            <button
              type="button"
              onclick={() => showColorPicker = !showColorPicker}
              class="p-2 rounded hover:bg-gray-200"
              title="Text Color"
            >
              <Palette class="w-4 h-4" />
            </button>
            {#if showColorPicker}
              <div class="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 p-3">
                <div class="grid grid-cols-6 gap-2 w-48">
                  {#each [
                    { color: '#000000', name: 'Black' },
                    { color: '#333333', name: 'Dark Gray' },
                    { color: '#666666', name: 'Gray' },
                    { color: '#999999', name: 'Light Gray' },
                    { color: '#CCCCCC', name: 'Very Light Gray' },
                    { color: '#FFFFFF', name: 'White' },
                    { color: '#FF0000', name: 'Red' },
                    { color: '#FF6600', name: 'Orange' },
                    { color: '#FFFF00', name: 'Yellow' },
                    { color: '#00FF00', name: 'Green' },
                    { color: '#0000FF', name: 'Blue' },
                    { color: '#800080', name: 'Purple' },
                    { color: '#FF69B4', name: 'Hot Pink' },
                    { color: '#FFA500', name: 'Orange' },
                    { color: '#32CD32', name: 'Lime Green' },
                    { color: '#00CED1', name: 'Dark Turquoise' },
                    { color: '#4169E1', name: 'Royal Blue' },
                    { color: '#8A2BE2', name: 'Blue Violet' }
                  ] as colorItem}
                    <button
                      type="button"
                      onclick={() => setTextColor(colorItem.color)}
                      class="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-500 hover:scale-105 transition-all duration-150 shadow-sm"
                      style="background-color: {colorItem.color}; {colorItem.color === '#FFFFFF' ? 'border-color: #d1d5db;' : ''}"
                      title={colorItem.name + ' (' + colorItem.color + ')'}
                    ></button>
                  {/each}
                </div>
                <div class="mt-3 pt-2 border-t border-gray-200">
                  <button
                    type="button"
                    onclick={() => setTextColor('')}
                    class="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
                  >
                    Reset to default
                  </button>
                </div>
              </div>
            {/if}
          </div>

          <!-- Separator -->
          <div class="w-px h-6 bg-gray-300 mx-1"></div>

          <!-- Text Alignment -->
          <button
            type="button"
            onclick={() => setTextAlign('left')}
            class="p-2 rounded hover:bg-gray-200 {editor?.isActive({ textAlign: 'left' }) ? 'bg-blue-100 text-blue-600' : ''}"
            title="Align Left"
          >
            <AlignLeft class="w-4 h-4" />
          </button>
          <button
            type="button"
            onclick={() => setTextAlign('center')}
            class="p-2 rounded hover:bg-gray-200 {editor?.isActive({ textAlign: 'center' }) ? 'bg-blue-100 text-blue-600' : ''}"
            title="Align Center"
          >
            <AlignCenter class="w-4 h-4" />
          </button>
          <button
            type="button"
            onclick={() => setTextAlign('right')}
            class="p-2 rounded hover:bg-gray-200 {editor?.isActive({ textAlign: 'right' }) ? 'bg-blue-100 text-blue-600' : ''}"
            title="Align Right"
          >
            <AlignRight class="w-4 h-4" />
          </button>

          <!-- Separator -->
          <div class="w-px h-6 bg-gray-300 mx-1"></div>

          <!-- Lists -->
          <button
            type="button"
            onclick={toggleOrderedList}
            class="p-2 rounded hover:bg-gray-200 {editor?.isActive('orderedList') ? 'bg-blue-100 text-blue-600' : ''}"
            title="Numbered List"
          >
            <ListOrdered class="w-4 h-4" />
          </button>
          <button
            type="button"
            onclick={toggleBulletList}
            class="p-2 rounded hover:bg-gray-200 {editor?.isActive('bulletList') ? 'bg-blue-100 text-blue-600' : ''}"
            title="Bullet List"
          >
            <List class="w-4 h-4" />
          </button>

          <!-- List Indentation -->
          <button
            type="button"
            onclick={outdentContent}
            class="p-2 rounded hover:bg-gray-200"
            title="Decrease Indent"
          >
            <Outdent class="w-4 h-4" />
          </button>
          <button
            type="button"
            onclick={indentContent}
            class="p-2 rounded hover:bg-gray-200"
            title="Increase Indent"
          >
            <Indent class="w-4 h-4" />
          </button>

          <!-- Quote -->
          <button
            type="button"
            onclick={toggleBlockquote}
            class="p-2 rounded hover:bg-gray-200 {editor?.isActive('blockquote') ? 'bg-blue-100 text-blue-600' : ''}"
            title="Quote"
          >
            <Quote class="w-4 h-4" />
          </button>

          <!-- Separator -->
          <div class="w-px h-6 bg-gray-300 mx-1"></div>

          <!-- Link/Unlink -->
          <button
            type="button"
            onclick={toggleLink}
            class="p-2 rounded hover:bg-gray-200 {isLinkActive ? 'bg-blue-100 text-blue-600' : ''}"
            title={isLinkActive ? 'Remove Link' : 'Insert Link'}
          >
            {#if isLinkActive}
              <Unlink class="w-4 h-4" />
            {:else}
              <Link2 class="w-4 h-4" />
            {/if}
          </button>

          <!-- Clear Formatting -->
          <button
            type="button"
            onclick={clearFormatting}
            class="p-2 rounded hover:bg-gray-200"
            title="Clear Formatting"
          >
            <RotateCcw class="w-4 h-4" />
          </button>
        </div>

        <!-- Inline Link Input -->
        {#if showLinkInput}
          <div class="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded border">
            <input
              bind:this={linkInputElement}
              type="text"
              bind:value={linkUrl}
              placeholder="Enter URL..."
              data-link-input="true"
              class="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onclick={applyLink}
              class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Apply
            </button>
            <button
              type="button"
              onclick={cancelLink}
              class="px-3 py-1 text-sm bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        {/if}
      </div>
      
      <!-- Editor -->
      <div class="flex-1 overflow-auto">
        <div 
          bind:this={editorElement}
          class="h-full w-full outline-none border border-gray-200 rounded overflow-auto"
          onclick={() => {
            console.log('Editor container clicked');
            closeDropdowns();
            editor?.commands.focus();
          }}
          role="textbox"
          tabindex="0"
          aria-label="Email content editor"
        ></div>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
      <div class="text-sm text-gray-500">
        <kbd class="px-2 py-1 text-xs font-mono bg-gray-200 rounded">Ctrl+Enter</kbd> to send
      </div>
      <div class="flex gap-3">
        <Button
          size="sm"
          color="light"
          onclick={handleCancel}
          disabled={isSending}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          color="blue"
          onclick={handleSend}
          disabled={isSending || !getPlainText().trim()}
          class="flex items-center gap-2"
        >
          {#if isSending}
            <Loader2 class="w-4 h-4 animate-spin" />
            Sending...
          {:else}
            <Send class="w-4 h-4" />
            Send Reply
          {/if}
        </Button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Basic ProseMirror editor styling */
  :global(.ProseMirror) {
    outline: none;
    font-size: 16px;
    line-height: 1.6;
    padding: 16px;
    min-height: 200px;
    max-height: 300px;
    color: #374151;
    background: white;
    border: none;
    overflow-y: auto;
    word-wrap: break-word;
  }
  
  :global(.ProseMirror:focus) {
    outline: none;
  }
  
  :global(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: #9ca3af;
    pointer-events: none;
    height: 0;
  }

  /* Gmail-like link styling */
  :global(.ProseMirror a) {
    color: #1a73e8;
    text-decoration: underline;
    cursor: pointer;
  }

  :global(.ProseMirror a:hover) {
    text-decoration: underline;
  }

  /* List styling */
  :global(.ProseMirror ul, .ProseMirror ol) {
    padding-left: 1.5rem;
    margin: 0.5em 0;
  }

  :global(.ProseMirror ul) {
    list-style-type: disc;
  }

  :global(.ProseMirror ol) {
    list-style-type: decimal;
  }

  :global(.ProseMirror li) {
    margin: 0.25em 0;
  }

  /* Blockquote styling */
  :global(.ProseMirror blockquote) {
    border-left: 4px solid #e5e7eb;
    margin: 1em 0;
    padding-left: 1em;
    color: #6b7280;
    font-style: italic;
  }
</style>
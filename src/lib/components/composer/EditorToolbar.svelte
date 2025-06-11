<script>
  import { Bold, Italic, Underline, List, ListOrdered, Link2, Strikethrough, Indent, Outdent, Unlink, Undo, Redo, Palette, AlignLeft, AlignCenter, AlignRight, Quote, RotateCcw } from 'lucide-svelte';
  import ColorPicker from './ColorPicker.svelte';
  import FontSelector from './FontSelector.svelte';
  import LinkInput from './LinkInput.svelte';

  // Props
  let {
    editor = $bindable(),
    showLinkInput = $bindable(false),
    linkUrl = $bindable(''),
    isLinkActive = $bindable(false),
    showColorPicker = $bindable(false),
    showFontSelector = $bindable(false),
    showFontSizeSelector = $bindable(false),
    currentFont = $bindable('Arial'),
    currentFontSize = $bindable('14px')
  } = $props();

  // Toolbar functions
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

  function setTextAlign(/** @type {string} */ alignment) {
    editor?.chain().focus().setTextAlign(alignment).run();
  }

  function setTextColor(/** @type {string} */ color) {
    editor?.chain().focus().setColor(color).run();
    showColorPicker = false;
  }

  function setFontFamily(/** @type {string} */ font) {
    editor?.chain().focus().setFontFamily(font).run();
    currentFont = font;
    showFontSelector = false;
  }

  function setFontSize(/** @type {string} */ size) {
    editor?.chain().focus().setFontSize(size + 'px').run();
    currentFontSize = size + 'px';
    showFontSizeSelector = false;
  }

  function closeDropdowns() {
    showFontSelector = false;
    showFontSizeSelector = false;
    showColorPicker = false;
  }
</script>

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

    <!-- Font Family & Size -->
    <FontSelector
      bind:showFontSelector
      bind:showFontSizeSelector
      bind:currentFont
      bind:currentFontSize
      {setFontFamily}
      {setFontSize}
    />

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
    <ColorPicker
      bind:showColorPicker
      {setTextColor}
    />

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
    <LinkInput
      bind:showLinkInput
      bind:linkUrl
      {editor}
    />
  {/if}
</div>
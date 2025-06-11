<script>
  import { onMount } from 'svelte';

  // Props
  let {
    editor = $bindable(),
    editorElement = $bindable(),
    replyBody = $bindable(''),
    isLinkActive = $bindable(false),
    closeDropdowns
  } = $props();

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

  // Watch for when editorElement becomes available
  $effect(() => {
    if (editorElement && !editor) {
      console.log('Initializing editor - element available');
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

<div class="flex-1 overflow-auto">
  <div 
    bind:this={editorElement}
    class="h-full w-full outline-none border border-gray-200 rounded overflow-auto"
    onclick={() => {
      console.log('Editor container clicked');
      closeDropdowns();
      editor?.commands.focus();
    }}
    onkeydown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        closeDropdowns();
        editor?.commands.focus();
      }
    }}
    role="textbox"
    tabindex="0"
    aria-label="Email content editor"
  ></div>
</div>

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
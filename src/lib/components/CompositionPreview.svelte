<script lang="ts">
  // Props
  interface Props {
    emailCompositionFormat: 'html' | 'plaintext';
    emailFontFamily: string;
    emailFontSize: string;
    autoSignatureEnabled: boolean;
    emailSignature: string;
    replyQuotePosition: 'above' | 'below';
    includeOriginalMessage: boolean;
  }

  let {
    emailCompositionFormat,
    emailFontFamily,
    emailFontSize,
    autoSignatureEnabled,
    emailSignature,
    replyQuotePosition,
    includeOriginalMessage
  }: Props = $props();

  // Sample email content for preview
  const sampleReplyContent = "Thank you for your message! I'll review the proposal and get back to you by tomorrow.";
  const sampleOriginalEmail = {
    from: "john.doe@example.com",
    date: "Dec 15, 2024 at 2:30 PM",
    subject: "Project Proposal Discussion",
    content: "Hi there,\n\nI wanted to follow up on our conversation about the new project proposal. Could we schedule a meeting to discuss the details?\n\nBest regards,\nJohn"
  };

  // Computed styles based on settings
  const previewStyles = $derived({
    fontFamily: emailFontFamily,
    fontSize: emailFontSize,
    lineHeight: '1.5'
  });

  // Format the preview signature
  const formattedSignature = $derived(
    emailSignature
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
  );

  // Build the complete email preview
  const emailPreview = $derived.by(() => {
    let content: string[] = [];
    
    // Add reply content above if position is 'above' and original message is included
    if (replyQuotePosition === 'above' && includeOriginalMessage) {
      content.push(sampleReplyContent);
      content.push(''); // Empty line
    }
    
    // Add original message if enabled
    if (includeOriginalMessage) {
      content.push(`On ${sampleOriginalEmail.date}, ${sampleOriginalEmail.from} wrote:`);
      content.push(''); // Empty line
      content.push('> ' + sampleOriginalEmail.content.split('\n').join('\n> '));
      content.push(''); // Empty line
    }
    
    // Add reply content below if position is 'below' or original message is disabled
    if (replyQuotePosition === 'below' || !includeOriginalMessage) {
      content.push(sampleReplyContent);
    }
    
    // Add signature if enabled
    if (autoSignatureEnabled && emailSignature.trim()) {
      content.push(''); // Empty line
      content.push('--'); // Signature separator
      content.push(...formattedSignature);
    }
    
    return content;
  });
</script>

<div class="bg-white rounded-lg border border-gray-200 p-4">
  <div class="flex items-center justify-between mb-4">
    <h4 class="text-md font-medium text-gray-700">👁️ Preview</h4>
    <div class="flex items-center space-x-2 text-xs text-gray-500">
      <span class="px-2 py-1 bg-gray-100 rounded">
        {emailCompositionFormat === 'html' ? '🎨 HTML' : '📝 Plain Text'}
      </span>
      <span class="px-2 py-1 rounded {emailCompositionFormat === 'plaintext' ? 'bg-gray-50 text-gray-400 line-through' : 'bg-gray-100'}">
        {emailFontFamily?.split(',')[0] || 'Arial'} {emailFontSize || '14px'}
      </span>
    </div>
  </div>

  <!-- Email composition preview area -->
  <div class="border border-gray-300 rounded-lg bg-gray-50 p-4 min-h-[200px]">
    <!-- Email header mockup -->
    <div class="bg-white rounded border border-gray-200 mb-4 p-3">
      <div class="space-y-2 text-sm">
        <div class="flex items-start">
          <span class="text-gray-600 w-16 font-medium flex-shrink-0">To:</span>
          <span class="text-gray-900 flex-1">john.doe@example.com</span>
        </div>
        <div class="flex items-start">
          <span class="text-gray-600 w-16 font-medium flex-shrink-0">Subject:</span>
          <span class="text-gray-900 flex-1">Re: Project Proposal Discussion</span>
        </div>
      </div>
    </div>

    <!-- Email body preview -->
    <div class="bg-white rounded border border-gray-200 p-4">
      {#if emailCompositionFormat === 'html'}
        <!-- HTML/Rich text preview -->
        <div class="prose prose-sm max-w-none">
          {#each emailPreview as line}
            {#if line === ''}
              <br />
            {:else if line.startsWith('> ')}
              <!-- Original email content - uses original formatting (typically default font) -->
              <blockquote class="border-l-4 border-gray-300 pl-4 text-gray-600 italic my-2 font-sans text-sm">
                {line.substring(2)}
              </blockquote>
            {:else if line === '--'}
              <hr class="my-3 border-gray-300" />
            {:else if line.startsWith('On ') && line.includes('wrote:')}
              <!-- Email header - typically uses default font -->
              <p class="text-gray-600 text-sm mb-2 font-sans">{line}</p>
            {:else}
              <!-- Your composed content - uses your font settings -->
              <p 
                class="mb-2"
                style="font-family: {previewStyles.fontFamily}; font-size: {previewStyles.fontSize}; line-height: {previewStyles.lineHeight};"
              >{line}</p>
            {/if}
          {/each}
        </div>
      {:else}
        <!-- Plain text preview - font settings don't apply, uses recipient's client font -->
        <div class="whitespace-pre-wrap text-gray-900">
          <div class="mb-2 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-xs text-yellow-700">
            📝 Plain text emails ignore font settings - recipients see this in their email client's default font
          </div>
          <div class="font-mono text-sm">
            {emailPreview.join('\n')}
          </div>
        </div>
      {/if}
    </div>

    <!-- Format indicator -->
    <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
      <div class="flex items-center space-x-4">
        <span>📧 Live Preview</span>
        {#if autoSignatureEnabled && emailSignature.trim()}
          <span class="text-green-600">✅ Signature enabled</span>
        {/if}
        {#if includeOriginalMessage}
          <span class="text-blue-600">💬 Original message included</span>
        {/if}
      </div>
      <div class="text-right {emailCompositionFormat === 'plaintext' ? 'text-gray-400 line-through' : ''}">
        <div>{emailFontFamily?.split(',')[0] || 'Arial'}</div>
        <div>{emailFontSize}</div>
      </div>
    </div>
  </div>

  <!-- Settings summary -->
  <div class="mt-4 p-3 bg-gray-50 rounded border text-xs">
    <div class="grid grid-cols-2 gap-4">
      <div>
        <strong>Composition:</strong>
        <div class="space-y-1 mt-1">
          <div>Format: {emailCompositionFormat === 'html' ? 'Rich Text (HTML)' : 'Plain Text'}</div>
          <div>Font: {emailFontFamily?.split(',')[0] || 'Arial'} ({emailFontSize || '14px'})</div>
          <div>Signature: {autoSignatureEnabled ? 'Enabled' : 'Disabled'}</div>
        </div>
      </div>
      <div>
        <strong>Reply Settings:</strong>
        <div class="space-y-1 mt-1">
          <div>Include original: {includeOriginalMessage ? 'Yes' : 'No'}</div>
          {#if includeOriginalMessage}
            <div>Position: {replyQuotePosition === 'above' ? 'Above reply' : 'Below reply'}</div>
          {/if}
          <div>Lines: {emailPreview.length}</div>
        </div>
      </div>
    </div>
  </div>
</div>
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CompositionPreview from '../../lib/components/CompositionPreview.svelte';

describe('CompositionPreview', () => {
  const defaultProps = {
    emailCompositionFormat: 'html',
    emailFontFamily: 'Arial, sans-serif',
    emailFontSize: '14px',
    autoSignatureEnabled: false,
    emailSignature: '',
    replyQuotePosition: 'below',
    includeOriginalMessage: true
  };

  it('should render preview component', () => {
    const { container } = render(CompositionPreview, defaultProps);
    
    expect(container).toBeDefined();
    expect(screen.getByText('👁️ Preview')).toBeInTheDocument();
  });

  it('should show HTML format indicator', () => {
    render(CompositionPreview, { ...defaultProps, emailCompositionFormat: 'html' });
    
    expect(screen.getByText('🎨 HTML')).toBeInTheDocument();
  });

  it('should show plain text format indicator', () => {
    render(CompositionPreview, { ...defaultProps, emailCompositionFormat: 'plaintext' });
    
    expect(screen.getByText('📝 Plain Text')).toBeInTheDocument();
  });

  it('should display font information', () => {
    render(CompositionPreview, { 
      ...defaultProps, 
      emailFontFamily: 'Georgia, serif',
      emailFontSize: '16px'
    });
    
    expect(screen.getByText('Georgia 16px')).toBeInTheDocument();
  });

  it('should show signature when enabled', () => {
    render(CompositionPreview, { 
      ...defaultProps, 
      autoSignatureEnabled: true,
      emailSignature: 'Best regards,\nJohn Doe'
    });
    
    expect(screen.getByText('✅ Signature enabled')).toBeInTheDocument();
  });

  it('should show original message indicator when included', () => {
    render(CompositionPreview, { 
      ...defaultProps, 
      includeOriginalMessage: true
    });
    
    expect(screen.getByText('💬 Original message included')).toBeInTheDocument();
  });

  it('should not show original message indicator when disabled', () => {
    render(CompositionPreview, { 
      ...defaultProps, 
      includeOriginalMessage: false
    });
    
    expect(screen.queryByText('💬 Original message included')).not.toBeInTheDocument();
  });

  it('should show sample email content', () => {
    render(CompositionPreview, defaultProps);
    
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('Re: Project Proposal Discussion')).toBeInTheDocument();
  });

  it('should display settings summary', () => {
    render(CompositionPreview, { 
      ...defaultProps,
      emailCompositionFormat: 'plaintext',
      autoSignatureEnabled: true
    });
    
    expect(screen.getByText('Format: Plain Text')).toBeInTheDocument();
    expect(screen.getByText('Signature: Enabled')).toBeInTheDocument();
  });

  it('should show correct reply position in summary', () => {
    render(CompositionPreview, { 
      ...defaultProps, 
      replyQuotePosition: 'above',
      includeOriginalMessage: true
    });
    
    expect(screen.getByText('Position: Above reply')).toBeInTheDocument();
  });

  it('should handle empty signature gracefully', () => {
    const { container } = render(CompositionPreview, { 
      ...defaultProps, 
      autoSignatureEnabled: true,
      emailSignature: ''
    });
    
    expect(container).toBeDefined();
    expect(screen.queryByText('✅ Signature enabled')).not.toBeInTheDocument();
  });

  it('should render with all settings combinations', () => {
    const { container } = render(CompositionPreview, {
      emailCompositionFormat: 'plaintext',
      emailFontFamily: 'Courier New, monospace',
      emailFontSize: '12px',
      autoSignatureEnabled: true,
      emailSignature: 'Best regards,\nTest User\ntest@example.com',
      replyQuotePosition: 'above',
      includeOriginalMessage: false
    });
    
    expect(container).toBeDefined();
    expect(screen.getByText('📝 Plain Text')).toBeInTheDocument();
    expect(screen.getByText('Include original: No')).toBeInTheDocument();
  });
});
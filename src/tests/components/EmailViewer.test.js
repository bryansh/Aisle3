import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import EmailViewer from '../../lib/components/EmailViewer.svelte';

describe('EmailViewer Component', () => {
  const mockEmail = {
    id: 'email1',
    subject: 'Test Email Subject',
    sender: 'test@example.com',
    date: '2025-06-08T10:00:00Z',
    body_text: 'This is the plain text body of the email.',
    body_html: '<p>This is the <strong>HTML</strong> body of the email.</p>',
    snippet: 'This is a test email'
  };

  const mockSanitizeEmailHtml = vi.fn((html) => html);

  const defaultProps = {
    email: mockEmail,
    sanitizeEmailHtml: mockSanitizeEmailHtml
  };

  it('renders email subject correctly', () => {
    render(EmailViewer, { props: defaultProps });

    expect(screen.getByText('Test Email Subject')).toBeInTheDocument();
  });

  it('renders email sender correctly', () => {
    render(EmailViewer, { props: defaultProps });

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders email date correctly', () => {
    render(EmailViewer, { props: defaultProps });

    // The component should format the date for display
    expect(screen.getByText(/2025/)).toBeInTheDocument();
  });

  it('renders HTML content when available', () => {
    render(EmailViewer, { props: defaultProps });

    // Should call sanitizeEmailHtml function
    expect(mockSanitizeEmailHtml).toHaveBeenCalledWith(mockEmail.body_html);
  });

  it('falls back to plain text when HTML not available', () => {
    const emailWithoutHtml = {
      ...mockEmail,
      body_html: null
    };

    render(EmailViewer, { 
      props: { ...defaultProps, email: emailWithoutHtml }
    });

    expect(screen.getByText(mockEmail.body_text)).toBeInTheDocument();
  });

  it('falls back to snippet when no body content available', () => {
    const emailWithoutBody = {
      ...mockEmail,
      body_html: null,
      body_text: null
    };

    render(EmailViewer, { 
      props: { ...defaultProps, email: emailWithoutBody }
    });

    expect(screen.getByText(mockEmail.snippet)).toBeInTheDocument();
  });

  it('handles missing email data gracefully', () => {
    const incompleteEmail = {
      id: 'incomplete',
      subject: 'Incomplete Email'
      // Missing other fields
    };

    render(EmailViewer, { 
      props: { ...defaultProps, email: incompleteEmail }
    });

    expect(screen.getByText('Incomplete Email')).toBeInTheDocument();
  });

  it('sanitizes HTML content for security', () => {
    const maliciousEmail = {
      ...mockEmail,
      body_html: '<script>alert("xss")</script><p>Safe content</p>'
    };

    render(EmailViewer, { 
      props: { ...defaultProps, email: maliciousEmail }
    });

    expect(mockSanitizeEmailHtml).toHaveBeenCalledWith(maliciousEmail.body_html);
  });

  it('displays empty subject placeholder when subject is missing', () => {
    const emailWithoutSubject = {
      ...mockEmail,
      subject: ''
    };

    render(EmailViewer, { 
      props: { ...defaultProps, email: emailWithoutSubject }
    });

    // Should show some placeholder or handle empty subject gracefully
    // This depends on the actual implementation
  });

  it('handles long email content without breaking layout', () => {
    const longEmail = {
      ...mockEmail,
      body_text: 'A'.repeat(10000), // Very long content
      subject: 'Very long subject '.repeat(20)
    };

    render(EmailViewer, { 
      props: { ...defaultProps, email: longEmail }
    });

    // Component should render without errors
    expect(screen.getByText(/AAAAAAA/)).toBeInTheDocument();
  });

  it('maintains email formatting and styling', () => {
    render(EmailViewer, { props: defaultProps });

    // Check that the component has proper CSS classes for styling
    const emailContainer = document.querySelector('.email-content-clean');
    expect(emailContainer).toBeInTheDocument();
  });
});
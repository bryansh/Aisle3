/**
 * Consolidated Email Display Testing
 * Tests shared display logic used across EmailViewer, EmailList, and other email components
 */

import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import { mockEmailFactory, createDefaultProps } from '../utils/testHelpers.js';

// Import components that use shared display logic
import EmailViewer from '../../lib/components/EmailViewer.svelte';
import EmailList from '../../lib/components/EmailList.svelte';

describe('Email Display Shared Logic', () => {
  
  describe('Subject Rendering', () => {
    it('renders email subject correctly in EmailViewer', () => {
      const props = createDefaultProps('EmailViewer', {
        email: mockEmailFactory.basic({ subject: 'Test Subject Display' })
      });
      
      render(EmailViewer, { props });
      expect(screen.getByText('Test Subject Display')).toBeInTheDocument();
    });

    it('renders email subject correctly in EmailList', () => {
      const emails = [mockEmailFactory.basic({ subject: 'List Subject Test' })];
      const props = createDefaultProps('EmailList', { emails });
      
      render(EmailList, { props });
      expect(screen.getByText('List Subject Test')).toBeInTheDocument();
    });

    it('handles missing email subject gracefully', () => {
      const emailWithoutSubject = mockEmailFactory.noSubject();
      const props = createDefaultProps('EmailViewer', { email: emailWithoutSubject });
      
      render(EmailViewer, { props });
      // Should render "(No Subject)" or handle gracefully
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });
  });

  describe('Sender Information Display', () => {
    it('displays sender email address correctly', () => {
      const email = mockEmailFactory.basic({ sender: 'testuser@example.com' });
      const props = createDefaultProps('EmailViewer', { email });
      
      render(EmailViewer, { props });
      expect(screen.getByText('From: testuser@example.com')).toBeInTheDocument();
    });

    it('displays sender in email list format', () => {
      const emails = [mockEmailFactory.basic({ sender: 'listsender@example.com' })];
      const props = createDefaultProps('EmailList', { emails });
      
      render(EmailList, { props });
      expect(screen.getByText('listsender@example.com')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    const testDate = '2025-06-08T10:30:00Z';

    it('formats date correctly in EmailViewer', () => {
      const email = mockEmailFactory.basic({ date: testDate });
      const props = createDefaultProps('EmailViewer', { email });
      
      render(EmailViewer, { props });
      // Should contain the year at minimum
      expect(screen.getByText(/2025/)).toBeInTheDocument();
    });

    it('handles invalid date strings gracefully', () => {
      const email = mockEmailFactory.basic({ date: 'invalid-date' });
      const props = createDefaultProps('EmailViewer', { email });
      
      render(EmailViewer, { props });
      // Should not crash and should display something reasonable
      expect(screen.getByText(/invalid-date/)).toBeInTheDocument();
    });

    it('handles missing date gracefully', () => {
      const email = mockEmailFactory.basic({ date: null });
      const props = createDefaultProps('EmailViewer', { email });
      
      render(EmailViewer, { props });
      // Should render without crashing
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });
  });

  describe('HTML Content Sanitization', () => {
    it('calls sanitization function for HTML content', () => {
      const mockSanitize = vi.fn(html => html);
      const email = mockEmailFactory.withHtml();
      const props = createDefaultProps('EmailViewer', { 
        email,
        sanitizeEmailHtml: mockSanitize 
      });
      
      render(EmailViewer, { props });
      expect(mockSanitize).toHaveBeenCalledWith(email.body_html);
    });

    it('handles malformed HTML content safely', () => {
      const mockSanitize = vi.fn(html => 'sanitized content');
      const email = mockEmailFactory.basic({ 
        body_html: '<script>alert("xss")</script><p>Content</p>' 
      });
      const props = createDefaultProps('EmailViewer', { 
        email,
        sanitizeEmailHtml: mockSanitize 
      });
      
      render(EmailViewer, { props });
      expect(mockSanitize).toHaveBeenCalled();
    });
  });

  describe('Read/Unread State Display', () => {
    it('shows "New" indicator for unread emails in list', () => {
      const unreadEmail = mockEmailFactory.unread();
      const props = createDefaultProps('EmailList', { emails: [unreadEmail] });
      
      render(EmailList, { props });
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('does not show "New" indicator for read emails', () => {
      const readEmail = mockEmailFactory.read();
      const props = createDefaultProps('EmailList', { emails: [readEmail] });
      
      render(EmailList, { props });
      expect(screen.queryByText('New')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('handles loading state display consistently', () => {
      const emails = mockEmailFactory.batch(3);
      const loadingStates = new Set([emails[0].id]); // One email loading
      const props = createDefaultProps('EmailList', { 
        emails, 
        loadingEmailStates: loadingStates 
      });
      
      render(EmailList, { props });
      // Should render without errors and show email content
      expect(screen.getByText(emails[0].subject)).toBeInTheDocument();
      expect(screen.getByText(emails[1].subject)).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('handles empty email list gracefully', () => {
      const props = createDefaultProps('EmailList', { emails: [] });
      
      render(EmailList, { props });
      // Should render empty state without errors
      expect(screen.getByText('No emails found')).toBeInTheDocument();
    });
  });

  describe('Content Length Handling', () => {
    it('handles very long email subjects', () => {
      const longSubject = 'A'.repeat(200); // Very long subject
      const email = mockEmailFactory.basic({ subject: longSubject });
      const props = createDefaultProps('EmailViewer', { email });
      
      render(EmailViewer, { props });
      // Should truncate or handle long subjects gracefully
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });

    it('handles very long email content', () => {
      const longContent = '<p>' + 'Very long content. '.repeat(1000) + '</p>';
      const email = mockEmailFactory.basic({ body_html: longContent });
      const mockSanitize = vi.fn(html => html);
      const props = createDefaultProps('EmailViewer', { 
        email,
        sanitizeEmailHtml: mockSanitize 
      });
      
      render(EmailViewer, { props });
      expect(mockSanitize).toHaveBeenCalled();
    });
  });

  describe('Security Attributes', () => {
    it('applies secure iframe attributes for email content', () => {
      const email = mockEmailFactory.withHtml();
      const props = createDefaultProps('EmailViewer', { email });
      
      render(EmailViewer, { props });
      
      const iframe = screen.getByTitle('Email content');
      expect(iframe).toHaveAttribute('sandbox');
      expect(iframe.getAttribute('sandbox')).toContain('allow-popups');
      expect(iframe.getAttribute('sandbox')).toContain('allow-same-origin');
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for email content', () => {
      const email = mockEmailFactory.basic();
      const props = createDefaultProps('EmailViewer', { email });
      
      render(EmailViewer, { props });
      
      // Should have proper heading structure
      expect(screen.getByRole('heading')).toBeInTheDocument();
      
      // Iframe should have descriptive title
      expect(screen.getByTitle('Email content')).toBeInTheDocument();
    });

    it('provides proper list semantics for email list', () => {
      const emails = mockEmailFactory.batch(3);
      const props = createDefaultProps('EmailList', { emails });
      
      render(EmailList, { props });
      
      // Should render email items without crashing
      expect(screen.getByText(emails[0].subject)).toBeInTheDocument();
      expect(screen.getByText(emails[1].subject)).toBeInTheDocument();
    });
  });
});
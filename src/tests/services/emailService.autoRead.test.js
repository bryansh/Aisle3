import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailService } from '../../lib/services/emailService.js';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

const { invoke } = await import('@tauri-apps/api/core');

describe('EmailService Auto-Read Functionality', () => {
  let emailService;
  
  beforeEach(() => {
    emailService = new EmailService();
    emailService.emails = [
      { id: '1', subject: 'Test Email 1', is_read: false },
      { id: '2', subject: 'Test Email 2', is_read: true },
      { id: '3', subject: 'Test Email 3', is_read: false }
    ];
    vi.clearAllMocks();
    // Clear any existing timers
    vi.clearAllTimers();
    // Use fake timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  describe('scheduleAutoMarkAsRead', () => {
    it('should schedule auto-mark for unread email', () => {
      const timerId = emailService.scheduleAutoMarkAsRead('1', 1000);
      
      expect(timerId).toBeTruthy();
      expect(timerId).not.toBeNull();
    });

    it('should not schedule auto-mark for read email', () => {
      const timerId = emailService.scheduleAutoMarkAsRead('2', 1000);
      
      expect(timerId).toBeNull();
    });

    it('should not schedule auto-mark for non-existent email', () => {
      const timerId = emailService.scheduleAutoMarkAsRead('999', 1000);
      
      expect(timerId).toBeNull();
    });

    it('should execute auto-mark after delay', async () => {
      invoke.mockResolvedValue(true);
      emailService.loadStatsInBackground = vi.fn().mockResolvedValue({ totalCount: 10, unreadCount: 2 });

      const timerId = emailService.scheduleAutoMarkAsRead('1', 1000);
      
      expect(timerId).toBeTruthy();
      expect(invoke).not.toHaveBeenCalled();
      
      // Fast-forward time
      vi.advanceTimersByTime(1000);
      
      // Wait for async operations
      await vi.runAllTimersAsync();
      
      expect(invoke).toHaveBeenCalledWith('mark_email_as_read', { emailId: '1' });
      expect(emailService.emails.find(e => e.id === '1').is_read).toBe(true);
    });

    it('should not execute if email becomes read before timer', async () => {
      invoke.mockResolvedValue(true);
      
      const timerId = emailService.scheduleAutoMarkAsRead('1', 1000);
      
      // Mark email as read manually before timer executes
      emailService.emails = emailService.emails.map(email => 
        email.id === '1' ? { ...email, is_read: true } : email
      );
      
      // Fast-forward time
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();
      
      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe('cancelAutoMarkAsRead', () => {
    it('should cancel scheduled auto-mark', () => {
      const timerId = emailService.scheduleAutoMarkAsRead('1', 1000);
      
      // Cancel the timer
      emailService.cancelAutoMarkAsRead(timerId);
      
      // Fast-forward time
      vi.advanceTimersByTime(1000);
      
      expect(invoke).not.toHaveBeenCalled();
    });

    it('should handle null timer gracefully', () => {
      expect(() => {
        emailService.cancelAutoMarkAsRead(null);
      }).not.toThrow();
    });
  });

  describe('markAsRead with automatic flag', () => {
    it('should call service with automatic flag true', async () => {
      invoke.mockResolvedValue(true);
      emailService.loadStatsInBackground = vi.fn().mockResolvedValue({ totalCount: 10, unreadCount: 2 });
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await emailService.markAsRead('1', true);
      
      expect(invoke).toHaveBeenCalledWith('mark_email_as_read', { emailId: '1' });
      expect(consoleSpy).toHaveBeenCalledWith('📧 Auto-marked email "Test Email 1" as read');
      
      consoleSpy.mockRestore();
    });

    it('should not log automatic message when flag is false', async () => {
      invoke.mockResolvedValue(true);
      emailService.loadStatsInBackground = vi.fn().mockResolvedValue({ totalCount: 10, unreadCount: 2 });
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await emailService.markAsRead('1', false);
      
      expect(invoke).toHaveBeenCalledWith('mark_email_as_read', { emailId: '1' });
      expect(consoleSpy).not.toHaveBeenCalledWith('📧 Auto-marked email "Test Email 1" as read');
      
      consoleSpy.mockRestore();
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailService } from '../../lib/services/emailService.js';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

const { invoke } = await import('@tauri-apps/api/core');

describe('EmailService Reply Functionality', () => {
  let emailService;
  
  beforeEach(() => {
    emailService = new EmailService();
    vi.clearAllMocks();
  });

  describe('sendReply', () => {
    it('should call send_reply Tauri command with correct parameters', async () => {
      const mockResult = 'Reply sent successfully! Message ID: 12345';
      invoke.mockResolvedValue(mockResult);
      
      const originalEmailId = 'email_123';
      const replyBody = 'Thank you for your email. This is my reply.';
      
      const result = await emailService.sendReply(originalEmailId, replyBody);
      
      expect(invoke).toHaveBeenCalledWith('send_reply', {
        originalEmailId,
        replyBody
      });
      expect(result).toBe(mockResult);
    });

    it('should handle errors from Tauri command', async () => {
      const errorMessage = 'Failed to send reply: Authentication required';
      invoke.mockRejectedValue(new Error(errorMessage));
      
      const originalEmailId = 'email_123';
      const replyBody = 'Test reply';
      
      await expect(emailService.sendReply(originalEmailId, replyBody))
        .rejects.toThrow(errorMessage);
      
      expect(invoke).toHaveBeenCalledWith('send_reply', {
        originalEmailId,
        replyBody
      });
    });

    it('should log successful reply sending', async () => {
      const mockResult = 'Reply sent successfully! Message ID: 67890';
      invoke.mockResolvedValue(mockResult);
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await emailService.sendReply('email_456', 'Another test reply');
      
      expect(consoleSpy).toHaveBeenCalledWith('📧 Reply sent successfully:', mockResult);
      
      consoleSpy.mockRestore();
    });

    it('should log errors when reply fails', async () => {
      const error = new Error('Network error');
      invoke.mockRejectedValue(error);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        await emailService.sendReply('email_789', 'Failed reply');
      } catch (e) {
        // Expected to throw
      }
      
      expect(consoleSpy).toHaveBeenCalledWith('Error sending reply:', error);
      
      consoleSpy.mockRestore();
    });

    it('should handle empty reply body', async () => {
      const mockResult = 'Reply sent successfully! Message ID: empty';
      invoke.mockResolvedValue(mockResult);
      
      const result = await emailService.sendReply('email_empty', '');
      
      expect(invoke).toHaveBeenCalledWith('send_reply', {
        originalEmailId: 'email_empty',
        replyBody: ''
      });
      expect(result).toBe(mockResult);
    });

    it('should handle special characters in reply body', async () => {
      const mockResult = 'Reply sent successfully! Message ID: special';
      invoke.mockResolvedValue(mockResult);
      
      const specialReply = 'Reply with émojis 🎉 and special chars: @#$%^&*()';
      
      const result = await emailService.sendReply('email_special', specialReply);
      
      expect(invoke).toHaveBeenCalledWith('send_reply', {
        originalEmailId: 'email_special',
        replyBody: specialReply
      });
      expect(result).toBe(mockResult);
    });

    it('should handle long reply body', async () => {
      const mockResult = 'Reply sent successfully! Message ID: long';
      invoke.mockResolvedValue(mockResult);
      
      const longReply = 'A'.repeat(10000); // 10k character reply
      
      const result = await emailService.sendReply('email_long', longReply);
      
      expect(invoke).toHaveBeenCalledWith('send_reply', {
        originalEmailId: 'email_long',
        replyBody: longReply
      });
      expect(result).toBe(mockResult);
    });

    it('should maintain threading when replying to emails', async () => {
      const mockResult = 'Reply sent successfully! Message ID: threaded_reply_123';
      invoke.mockResolvedValue(mockResult);
      
      const originalEmailId = 'original_email_456';
      const replyBody = 'This reply should be threaded with the original conversation.';
      
      const result = await emailService.sendReply(originalEmailId, replyBody);
      
      // Verify the backend is called with original email ID for threading
      expect(invoke).toHaveBeenCalledWith('send_reply', {
        originalEmailId,
        replyBody
      });
      expect(result).toBe(mockResult);
    });

    it('should handle replies to emails with existing thread chains', async () => {
      const mockResult = 'Reply sent successfully! Message ID: chain_reply_789';
      invoke.mockResolvedValue(mockResult);
      
      // Simulate replying to an email that's already part of a conversation
      const threadedEmailId = 'threaded_email_789';
      const replyBody = 'Adding to an existing conversation thread.';
      
      const result = await emailService.sendReply(threadedEmailId, replyBody);
      
      expect(invoke).toHaveBeenCalledWith('send_reply', {
        originalEmailId: threadedEmailId,
        replyBody
      });
      expect(result).toBe(mockResult);
    });
  });
});
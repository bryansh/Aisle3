import { invoke } from '@tauri-apps/api/core';

/**
 * Email Service - Centralized email operations and API calls
 */

export class EmailService {
  constructor() {
    this.emails = [];
    this.totalCount = 0;
    this.unreadCount = 0;
  }

  /**
   * Load emails from Gmail API
   */
  async loadEmails() {
    try {
      const emails = await invoke('get_emails');
      this.emails = emails;
      return emails;
    } catch (error) {
      console.error('Error loading emails:', error);
      throw error;
    }
  }

  /**
   * Load emails in background (no loading spinner)
   */
  async loadEmailsInBackground() {
    try {
      const emails = await invoke('get_emails');
      this.emails = emails;
      return emails;
    } catch (error) {
      console.error('Error loading emails in background:', error);
      throw error;
    }
  }

  /**
   * Load inbox statistics
   */
  async loadStats() {
    try {
      const stats = await invoke('get_inbox_stats');
      this.totalCount = stats[0];
      this.unreadCount = stats[1];
      return { totalCount: stats[0], unreadCount: stats[1] };
    } catch (error) {
      console.error('Error loading stats:', error);
      throw error;
    }
  }

  /**
   * Load stats in background
   */
  async loadStatsInBackground() {
    try {
      const stats = await invoke('get_inbox_stats');
      this.totalCount = stats[0];
      this.unreadCount = stats[1];
      return { totalCount: stats[0], unreadCount: stats[1] };
    } catch (error) {
      console.error('Error loading stats in background:', error);
      throw error;
    }
  }

  /**
   * Get email content by ID
   */
  async getEmailContent(emailId) {
    try {
      return await invoke('get_email_content', { emailId });
    } catch (error) {
      console.error('Error loading email content:', error);
      throw error;
    }
  }

  /**
   * Mark email as read
   */
  async markAsRead(emailId) {
    try {
      await invoke('mark_email_as_read', { emailId });
      
      // Update local cache
      this.emails = this.emails.map(email => 
        email.id === emailId ? { ...email, is_read: true } : email
      );
      
      // Refresh stats
      await this.loadStatsInBackground();
      
      return true;
    } catch (error) {
      console.error('Error marking email as read:', error);
      throw error;
    }
  }

  /**
   * Mark email as unread
   */
  async markAsUnread(emailId) {
    try {
      await invoke('mark_email_as_unread', { emailId });
      
      // Update local cache
      this.emails = this.emails.map(email => 
        email.id === emailId ? { ...email, is_read: false } : email
      );
      
      // Refresh stats
      await this.loadStatsInBackground();
      
      return true;
    } catch (error) {
      console.error('Error marking email as unread:', error);
      throw error;
    }
  }

  /**
   * Check for new emails since last check
   */
  async checkForNewEmails(useBackgroundLoading = false) {
    try {
      const newEmailIds = await invoke('check_for_new_emails_since_last_check');
      
      if (newEmailIds && newEmailIds.length > 0) {
        console.log(`📬 Found ${newEmailIds.length} new emails:`, newEmailIds);
        
        // Refresh emails and stats
        if (useBackgroundLoading) {
          await this.loadEmailsInBackground();
          await this.loadStatsInBackground();
        } else {
          await this.loadEmails();
          await this.loadStats();
        }
        
        return newEmailIds;
      }
      
      return [];
    } catch (error) {
      console.error('Error checking for new emails:', error);
      throw error;
    }
  }

  /**
   * Get current emails
   */
  getEmails() {
    return this.emails;
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      totalCount: this.totalCount,
      unreadCount: this.unreadCount
    };
  }

  /**
   * Find email by ID
   */
  findEmailById(emailId) {
    return this.emails.find(email => email.id === emailId);
  }

  /**
   * Group emails by thread_id for conversations
   */
  getConversations(showSingleMessageThreads = false) {
    // Group emails by thread_id
    const threadMap = new Map();
    this.emails.forEach(email => {
      if (email && email.thread_id) {
        if (!threadMap.has(email.thread_id)) {
          threadMap.set(email.thread_id, []);
        }
        threadMap.get(email.thread_id).push(email);
      }
    });

    // Convert to conversation objects
    const allThreads = Array.from(threadMap.entries()).map(([thread_id, threadEmails]) => {
      threadEmails.sort((a, b) => a.id.localeCompare(b.id));
      const latestEmail = threadEmails[threadEmails.length - 1];
      
      return {
        thread_id,
        subject: latestEmail.subject,
        sender: latestEmail.sender,
        snippet: latestEmail.snippet,
        message_count: threadEmails.length,
        has_unread: threadEmails.some(email => !email.is_read),
        latest_date: latestEmail.id,
        emails: threadEmails
      };
    });

    // Filter based on settings
    const filtered = showSingleMessageThreads 
      ? allThreads 
      : allThreads.filter(conv => conv.message_count > 1);

    return filtered.sort((a, b) => b.latest_date.localeCompare(a.latest_date));
  }

  /**
   * Get conversation statistics
   */
  getConversationStats() {
    const threadMap = new Map();
    this.emails.forEach(email => {
      if (email && email.thread_id) {
        if (!threadMap.has(email.thread_id)) {
          threadMap.set(email.thread_id, []);
        }
        threadMap.get(email.thread_id).push(email);
      }
    });
    
    const threadValues = Array.from(threadMap.values());
    const multiMessageThreads = threadValues.filter(threadEmails => threadEmails.length > 1).length;
    const singleMessageThreads = threadValues.filter(threadEmails => threadEmails.length === 1).length;
    
    return {
      totalEmails: this.emails.length,
      totalThreads: threadMap.size,
      multiMessageThreads,
      singleMessageThreads
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();
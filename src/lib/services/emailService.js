import { invoke } from '@tauri-apps/api/core';

/**
 * Email Service - Centralized email operations and API calls
 */

export class EmailService {
  constructor() {
    /** @type {any[]} */
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
  /**
   * @param {string} emailId
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
  /**
   * @param {string} emailId
   * @param {boolean} isAutomatic - Whether this is an automatic marking
   */
  async markAsRead(emailId, isAutomatic = false) {
    try {
      await invoke('mark_email_as_read', { emailId });
      
      // Update local cache
      this.emails = this.emails.map(email => 
        email.id === emailId ? { ...email, is_read: true } : email
      );
      
      // Refresh stats
      await this.loadStatsInBackground();
      
      if (isAutomatic) {
        const email = this.findEmailById(emailId);
        console.log(`📧 Auto-marked email "${email?.subject || emailId}" as read`);
      }
      
      return true;
    } catch (error) {
      console.error('Error marking email as read:', error);
      throw error;
    }
  }

  /**
   * Mark email as read after a delay (auto-read functionality)
   */
  /**
   * @param {string} emailId
   * @param {number} delayMs - Delay in milliseconds before marking as read
   * @returns {number | null} Timer ID that can be used to cancel the operation
   */
  scheduleAutoMarkAsRead(emailId, delayMs = 1500) {
    const email = this.findEmailById(emailId);
    
    // Don't schedule if already read
    if (!email || email.is_read) {
      return null;
    }

    return window.setTimeout(async () => {
      try {
        // Double-check email is still unread
        const currentEmail = this.findEmailById(emailId);
        if (currentEmail && !currentEmail.is_read) {
          await this.markAsRead(emailId, true);
        }
      } catch (error) {
        console.error('Error in scheduled mark as read:', error);
      }
    }, delayMs);
  }

  /**
   * Cancel a scheduled auto-mark operation
   */
  /**
   * @param {number | null} timerId
   */
  cancelAutoMarkAsRead(timerId) {
    if (timerId) {
      window.clearTimeout(timerId);
    }
  }

  /**
   * Send a reply to an email
   */
  /**
   * @param {string} originalEmailId
   * @param {string} replyBody
   */
  async sendReply(originalEmailId, replyBody) {
    try {
      const result = await invoke('send_reply', { 
        originalEmailId, 
        replyBody 
      });
      
      console.log('📧 Reply sent successfully:', result);
      return result;
    } catch (error) {
      console.error('Error sending reply:', error);
      throw error;
    }
  }

  /**
   * Mark email as unread
   */
  /**
   * @param {string} emailId
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
        
        // Get the actual email details for the new emails
        const newEmailDetails = newEmailIds
          .map(/** @param {string} id */ id => this.emails.find(/** @param {any} email */ email => email.id === id))
          .filter(/** @param {any} email */ email => email != null);
        
        console.log(`📬 Retrieved details for ${newEmailDetails.length} new emails`);
        
        // Return both IDs and details
        return {
          emailIds: newEmailIds,
          emailDetails: newEmailDetails
        };
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
  /**
   * @param {string} emailId
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
      threadEmails.sort(/** @param {any} a @param {any} b */ (a, b) => a.id.localeCompare(b.id));
      const latestEmail = threadEmails[threadEmails.length - 1];
      
      return {
        thread_id,
        subject: latestEmail.subject,
        sender: latestEmail.sender,
        snippet: latestEmail.snippet,
        message_count: threadEmails.length,
        has_unread: threadEmails.some(/** @param {any} email */ email => !email.is_read),
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
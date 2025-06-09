import { writable, derived } from 'svelte/store';
import { emailService } from '../services/emailService.js';

// Core email state
/** @type {import('svelte/store').Writable<any[]>} */
export const emails = writable([]);
export const totalCount = writable(0);
export const unreadCount = writable(0);
export const loading = writable(false);

// View state
export const viewMode = writable('emails'); // 'emails' | 'conversations'
export const showSingleMessageThreads = writable(false);

// Selected items
export const selectedEmail = writable(null);
export const selectedConversation = writable(null);
export const loadingEmail = writable(false);

// UI state
export const showEmailView = writable(false);
export const showSettings = writable(false);

// Loading states for individual operations
export const loadingEmailStates = writable(new Set());

// Derived stores
export const conversations = derived(
  [emails, viewMode, showSingleMessageThreads],
  ([$emails, $viewMode, $showSingleMessageThreads]) => {
    if ($viewMode !== 'conversations') return [];
    
    // Update emailService cache
    emailService.emails = $emails;
    return emailService.getConversations($showSingleMessageThreads);
  }
);

export const conversationStats = derived(
  [emails, viewMode],
  ([$emails, $viewMode]) => {
    if ($viewMode !== 'conversations') return null;
    
    // Update emailService cache
    emailService.emails = $emails;
    return emailService.getConversationStats();
  }
);

// Email operations
export const emailOperations = {
  async loadEmails() {
    loading.set(true);
    try {
      const emailData = await emailService.loadEmails();
      emails.set(emailData);
    } catch (error) {
      console.error('Error loading emails:', error);
      throw error;
    } finally {
      loading.set(false);
    }
  },

  async loadEmailsInBackground() {
    try {
      const emailData = await emailService.loadEmailsInBackground();
      emails.set(emailData);
    } catch (error) {
      console.error('Error loading emails in background:', error);
      throw error;
    }
  },

  async loadStats() {
    try {
      const stats = await emailService.loadStats();
      totalCount.set(stats.totalCount);
      unreadCount.set(stats.unreadCount);
    } catch (error) {
      console.error('Error loading stats:', error);
      throw error;
    }
  },

  async loadStatsInBackground() {
    try {
      const stats = await emailService.loadStatsInBackground();
      totalCount.set(stats.totalCount);
      unreadCount.set(stats.unreadCount);
    } catch (error) {
      console.error('Error loading stats in background:', error);
      throw error;
    }
  },

  /**
   * @param {string} emailId
   */
  async getEmailContent(emailId) {
    loadingEmail.set(true);
    try {
      const emailContent = await emailService.getEmailContent(emailId);
      selectedEmail.set(emailContent);
      showEmailView.set(true);
      return emailContent;
    } catch (error) {
      console.error('Error loading email content:', error);
      throw error;
    } finally {
      loadingEmail.set(false);
    }
  },

  /**
   * @param {string} emailId
   */
  async markAsRead(emailId) {
    // Add to loading set
    loadingEmailStates.update(set => {
      const newSet = new Set(set);
      newSet.add(emailId);
      return newSet;
    });

    try {
      await emailService.markAsRead(emailId);
      
      // Update emails store
      emails.update(/** @param {any[]} emailList */ emailList => 
        emailList.map(/** @param {any} email */ email => 
          email.id === emailId ? { ...email, is_read: true } : email
        )
      );

      // Update stats
      await this.loadStatsInBackground();
    } catch (error) {
      console.error('Error marking email as read:', error);
      throw error;
    } finally {
      // Remove from loading set
      loadingEmailStates.update(set => {
        const newSet = new Set(set);
        newSet.delete(emailId);
        return newSet;
      });
    }
  },

  /**
   * @param {string} emailId
   */
  async markAsUnread(emailId) {
    // Add to loading set
    loadingEmailStates.update(set => {
      const newSet = new Set(set);
      newSet.add(emailId);
      return newSet;
    });

    try {
      await emailService.markAsUnread(emailId);
      
      // Update emails store
      emails.update(/** @param {any[]} emailList */ emailList => 
        emailList.map(/** @param {any} email */ email => 
          email.id === emailId ? { ...email, is_read: false } : email
        )
      );

      // Update stats
      await this.loadStatsInBackground();
    } catch (error) {
      console.error('Error marking email as unread:', error);
      throw error;
    } finally {
      // Remove from loading set
      loadingEmailStates.update(set => {
        const newSet = new Set(set);
        newSet.delete(emailId);
        return newSet;
      });
    }
  },

  async checkForNewEmails(useBackgroundLoading = false) {
    try {
      const newEmailIds = await emailService.checkForNewEmails(useBackgroundLoading);
      
      if (newEmailIds.length > 0) {
        // Update stores with new data
        emails.set(emailService.getEmails());
        const stats = emailService.getStats();
        totalCount.set(stats.totalCount);
        unreadCount.set(stats.unreadCount);
      }
      
      return newEmailIds;
    } catch (error) {
      console.error('Error checking for new emails:', error);
      throw error;
    }
  }
};

// Navigation operations
export const navigationOperations = {
  backToInbox() {
    showEmailView.set(false);
    showSettings.set(false);
    selectedEmail.set(null);
    selectedConversation.set(null);
  },

  showSettingsView() {
    showSettings.set(true);
    showEmailView.set(false);
    selectedEmail.set(null);
    selectedConversation.set(null);
  },

  /**
   * @param {any} conversation
   */
  selectConversation(conversation) {
    selectedConversation.set(conversation);
    showEmailView.set(true);
    showSettings.set(false);
  },

  toggleViewMode() {
    viewMode.update(mode => mode === 'emails' ? 'conversations' : 'emails');
    selectedEmail.set(null);
    selectedConversation.set(null);
    showEmailView.set(false);
  }
};
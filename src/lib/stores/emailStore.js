import { writable, derived } from 'svelte/store';
import { emailService } from '../services/emailService.js';
import { useLoadingState, useSetLoadingState, LOADING_KEYS, createAsyncOperation, createAsyncOperationWithId } from '../utils/loading.js';

// Core email state
/** @type {import('svelte/store').Writable<any[]>} */
export const emails = writable([]);
export const totalCount = writable(0);
export const unreadCount = writable(0);

// Loading states using shared utilities
export const loading = useLoadingState(LOADING_KEYS.EMAIL_LIST);
export const loadingEmail = useLoadingState(LOADING_KEYS.EMAIL_CONTENT);
export const loadingEmailStates = useSetLoadingState(LOADING_KEYS.EMAIL_OPERATIONS);

// View state
export const viewMode = writable('emails'); // 'emails' | 'conversations'
export const showSingleMessageThreads = writable(false);

// Selected items
export const selectedEmail = writable(null);
export const selectedConversation = writable(null);

// UI state
export const showEmailView = writable(false);
export const showSettings = writable(false);

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

// Create async operation wrappers
const loadEmailsWithLoading = createAsyncOperation(loading);
const loadEmailContentWithLoading = createAsyncOperation(loadingEmail);

// Email operations
export const emailOperations = {
  async loadEmails() {
    return loadEmailsWithLoading(async () => {
      const emailData = await emailService.loadEmails();
      emails.set(emailData);
      return emailData;
    });
  },

  async loadEmailsInBackground() {
    try {
      const emailData = await emailService.loadEmailsInBackground();
      emails.set(emailData);
      return emailData;
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
      return stats;
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
      return stats;
    } catch (error) {
      console.error('Error loading stats in background:', error);
      throw error;
    }
  },

  /**
   * @param {string} emailId
   */
  async getEmailContent(emailId) {
    return loadEmailContentWithLoading(async () => {
      const emailContent = await emailService.getEmailContent(emailId);
      selectedEmail.set(emailContent);
      showEmailView.set(true);
      return emailContent;
    });
  },

  /**
   * @param {string} emailId
   * @param {boolean} isAutomatic - Whether this is an automatic marking
   */
  async markAsRead(emailId, isAutomatic = false) {
    // Use set-based loading for non-automatic operations
    if (!isAutomatic) {
      const markAsReadWithLoading = createAsyncOperationWithId(loadingEmailStates, emailId);
      return markAsReadWithLoading(async () => {
        await emailService.markAsRead(emailId, isAutomatic);
        
        // Update emails store
        emails.update(/** @param {any[]} emailList */ emailList => 
          emailList.map(/** @param {any} email */ email => 
            email.id === emailId ? { ...email, is_read: true } : email
          )
        );

        // Update stats
        await this.loadStatsInBackground();
      });
    } else {
      // For automatic marking, don't show loading indicator
      try {
        await emailService.markAsRead(emailId, isAutomatic);
        
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
      }
    }
  },

  /**
   * Schedule automatic read marking for an email
   * @param {string} emailId
   * @param {number} delayMs
   */
  scheduleAutoMarkAsRead(emailId, delayMs = 1500) {
    return emailService.scheduleAutoMarkAsRead(emailId, delayMs);
  },

  /**
   * Cancel automatic read marking
   * @param {number} timerId
   */
  cancelAutoMarkAsRead(timerId) {
    emailService.cancelAutoMarkAsRead(timerId);
  },

  /**
   * Send a reply to an email
   * @param {string} originalEmailId
   * @param {string} replyBody
   */
  async sendReply(originalEmailId, replyBody) {
    try {
      const result = await emailService.sendReply(originalEmailId, replyBody);
      
      // Optionally refresh emails to show the sent reply
      // await this.loadEmailsInBackground();
      
      return result;
    } catch (error) {
      console.error('Error sending reply:', error);
      throw error;
    }
  },

  /**
   * @param {string} emailId
   */
  async markAsUnread(emailId) {
    const markAsUnreadWithLoading = createAsyncOperationWithId(loadingEmailStates, emailId);
    return markAsUnreadWithLoading(async () => {
      await emailService.markAsUnread(emailId);
      
      // Update emails store
      emails.update(/** @param {any[]} emailList */ emailList => 
        emailList.map(/** @param {any} email */ email => 
          email.id === emailId ? { ...email, is_read: false } : email
        )
      );

      // Update stats
      await this.loadStatsInBackground();
    });
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
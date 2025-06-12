/**
 * Authentication Manager - Handles authentication state and operations
 * Extracted from EmailApp.svelte for better testability and separation of concerns
 * @fileoverview Provides type-safe authentication management with Tauri integration
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * @typedef {Object} AuthState
 * @property {boolean} isAuthenticated - Whether user is authenticated
 * @property {number | null} lastCheckTime - Timestamp of last auth check
 * @property {string | null} error - Last authentication error
 */

/**
 * @typedef {Object} AuthResult
 * @property {boolean} success - Whether authentication succeeded
 * @property {string | null} error - Error message if failed
 * @property {any} [data] - Additional data from auth operation
 */

/**
 * Authentication manager class for handling auth state and operations
 */
export class AuthManager {
  /** @type {AuthState} */
  #authState;

  /** @type {Array<(state: AuthState) => void>} */
  #listeners;

  constructor() {
    this.#authState = {
      isAuthenticated: false,
      lastCheckTime: null,
      error: null
    };
    this.#listeners = [];
  }

  /**
   * Get current authentication state
   * @returns {AuthState} Current auth state
   */
  getAuthState() {
    return { ...this.#authState };
  }

  /**
   * Check if user is currently authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    return this.#authState.isAuthenticated;
  }

  /**
   * Add a listener for auth state changes
   * @param {(state: AuthState) => void} listener - Callback for state changes
   * @returns {() => void} Unsubscribe function
   */
  addListener(listener) {
    this.#listeners.push(listener);
    return () => {
      const index = this.#listeners.indexOf(listener);
      if (index > -1) {
        this.#listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of state changes
   */
  #notifyListeners() {
    const state = this.getAuthState();
    this.#listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.warn('Error in auth state listener:', error);
      }
    });
  }

  /**
   * Update authentication state
   * @param {Partial<AuthState>} updates - State updates
   */
  #updateState(updates) {
    this.#authState = { ...this.#authState, ...updates };
    this.#notifyListeners();
  }

  /**
   * Check authentication status with Tauri backend
   * @returns {Promise<AuthResult>} Authentication result
   */
  async checkAuthStatus() {
    try {
      const isAuthenticated = await invoke('get_auth_status');
      
      this.#updateState({
        isAuthenticated: Boolean(isAuthenticated),
        lastCheckTime: Date.now(),
        error: null
      });

      return {
        success: true,
        error: null,
        data: { isAuthenticated: Boolean(isAuthenticated) }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error checking auth status:', errorMessage);
      
      this.#updateState({
        isAuthenticated: false,
        lastCheckTime: Date.now(),
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Handle successful authentication
   * @param {any} [authData] - Additional auth data
   * @returns {AuthResult} Result of handling auth success
   */
  handleAuthSuccess(authData) {
    try {
      this.#updateState({
        isAuthenticated: true,
        lastCheckTime: Date.now(),
        error: null
      });

      return {
        success: true,
        error: null,
        data: authData
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error handling auth success:', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Handle authentication failure
   * @param {string | Error} error - Authentication error
   * @returns {AuthResult} Result of handling auth failure
   */
  handleAuthFailure(error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    this.#updateState({
      isAuthenticated: false,
      lastCheckTime: Date.now(),
      error: errorMessage
    });

    return {
      success: false,
      error: errorMessage
    };
  }

  /**
   * Sign out user
   * @returns {Promise<AuthResult>} Sign out result
   */
  async signOut() {
    try {
      // Call Tauri signout if available
      if (typeof invoke === 'function') {
        try {
          await invoke('sign_out');
        } catch (error) {
          // Sign out command might not exist, continue with local signout
          console.warn('Tauri sign_out not available:', error);
        }
      }

      this.#updateState({
        isAuthenticated: false,
        lastCheckTime: Date.now(),
        error: null
      });

      return {
        success: true,
        error: null
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error during sign out:', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Reset authentication state
   */
  reset() {
    this.#updateState({
      isAuthenticated: false,
      lastCheckTime: null,
      error: null
    });
  }

  /**
   * Get time since last auth check in milliseconds
   * @returns {number | null} Time since last check or null if never checked
   */
  getTimeSinceLastCheck() {
    if (!this.#authState.lastCheckTime) {
      return null;
    }
    return Date.now() - this.#authState.lastCheckTime;
  }

  /**
   * Check if auth state is stale and needs refresh
   * @param {number} maxAgeMs - Maximum age in milliseconds before considering stale
   * @returns {boolean} Whether auth state is stale
   */
  isAuthStateStale(maxAgeMs = 5 * 60 * 1000) { // Default 5 minutes
    const timeSinceCheck = this.getTimeSinceLastCheck();
    return timeSinceCheck === null || timeSinceCheck > maxAgeMs;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.#listeners.length = 0;
    this.reset();
  }
}

/**
 * Initialize authentication manager with email operations
 * @param {any} emailOperations - Email operations from store
 * @returns {Promise<AuthResult>} Initialization result
 */
export async function initializeAuth(emailOperations) {
  const authManager = new AuthManager();
  
  try {
    const authResult = await authManager.checkAuthStatus();
    
    if (authResult.success && authManager.isAuthenticated()) {
      // Load initial data if authenticated
      if (emailOperations && typeof emailOperations.loadEmails === 'function') {
        await emailOperations.loadEmails();
      }
      if (emailOperations && typeof emailOperations.loadStats === 'function') {
        await emailOperations.loadStats();
      }
    }

    return {
      success: true,
      error: null,
      data: { authManager, isAuthenticated: authManager.isAuthenticated() }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error initializing authentication:', errorMessage);
    
    return {
      success: false,
      error: errorMessage,
      data: { authManager, isAuthenticated: false }
    };
  }
}

/**
 * Handle authentication success with email operations
 * @param {AuthManager} authManager - Auth manager instance
 * @param {any} emailOperations - Email operations from store
 * @returns {Promise<AuthResult>} Result of handling auth success
 */
export async function handleAuthSuccess(authManager, emailOperations) {
  try {
    const result = authManager.handleAuthSuccess();
    
    if (result.success) {
      // Load initial data after successful auth
      if (emailOperations && typeof emailOperations.loadEmails === 'function') {
        await emailOperations.loadEmails();
      }
      if (emailOperations && typeof emailOperations.loadStats === 'function') {
        await emailOperations.loadStats();
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error handling auth success:', errorMessage);
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Utility functions for auth-related operations
 */
export const AuthUtils = {
  /**
   * Check if error is auth-related
   * @param {any} error - Error to check
   * @returns {boolean} Whether error is auth-related
   */
  isAuthError(error) {
    if (!error) return false;
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const authErrorKeywords = ['auth', 'token', 'unauthorized', 'forbidden', 'login', 'credential'];
    
    return authErrorKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword)
    );
  },

  /**
   * Get user-friendly auth error message
   * @param {any} error - Error to format
   * @returns {string} User-friendly error message
   */
  formatAuthError(error) {
    if (!error) return 'Unknown authentication error';
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Network error - please check your connection and try again';
    }
    
    if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      return 'Authentication failed - please sign in again';
    }
    
    if (errorMessage.includes('token')) {
      return 'Your session has expired - please sign in again';
    }
    
    return 'Authentication error - please try again';
  }
};
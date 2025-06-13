import { vi } from 'vitest';

// Mock Tauri invoke function
export const invoke = vi.fn();

// Use mockEmailFactory from testHelpers.js instead of static data
// Example: import { mockEmailFactory } from '../utils/testHelpers.js';
// const mockEmails = [mockEmailFactory.unread(), mockEmailFactory.read()];

// Use mockEmailFactory from testHelpers.js for conversation data
// Example: import { mockEmailFactory } from '../utils/testHelpers.js';
// const mockConversations = [mockEmailFactory.conversation()];

// Mock auth responses
export const mockAuthSuccess = () => {
  invoke.mockResolvedValue(true);
};

export const mockAuthFailure = () => {
  invoke.mockRejectedValue(new Error('Authentication failed'));
};

// Mock email loading - use testHelpers.js factories
export const mockLoadEmails = () => {
  // Use mockEmailFactory instead of static data
  invoke.mockResolvedValue([]);
};

// Mock conversation loading - use testHelpers.js factories
export const mockLoadConversations = () => {
  // Use mockEmailFactory instead of static data
  invoke.mockResolvedValue([]);
};

// Reset all mocks
export const resetMocks = () => {
  invoke.mockReset();
};
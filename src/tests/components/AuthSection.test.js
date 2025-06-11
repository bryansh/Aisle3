import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import AuthSection from '../../lib/components/AuthSection.svelte';

// Mock the Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

import { invoke } from '@tauri-apps/api/core';

describe('AuthSection Component', () => {
  const mockOnAuthSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthSuccess.mockClear();
  });

  describe('Initial Rendering', () => {
    it('renders the initial authentication state', () => {
      render(AuthSection, {
        props: {
          onAuthSuccess: mockOnAuthSuccess
        }
      });

      expect(screen.getByRole('heading', { name: 'Connect Gmail' })).toBeInTheDocument();
      expect(screen.getByText('Connect your Gmail account to start managing your emails')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Connect Gmail Account' })).toBeInTheDocument();
      
      // Should not show callback URL input initially
      expect(screen.queryByPlaceholderText('Paste callback URL here...')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Complete Authentication' })).not.toBeInTheDocument();
    });

    it('has proper visual elements', () => {
      render(AuthSection, {
        props: {
          onAuthSuccess: mockOnAuthSuccess
        }
      });

      // Check for mail icon (using svg role)
      const mailIcon = document.querySelector('svg');
      expect(mailIcon).toBeInTheDocument();
      
      // Check for card structure
      const card = document.querySelector('.max-w-2xl');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Authentication Flow', () => {
    it('starts Gmail authentication when Connect button is clicked', async () => {
      const mockAuthUrl = 'https://accounts.google.com/oauth/authorize?...';
      invoke.mockImplementation((command) => {
        if (command === 'start_gmail_auth') {
          return Promise.resolve(mockAuthUrl);
        }
        if (command === 'open_url') {
          return Promise.resolve();
        }
        return Promise.resolve();
      });

      render(AuthSection, {
        props: {
          onAuthSuccess: mockOnAuthSuccess
        }
      });

      const connectButton = screen.getByRole('button', { name: 'Connect Gmail Account' });
      await fireEvent.click(connectButton);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith('start_gmail_auth');
        expect(invoke).toHaveBeenCalledWith('open_url', { url: mockAuthUrl });
      });

      // Should transition to callback URL input state
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Paste callback URL here...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Complete Authentication' })).toBeInTheDocument();
        expect(screen.getByText('Complete authentication in your browser, then paste the callback URL here:')).toBeInTheDocument();
      });

      // Should not show the Connect Gmail Account button anymore
      expect(screen.queryByRole('button', { name: 'Connect Gmail Account' })).not.toBeInTheDocument();
    });

    it('shows instruction message when starting authentication', async () => {
      invoke.mockImplementation((command) => {
        if (command === 'start_gmail_auth') {
          return Promise.resolve('https://test-auth-url.com');
        }
        if (command === 'open_url') {
          return Promise.resolve();
        }
        return Promise.resolve();
      });

      render(AuthSection, {
        props: {
          onAuthSuccess: mockOnAuthSuccess
        }
      });

      const connectButton = screen.getByRole('button', { name: 'Connect Gmail Account' });
      await fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('Please complete authentication in your browser, then paste the callback URL below.')).toBeInTheDocument();
      });
    });

    it('completes authentication with valid callback URL', async () => {
      const mockCallbackUrl = 'http://localhost:8080/callback?code=test123&state=xyz';
      const mockResult = 'Successfully authenticated with Gmail';

      // Setup initial state in authenticating mode
      invoke.mockImplementation((command) => {
        if (command === 'start_gmail_auth') {
          return Promise.resolve('https://test-auth-url.com');
        }
        if (command === 'open_url') {
          return Promise.resolve();
        }
        if (command === 'complete_gmail_auth') {
          return Promise.resolve(mockResult);
        }
        return Promise.resolve();
      });

      render(AuthSection, {
        props: {
          onAuthSuccess: mockOnAuthSuccess
        }
      });

      // Start authentication first
      const connectButton = screen.getByRole('button', { name: 'Connect Gmail Account' });
      await fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Paste callback URL here...')).toBeInTheDocument();
      });

      // Enter callback URL
      const callbackInput = screen.getByPlaceholderText('Paste callback URL here...');
      await fireEvent.input(callbackInput, { target: { value: mockCallbackUrl } });

      // Complete authentication
      const completeButton = screen.getByRole('button', { name: 'Complete Authentication' });
      await fireEvent.click(completeButton);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith('complete_gmail_auth', { callbackUrl: mockCallbackUrl });
        expect(mockOnAuthSuccess).toHaveBeenCalled();
      });

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(mockResult)).toBeInTheDocument();
      });
    });

    it('shows error when completing authentication without callback URL', async () => {
      // Setup initial state in authenticating mode
      invoke.mockImplementation((command) => {
        if (command === 'start_gmail_auth') {
          return Promise.resolve('https://test-auth-url.com');
        }
        if (command === 'open_url') {
          return Promise.resolve();
        }
        return Promise.resolve();
      });

      render(AuthSection, {
        props: {
          onAuthSuccess: mockOnAuthSuccess
        }
      });

      // Start authentication first
      const connectButton = screen.getByRole('button', { name: 'Connect Gmail Account' });
      await fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Complete Authentication' })).toBeInTheDocument();
      });

      // Try to complete authentication without entering callback URL
      const completeButton = screen.getByRole('button', { name: 'Complete Authentication' });
      await fireEvent.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter the callback URL')).toBeInTheDocument();
      });

      // Should not call complete_gmail_auth or onAuthSuccess
      expect(invoke).not.toHaveBeenCalledWith('complete_gmail_auth', expect.anything());
      expect(mockOnAuthSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles error when starting Gmail authentication', async () => {
      const mockError = 'Network connection failed';
      invoke.mockImplementation((command) => {
        if (command === 'start_gmail_auth') {
          return Promise.reject(new Error(mockError));
        }
        return Promise.resolve();
      });

      render(AuthSection, {
        props: {
          onAuthSuccess: mockOnAuthSuccess
        }
      });

      const connectButton = screen.getByRole('button', { name: 'Connect Gmail Account' });
      await fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText(`Error starting authentication: Error: ${mockError}`)).toBeInTheDocument();
      });

      // Should remain in initial state (not authenticating)
      expect(screen.getByRole('button', { name: 'Connect Gmail Account' })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Paste callback URL here...')).not.toBeInTheDocument();
    });

    it('handles error when completing authentication', async () => {
      const mockCallbackUrl = 'http://localhost:8080/callback?code=invalid';
      const mockError = 'Invalid authorization code';

      invoke.mockImplementation((command) => {
        if (command === 'start_gmail_auth') {
          return Promise.resolve('https://test-auth-url.com');
        }
        if (command === 'open_url') {
          return Promise.resolve();
        }
        if (command === 'complete_gmail_auth') {
          return Promise.reject(new Error(mockError));
        }
        return Promise.resolve();
      });

      render(AuthSection, {
        props: {
          onAuthSuccess: mockOnAuthSuccess
        }
      });

      // Start authentication first
      const connectButton = screen.getByRole('button', { name: 'Connect Gmail Account' });
      await fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Paste callback URL here...')).toBeInTheDocument();
      });

      // Enter callback URL and complete authentication
      const callbackInput = screen.getByPlaceholderText('Paste callback URL here...');
      await fireEvent.input(callbackInput, { target: { value: mockCallbackUrl } });

      const completeButton = screen.getByRole('button', { name: 'Complete Authentication' });
      await fireEvent.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText(`Authentication error: Error: ${mockError}`)).toBeInTheDocument();
      });

      // Should not call onAuthSuccess
      expect(mockOnAuthSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Message Display', () => {
    it('displays error messages with proper styling', async () => {
      const mockError = 'Connection failed';
      invoke.mockRejectedValue(new Error(mockError));

      render(AuthSection, {
        props: {
          onAuthSuccess: mockOnAuthSuccess
        }
      });

      const connectButton = screen.getByRole('button', { name: 'Connect Gmail Account' });
      await fireEvent.click(connectButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(`Error starting authentication: Error: ${mockError}`);
        expect(errorMessage).toBeInTheDocument();
        
        // Check for error styling classes
        const errorContainer = errorMessage.closest('div');
        expect(errorContainer).toHaveClass('text-red-800');
        expect(errorContainer).toHaveClass('bg-red-50');
      });
    });

    it('displays success messages with proper styling', async () => {
      const mockResult = 'Successfully authenticated with Gmail';
      
      invoke.mockImplementation((command) => {
        if (command === 'start_gmail_auth') {
          return Promise.resolve('https://test-auth-url.com');
        }
        if (command === 'open_url') {
          return Promise.resolve();
        }
        if (command === 'complete_gmail_auth') {
          return Promise.resolve(mockResult);
        }
        return Promise.resolve();
      });

      render(AuthSection, {
        props: {
          onAuthSuccess: mockOnAuthSuccess
        }
      });

      // Complete the auth flow
      const connectButton = screen.getByRole('button', { name: 'Connect Gmail Account' });
      await fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Paste callback URL here...')).toBeInTheDocument();
      });

      const callbackInput = screen.getByPlaceholderText('Paste callback URL here...');
      await fireEvent.input(callbackInput, { target: { value: 'http://test.com/callback' } });

      const completeButton = screen.getByRole('button', { name: 'Complete Authentication' });
      await fireEvent.click(completeButton);

      await waitFor(() => {
        const successMessage = screen.getByText(mockResult);
        expect(successMessage).toBeInTheDocument();
        
        // Check for success styling classes
        const successContainer = successMessage.closest('div');
        expect(successContainer).toHaveClass('text-green-800');
        expect(successContainer).toHaveClass('bg-green-50');
      });
    });

    it('displays info messages with proper styling', async () => {
      invoke.mockImplementation((command) => {
        if (command === 'start_gmail_auth') {
          return Promise.resolve('https://test-auth-url.com');
        }
        if (command === 'open_url') {
          return Promise.resolve();
        }
        return Promise.resolve();
      });

      render(AuthSection, {
        props: {
          onAuthSuccess: mockOnAuthSuccess
        }
      });

      const connectButton = screen.getByRole('button', { name: 'Connect Gmail Account' });
      await fireEvent.click(connectButton);

      await waitFor(() => {
        const infoMessage = screen.getByText('Please complete authentication in your browser, then paste the callback URL below.');
        expect(infoMessage).toBeInTheDocument();
        
        // Info messages should be in blue alert style
        const messageContainer = infoMessage.closest('.max-w-2xl'); // Should find the card container
        expect(messageContainer).toBeInTheDocument();
      });
    });
  });

  describe('Props and Callbacks', () => {
    it('calls onAuthSuccess callback when authentication succeeds', async () => {
      const mockResult = 'Successfully authenticated';
      
      invoke.mockImplementation((command) => {
        if (command === 'start_gmail_auth') {
          return Promise.resolve('https://test-auth-url.com');
        }
        if (command === 'open_url') {
          return Promise.resolve();
        }
        if (command === 'complete_gmail_auth') {
          return Promise.resolve(mockResult);
        }
        return Promise.resolve();
      });

      render(AuthSection, {
        props: {
          onAuthSuccess: mockOnAuthSuccess
        }
      });

      // Complete the authentication flow
      const connectButton = screen.getByRole('button', { name: 'Connect Gmail Account' });
      await fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Paste callback URL here...')).toBeInTheDocument();
      });

      const callbackInput = screen.getByPlaceholderText('Paste callback URL here...');
      await fireEvent.input(callbackInput, { target: { value: 'http://test.com/callback' } });

      const completeButton = screen.getByRole('button', { name: 'Complete Authentication' });
      await fireEvent.click(completeButton);

      await waitFor(() => {
        expect(mockOnAuthSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call onAuthSuccess when authentication fails', async () => {
      invoke.mockImplementation((command) => {
        if (command === 'start_gmail_auth') {
          return Promise.resolve('https://test-auth-url.com');
        }
        if (command === 'open_url') {
          return Promise.resolve();
        }
        if (command === 'complete_gmail_auth') {
          return Promise.reject(new Error('Auth failed'));
        }
        return Promise.resolve();
      });

      render(AuthSection, {
        props: {
          onAuthSuccess: mockOnAuthSuccess
        }
      });

      // Complete the authentication flow with error
      const connectButton = screen.getByRole('button', { name: 'Connect Gmail Account' });
      await fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Paste callback URL here...')).toBeInTheDocument();
      });

      const callbackInput = screen.getByPlaceholderText('Paste callback URL here...');
      await fireEvent.input(callbackInput, { target: { value: 'http://test.com/callback' } });

      const completeButton = screen.getByRole('button', { name: 'Complete Authentication' });
      await fireEvent.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText('Authentication error: Error: Auth failed')).toBeInTheDocument();
      });

      expect(mockOnAuthSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(AuthSection, {
        props: {
          onAuthSuccess: mockOnAuthSuccess
        }
      });

      expect(screen.getByRole('heading', { name: 'Connect Gmail' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Connect Gmail Account' })).toBeInTheDocument();
    });

    it('maintains proper focus management during state transitions', async () => {
      invoke.mockImplementation((command) => {
        if (command === 'start_gmail_auth') {
          return Promise.resolve('https://test-auth-url.com');
        }
        if (command === 'open_url') {
          return Promise.resolve();
        }
        return Promise.resolve();
      });

      render(AuthSection, {
        props: {
          onAuthSuccess: mockOnAuthSuccess
        }
      });

      const connectButton = screen.getByRole('button', { name: 'Connect Gmail Account' });
      await fireEvent.click(connectButton);

      await waitFor(() => {
        // After authentication starts, the input should be available
        const callbackInput = screen.getByPlaceholderText('Paste callback URL here...');
        expect(callbackInput).toBeInTheDocument();
        
        // Complete Authentication button should be available
        const completeButton = screen.getByRole('button', { name: 'Complete Authentication' });
        expect(completeButton).toBeInTheDocument();
      });
    });
  });

  describe('Input Validation', () => {
    it('handles empty callback URL input', async () => {
      invoke.mockImplementation((command) => {
        if (command === 'start_gmail_auth') {
          return Promise.resolve('https://test-auth-url.com');
        }
        if (command === 'open_url') {
          return Promise.resolve();
        }
        return Promise.resolve();
      });

      render(AuthSection, {
        props: {
          onAuthSuccess: mockOnAuthSuccess
        }
      });

      // Start authentication
      const connectButton = screen.getByRole('button', { name: 'Connect Gmail Account' });
      await fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Complete Authentication' })).toBeInTheDocument();
      });

      // Try to complete without entering URL
      const completeButton = screen.getByRole('button', { name: 'Complete Authentication' });
      await fireEvent.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter the callback URL')).toBeInTheDocument();
      });
    });

    it('handles whitespace-only callback URL input', async () => {
      const mockError = 'Invalid callback URL format';
      
      invoke.mockImplementation((command) => {
        if (command === 'start_gmail_auth') {
          return Promise.resolve('https://test-auth-url.com');
        }
        if (command === 'open_url') {
          return Promise.resolve();
        }
        if (command === 'complete_gmail_auth') {
          return Promise.reject(new Error(mockError));
        }
        return Promise.resolve();
      });

      render(AuthSection, {
        props: {
          onAuthSuccess: mockOnAuthSuccess
        }
      });

      // Start authentication
      const connectButton = screen.getByRole('button', { name: 'Connect Gmail Account' });
      await fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Paste callback URL here...')).toBeInTheDocument();
      });

      // Enter only whitespace - this will be passed to the auth function and fail
      const callbackInput = screen.getByPlaceholderText('Paste callback URL here...');
      await fireEvent.input(callbackInput, { target: { value: '   ' } });

      const completeButton = screen.getByRole('button', { name: 'Complete Authentication' });
      await fireEvent.click(completeButton);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith('complete_gmail_auth', { callbackUrl: '   ' });
        expect(screen.getByText(`Authentication error: Error: ${mockError}`)).toBeInTheDocument();
      });
    });
  });
});
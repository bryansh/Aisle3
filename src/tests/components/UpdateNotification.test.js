import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import UpdateNotification from '../../lib/components/UpdateNotification.svelte';

describe('UpdateNotification Component', () => {
  let defaultProps;

  beforeEach(() => {
    vi.useFakeTimers();
    defaultProps = {
      show: true,
      type: 'available',
      message: 'Update available: v1.2.3 is ready to install',
      onInstall: vi.fn(),
      onDismiss: vi.fn()
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render when show prop is true', () => {
      render(UpdateNotification, { props: defaultProps });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Update Available')).toBeInTheDocument();
      expect(screen.getByText(defaultProps.message)).toBeInTheDocument();
    });

    it('should not render when show prop is false', () => {
      render(UpdateNotification, { 
        props: { ...defaultProps, show: false }
      });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should render different notification types correctly', () => {
      const types = [
        { type: 'available', title: 'Update Available', iconBg: 'bg-blue-100' },
        { type: 'installing', title: 'Installing Update', iconBg: 'bg-yellow-100' },
        { type: 'complete', title: 'Update Complete', iconBg: 'bg-green-100' },
        { type: 'error', title: 'Update Error', iconBg: 'bg-red-100' }
      ];

      types.forEach(({ type, title }) => {
        const { unmount } = render(UpdateNotification, {
          props: { ...defaultProps, type }
        });

        expect(screen.getByText(title)).toBeInTheDocument();

        unmount();
      });
    });

    it('should display appropriate icons for each type', () => {
      const types = [
        { type: 'available', icon: '🔄' },
        { type: 'installing', icon: '⬇️' },
        { type: 'complete', icon: '✅' },
        { type: 'error', icon: '❌' }
      ];

      types.forEach(({ type, icon }) => {
        const { unmount } = render(UpdateNotification, {
          props: { ...defaultProps, type }
        });

        expect(screen.getByText(icon)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Actions', () => {
    it('should show Install Now button for available type', () => {
      render(UpdateNotification, { props: defaultProps });

      const installButton = screen.getByText('Install Now');
      expect(installButton).toBeInTheDocument();
    });

    it('should not show Install Now button if onInstall is not provided', () => {
      render(UpdateNotification, { 
        props: { ...defaultProps, onInstall: undefined }
      });

      expect(screen.queryByText('Install Now')).not.toBeInTheDocument();
    });

    it('should not show Install Now button for non-available types', () => {
      const types = ['installing', 'complete', 'error'];

      types.forEach(type => {
        const { unmount } = render(UpdateNotification, {
          props: { ...defaultProps, type }
        });

        expect(screen.queryByText('Install Now')).not.toBeInTheDocument();
        unmount();
      });
    });

    it('should call onInstall when Install Now is clicked', async () => {
      render(UpdateNotification, { props: defaultProps });

      const installButton = screen.getByText('Install Now');
      await fireEvent.click(installButton);

      expect(defaultProps.onInstall).toHaveBeenCalledOnce();
    });

    it('should call onDismiss when Dismiss button is clicked', async () => {
      render(UpdateNotification, { props: defaultProps });

      const dismissButton = screen.getByText('Dismiss');
      await fireEvent.click(dismissButton);

      expect(defaultProps.onDismiss).toHaveBeenCalledOnce();
    });

    it('should call onDismiss when close X button is clicked', async () => {
      render(UpdateNotification, { props: defaultProps });

      const closeButton = screen.getByLabelText('Close notification');
      await fireEvent.click(closeButton);

      expect(defaultProps.onDismiss).toHaveBeenCalledOnce();
    });
  });

  describe('Auto-dismiss', () => {
    it('should auto-dismiss complete notifications after 10 seconds', async () => {
      render(UpdateNotification, { 
        props: { ...defaultProps, type: 'complete' }
      });

      expect(defaultProps.onDismiss).not.toHaveBeenCalled();

      // Advance timer by 9 seconds - should not dismiss yet
      vi.advanceTimersByTime(9000);
      expect(defaultProps.onDismiss).not.toHaveBeenCalled();

      // Advance to 10 seconds - should dismiss
      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(defaultProps.onDismiss).toHaveBeenCalledOnce();
      });
    });

    it('should auto-dismiss error notifications after 10 seconds', async () => {
      render(UpdateNotification, { 
        props: { ...defaultProps, type: 'error' }
      });

      vi.advanceTimersByTime(10000);
      await waitFor(() => {
        expect(defaultProps.onDismiss).toHaveBeenCalledOnce();
      });
    });

    it('should not auto-dismiss available notifications', () => {
      render(UpdateNotification, { 
        props: { ...defaultProps, type: 'available' }
      });

      vi.advanceTimersByTime(20000); // 20 seconds
      expect(defaultProps.onDismiss).not.toHaveBeenCalled();
    });

    it('should not auto-dismiss installing notifications', () => {
      render(UpdateNotification, { 
        props: { ...defaultProps, type: 'installing' }
      });

      vi.advanceTimersByTime(20000); // 20 seconds
      expect(defaultProps.onDismiss).not.toHaveBeenCalled();
    });

    it('should clear timer when component unmounts', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      const { unmount } = render(UpdateNotification, { 
        props: { ...defaultProps, type: 'complete' }
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should reset timer when type changes', async () => {
      const { rerender } = render(UpdateNotification, { 
        props: { ...defaultProps, type: 'complete' }
      });

      // Advance timer partially
      vi.advanceTimersByTime(5000);
      
      // Change to error type
      await rerender({ 
        props: { ...defaultProps, type: 'error' }
      });

      // Original timer should be cleared, new one started
      vi.advanceTimersByTime(5000); // Total 10 seconds from first render
      expect(defaultProps.onDismiss).not.toHaveBeenCalled();

      // Advance 5 more seconds (10 seconds from type change)
      vi.advanceTimersByTime(5000);
      await waitFor(() => {
        expect(defaultProps.onDismiss).toHaveBeenCalledOnce();
      });
    });
  });

  describe('Content Display', () => {
    it('should show restart message for complete type', () => {
      render(UpdateNotification, { 
        props: { ...defaultProps, type: 'complete' }
      });

      expect(screen.getByText('Please restart the app to use the new version.')).toBeInTheDocument();
    });

    it('should not show restart message for other types', () => {
      const types = ['available', 'installing', 'error'];

      types.forEach(type => {
        const { unmount } = render(UpdateNotification, {
          props: { ...defaultProps, type }
        });

        expect(screen.queryByText('Please restart the app to use the new version.')).not.toBeInTheDocument();
        unmount();
      });
    });

    it('should handle long messages properly', () => {
      const longMessage = 'This is a very long update message that contains a lot of information about the update and what it includes and why you should install it right away';
      
      render(UpdateNotification, { 
        props: { ...defaultProps, message: longMessage }
      });

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle empty message', () => {
      render(UpdateNotification, { 
        props: { ...defaultProps, message: '' }
      });

      // Should still render the notification structure
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Update Available')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(UpdateNotification, { props: defaultProps });

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
      expect(alert).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have accessible close button', () => {
      render(UpdateNotification, { props: defaultProps });

      const closeButton = screen.getByLabelText('Close notification');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton.tagName).toBe('BUTTON');
    });

    it('should have accessible action buttons', () => {
      render(UpdateNotification, { props: defaultProps });

      const installButton = screen.getByText('Install Now');
      const dismissButton = screen.getByText('Dismiss');

      expect(installButton.tagName).toBe('BUTTON');
      expect(dismissButton.tagName).toBe('BUTTON');
    });
  });

  describe('Styling', () => {
    it('should apply correct color schemes for each type', () => {
      const colorSchemes = [
        { type: 'available', bgClass: 'bg-blue-50', borderClass: 'border-blue-200' },
        { type: 'installing', bgClass: 'bg-yellow-50', borderClass: 'border-yellow-200' },
        { type: 'complete', bgClass: 'bg-green-50', borderClass: 'border-green-200' },
        { type: 'error', bgClass: 'bg-red-50', borderClass: 'border-red-200' }
      ];

      colorSchemes.forEach(({ type, bgClass, borderClass }) => {
        const { unmount } = render(UpdateNotification, {
          props: { ...defaultProps, type }
        });

        const notification = screen.getByRole('alert').querySelector('.rounded-lg');
        expect(notification).toHaveClass(bgClass, borderClass);

        unmount();
      });
    });

    it('should position notification in top-right corner', () => {
      render(UpdateNotification, { props: defaultProps });

      const container = screen.getByRole('alert');
      expect(container).toHaveClass('fixed', 'top-4', 'right-4');
    });

    it('should have proper z-index for overlay', () => {
      render(UpdateNotification, { props: defaultProps });

      const container = screen.getByRole('alert');
      expect(container).toHaveClass('z-50');
    });

    it('should have transition classes for animations', () => {
      render(UpdateNotification, { props: defaultProps });

      const container = screen.getByRole('alert');
      expect(container).toHaveClass('transform', 'transition-all', 'duration-300', 'ease-in-out');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined message gracefully', () => {
      render(UpdateNotification, { 
        props: { ...defaultProps, message: undefined }
      });

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should handle unknown type gracefully', () => {
      render(UpdateNotification, { 
        props: { ...defaultProps, type: 'unknown' }
      });

      // Should render with default styling
      expect(screen.getByText('Update')).toBeInTheDocument(); // Default title
      expect(screen.getByText('ℹ️')).toBeInTheDocument(); // Default icon
    });

    it('should handle rapid show/hide toggles', async () => {
      const { rerender } = render(UpdateNotification, { props: defaultProps });

      // Rapidly toggle show prop
      await rerender({ props: { ...defaultProps, show: false } });
      await rerender({ props: { ...defaultProps, show: true } });
      await rerender({ props: { ...defaultProps, show: false } });
      await rerender({ props: { ...defaultProps, show: true } });

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should handle multiple dismiss calls gracefully', async () => {
      render(UpdateNotification, { props: defaultProps });

      const dismissButton = screen.getByText('Dismiss');
      
      // Click dismiss multiple times rapidly
      await fireEvent.click(dismissButton);
      await fireEvent.click(dismissButton);
      await fireEvent.click(dismissButton);

      // Should only call onDismiss once per click
      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(3);
    });
  });
});
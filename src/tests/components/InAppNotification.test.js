import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import InAppNotification from '../../lib/components/InAppNotification.svelte';

describe('InAppNotification', () => {
  let onCloseMock;

  beforeEach(() => {
    vi.useFakeTimers();
    onCloseMock = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render when show is true', () => {
      const { getByText } = render(InAppNotification, {
        props: {
          show: true,
          type: 'email',
          title: 'Test Title',
          message: 'Test Message',
          onClose: onCloseMock
        }
      });

      expect(getByText('Test Title')).toBeInTheDocument();
      expect(getByText('Test Message')).toBeInTheDocument();
    });

    it('should not render when show is false', () => {
      const { container } = render(InAppNotification, {
        props: {
          show: false,
          type: 'email',
          title: 'Test Title',
          message: 'Test Message',
          onClose: onCloseMock
        }
      });

      const notification = container.querySelector('[role="alert"]');
      expect(notification).toBeNull();
    });

    it('should display correct icon for email type', () => {
      const { getByText } = render(InAppNotification, {
        props: {
          show: true,
          type: 'email',
          title: 'Test Title',
          message: 'Test Message',
          onClose: onCloseMock
        }
      });

      expect(getByText('📧')).toBeInTheDocument();
    });

    it('should display correct styling for different notification types', () => {
      const types = [
        { type: 'email', expectedClass: 'bg-blue-50' },
        { type: 'update', expectedClass: 'bg-green-50' },
        { type: 'error', expectedClass: 'bg-red-50' },
        { type: 'info', expectedClass: 'bg-gray-50' }
      ];
      
      types.forEach(({ type, expectedClass }) => {
        const { container } = render(InAppNotification, {
          props: {
            show: true,
            type,
            title: 'Test Title',
            message: 'Test Message',
            onClose: onCloseMock
          }
        });

        const notification = container.querySelector('[role="alert"]');
        expect(notification).toBeInTheDocument();
        expect(notification).toHaveClass(expectedClass);
      });
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const { getByRole } = render(InAppNotification, {
        props: {
          show: true,
          type: 'email',
          title: 'Test Title',
          message: 'Test Message',
          onClose: onCloseMock
        }
      });

      const closeButton = getByRole('button');
      await fireEvent.click(closeButton);

      expect(onCloseMock).toHaveBeenCalledOnce();
    });

    it('should have correct close button behavior', async () => {
      const { getByRole } = render(InAppNotification, {
        props: {
          show: true,
          type: 'email',
          title: 'Test Title',
          message: 'Test Message',
          onClose: onCloseMock
        }
      });

      const closeButton = getByRole('button');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label', 'Close notification');
    });
  });

  describe('Auto-close Behavior', () => {
    it('should auto-close after default delay when autoClose is true', async () => {
      render(InAppNotification, {
        props: {
          show: true,
          type: 'email',
          title: 'Test Title',
          message: 'Test Message',
          autoClose: true,
          onClose: onCloseMock
        }
      });

      // Auto-close should not trigger immediately
      expect(onCloseMock).not.toHaveBeenCalled();

      // Advance timer by default delay (8000ms)
      vi.advanceTimersByTime(8000);

      expect(onCloseMock).toHaveBeenCalledOnce();
    });

    it('should auto-close after custom delay', async () => {
      render(InAppNotification, {
        props: {
          show: true,
          type: 'email',
          title: 'Test Title',
          message: 'Test Message',
          autoClose: true,
          autoCloseDelay: 3000,
          onClose: onCloseMock
        }
      });

      // Should not close before custom delay
      vi.advanceTimersByTime(2000);
      expect(onCloseMock).not.toHaveBeenCalled();

      // Should close after custom delay
      vi.advanceTimersByTime(1000);
      expect(onCloseMock).toHaveBeenCalledOnce();
    });

    it('should not auto-close when autoClose is false', async () => {
      render(InAppNotification, {
        props: {
          show: true,
          type: 'email',
          title: 'Test Title',
          message: 'Test Message',
          autoClose: false,
          onClose: onCloseMock
        }
      });

      // Advance timer past default delay
      vi.advanceTimersByTime(10000);

      expect(onCloseMock).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      const { container } = render(InAppNotification, {
        props: {
          show: true,
          type: 'email',
          title: 'Test Title',
          message: 'Test Message',
          onClose: onCloseMock
        }
      });

      const notification = container.querySelector('[role="alert"]');
      expect(notification).toHaveAttribute('role', 'alert');
      expect(notification).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have accessible close button', () => {
      const { getByRole } = render(InAppNotification, {
        props: {
          show: true,
          type: 'email',
          title: 'Test Title',
          message: 'Test Message',
          onClose: onCloseMock
        }
      });

      const closeButton = getByRole('button');
      expect(closeButton).toHaveAttribute('aria-label', 'Close notification');
    });
  });

  describe('Content Handling', () => {
    it('should handle very long titles gracefully', () => {
      const longTitle = 'A'.repeat(200);
      const { getByText } = render(InAppNotification, {
        props: {
          show: true,
          type: 'email',
          title: longTitle,
          message: 'Test Message',
          onClose: onCloseMock
        }
      });

      expect(getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle very long messages gracefully', () => {
      const longMessage = 'A'.repeat(500);
      const { getByText } = render(InAppNotification, {
        props: {
          show: true,
          type: 'email',
          title: 'Test Title',
          message: longMessage,
          onClose: onCloseMock
        }
      });

      expect(getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle empty title and message', () => {
      const { container } = render(InAppNotification, {
        props: {
          show: true,
          type: 'email',
          title: '',
          message: '',
          onClose: onCloseMock
        }
      });

      expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
    });
  });

  describe('Icon Display', () => {
    it('should show correct icons for different types', () => {
      const iconMap = {
        'email': '📧',
        'update': '🔄', 
        'error': '❌',
        'info': 'ℹ️'
      };

      Object.entries(iconMap).forEach(([type, expectedIcon]) => {
        const { getByText } = render(InAppNotification, {
          props: {
            show: true,
            type,
            title: 'Test Title',
            message: 'Test Message',
            onClose: onCloseMock
          }
        });

        expect(getByText(expectedIcon)).toBeInTheDocument();
      });
    });
  });

  describe('Animation Mode', () => {
    it('should apply correct CSS classes for default animation mode', () => {
      const { container } = render(InAppNotification, {
        props: {
          show: true,
          type: 'email',
          title: 'Test Title',
          message: 'Test Message',
          animationMode: 'default',
          onClose: onCloseMock
        }
      });

      const notification = container.querySelector('.animate-in');
      expect(notification).toBeInTheDocument();
      expect(notification).not.toHaveClass('animate-in-quick');
    });

    it('should apply correct CSS classes for quick animation mode', () => {
      const { container } = render(InAppNotification, {
        props: {
          show: true,
          type: 'email',
          title: 'Test Title',
          message: 'Test Message',
          animationMode: 'quick',
          onClose: onCloseMock
        }
      });

      const notification = container.querySelector('.animate-in-quick');
      expect(notification).toBeInTheDocument();
      expect(notification).not.toHaveClass('animate-in');
    });
  });

  describe('Timeout Management', () => {
    it('should clear timeout on manual close', async () => {
      const { getByRole } = render(InAppNotification, {
        props: {
          show: true,
          type: 'email',
          title: 'Test Title',
          message: 'Test Message',
          autoClose: true,
          autoCloseDelay: 5000,
          onClose: onCloseMock
        }
      });

      // Click close button before auto-close
      const closeButton = getByRole('button');
      await fireEvent.click(closeButton);

      expect(onCloseMock).toHaveBeenCalledOnce();

      // Advance timer past auto-close delay
      vi.advanceTimersByTime(6000);

      // Should still only be called once (manual close, not auto-close)
      expect(onCloseMock).toHaveBeenCalledOnce();
    });
  });
});
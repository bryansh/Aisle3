import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import LoadingSpinner from '../../lib/components/LoadingSpinner.svelte';

describe('LoadingSpinner', () => {
  it('should render loading text', () => {
    render(LoadingSpinner);

    expect(screen.getByText('Loading emails...')).toBeInTheDocument();
  });

  it('should render spinner component', () => {
    render(LoadingSpinner);

    // The Spinner component from flowbite-svelte should be rendered
    // We can check for the container structure
    const container = document.querySelector('.text-center.py-20');
    expect(container).toBeInTheDocument();
  });

  it('should have correct styling classes', () => {
    render(LoadingSpinner);

    const container = document.querySelector('.text-center.py-20');
    expect(container).toHaveClass('text-center', 'py-20');

    const loadingText = screen.getByText('Loading emails...');
    expect(loadingText).toHaveClass('text-gray-600', 'text-lg');
  });

  it('should be accessible', () => {
    render(LoadingSpinner);

    const loadingText = screen.getByText('Loading emails...');
    expect(loadingText).toBeInTheDocument();
    
    // The text provides context for screen readers
    expect(loadingText.tagName).toBe('P');
  });

  it('should render without any props', () => {
    // Test that component renders successfully without requiring props
    expect(() => render(LoadingSpinner)).not.toThrow();
  });
});
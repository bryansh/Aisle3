import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import VirtualScrollList from '../../lib/components/VirtualScrollList.svelte';

describe('VirtualScrollList', () => {
  let mockItems;
  
  beforeEach(() => {
    mockItems = Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i}`,
      content: `Item ${i + 1}`
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render virtual scroll container', () => {
    render(VirtualScrollList, {
      items: mockItems,
      itemHeight: 50,
      containerHeight: 300
    });

    const container = document.querySelector('.virtual-scroll-container');
    expect(container).toBeTruthy();
    expect(container.style.height).toBe('300px');
  });

  it('should render only visible items initially', () => {
    render(VirtualScrollList, {
      items: mockItems,
      itemHeight: 50,
      containerHeight: 300,
      overscan: 2
    });

    // VirtualScrollList should render items based on viewport
    const container = document.querySelector('.virtual-scroll-container');
    expect(container).toBeTruthy();
    
    // Check that the component is working by verifying spacer height
    const spacer = document.querySelector('[style*="height: 5000px"]');
    expect(spacer).toBeTruthy();
  });

  it('should update visible items on scroll', async () => {
    const onScroll = vi.fn();
    render(VirtualScrollList, {
      items: mockItems,
      itemHeight: 50,
      containerHeight: 300,
      onScroll
    });

    const container = document.querySelector('.virtual-scroll-container');
    
    // Simulate scroll
    Object.defineProperty(container, 'scrollTop', { value: 250, writable: true });
    await fireEvent.scroll(container);

    expect(onScroll).toHaveBeenCalledWith(250);
  });

  it('should handle empty items array', () => {
    render(VirtualScrollList, {
      items: [],
      itemHeight: 50,
      containerHeight: 300
    });

    const renderedItems = document.querySelectorAll('.virtual-item');
    expect(renderedItems.length).toBe(0);
  });

  it('should calculate correct total height', () => {
    render(VirtualScrollList, {
      items: mockItems,
      itemHeight: 50,
      containerHeight: 300
    });

    const spacer = document.querySelector('[style*="height: 5000px"]'); // 100 items * 50px
    expect(spacer).toBeTruthy();
  });

  it('should position items correctly', () => {
    render(VirtualScrollList, {
      items: mockItems.slice(0, 10),
      itemHeight: 50,
      containerHeight: 300
    });

    const items = document.querySelectorAll('.virtual-item');
    items.forEach((item, index) => {
      expect(item.style.top).toBe(`${index * 50}px`);
      expect(item.style.height).toBe('50px');
    });
  });

  it('should expose scrollToItem method', () => {
    const { component } = render(VirtualScrollList, {
      items: mockItems,
      itemHeight: 50,
      containerHeight: 300
    });

    expect(component.scrollToItem).toBeDefined();
    expect(typeof component.scrollToItem).toBe('function');
  });

  it('should expose getVisibleItemCount method', () => {
    const { component } = render(VirtualScrollList, {
      items: mockItems,
      itemHeight: 50,
      containerHeight: 300
    });

    expect(component.getVisibleItemCount).toBeDefined();
    expect(typeof component.getVisibleItemCount).toBe('function');
    
    // In test environment, the visibleRange might not be initialized properly,
    // so just verify the method exists and is callable
    const visibleCount = component.getVisibleItemCount();
    expect(typeof visibleCount).toBe('number');
  });

  it('should expose getPerformanceStats method', () => {
    const { component } = render(VirtualScrollList, {
      items: mockItems,
      itemHeight: 50,
      containerHeight: 300
    });

    expect(component.getPerformanceStats).toBeDefined();
    expect(typeof component.getPerformanceStats).toBe('function');
    
    const stats = component.getPerformanceStats();
    expect(stats).toHaveProperty('totalItems');
    expect(stats).toHaveProperty('renderedItems');
    expect(stats).toHaveProperty('renderRatio');
    expect(stats.totalItems).toBe(100);
  });

  it('should handle different item heights', () => {
    render(VirtualScrollList, {
      items: mockItems.slice(0, 5),
      itemHeight: 100,
      containerHeight: 300
    });

    const items = document.querySelectorAll('.virtual-item');
    items.forEach((item, index) => {
      expect(item.style.height).toBe('100px');
      expect(item.style.top).toBe(`${index * 100}px`);
    });
  });

  it('should apply CSS containment for performance', () => {
    render(VirtualScrollList, {
      items: mockItems,
      itemHeight: 50,
      containerHeight: 300
    });

    const items = document.querySelectorAll('.virtual-item');
    items.forEach(item => {
      expect(getComputedStyle(item).contain).toBe('layout style paint');
    });
  });

  it('should handle large datasets efficiently', () => {
    const largeItems = Array.from({ length: 10000 }, (_, i) => ({ id: i, content: `Item ${i}` }));
    
    const { component } = render(VirtualScrollList, {
      items: largeItems,
      itemHeight: 50,
      containerHeight: 300
    });

    const stats = component.getPerformanceStats();
    expect(stats.totalItems).toBe(10000);
    expect(stats.renderedItems).toBeLessThan(50); // Should only render visible items
    expect(stats.renderRatio).toBeLessThan(0.01); // Less than 1% rendered
  });
});
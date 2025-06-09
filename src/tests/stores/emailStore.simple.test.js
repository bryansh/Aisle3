import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { writable } from 'svelte/store';

describe('Simple Store Tests', () => {
  let testStore;

  beforeEach(() => {
    testStore = writable(0);
  });

  it('creates a writable store', () => {
    expect(get(testStore)).toBe(0);
  });

  it('updates store value', () => {
    testStore.set(5);
    expect(get(testStore)).toBe(5);
  });

  it('updates store with function', () => {
    testStore.set(10);
    testStore.update(n => n + 5);
    expect(get(testStore)).toBe(15);
  });
});
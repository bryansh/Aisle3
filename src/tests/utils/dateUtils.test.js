import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  formatEmailDate,
  formatEmailHeaderDate,
  getRelativeTime,
  isToday,
  isThisWeek,
  sortEmailsByDate
} from '../../lib/utils/dateUtils.js';

describe('Date Utils', () => {
  let mockNow;

  beforeEach(() => {
    // Mock current time to be 2023-12-15 12:00:00
    mockNow = new Date('2023-12-15T12:00:00Z');
    vi.setSystemTime(mockNow);
  });

  describe('formatEmailDate', () => {
    it('returns empty string for null/undefined input', () => {
      expect(formatEmailDate(null)).toBe('');
      expect(formatEmailDate(undefined)).toBe('');
      expect(formatEmailDate('')).toBe('');
    });

    it('returns empty string for invalid date', () => {
      expect(formatEmailDate('invalid-date')).toBe('');
      expect(formatEmailDate('not-a-date')).toBe('');
    });

    it('formats today dates as time only', () => {
      const todayMorning = new Date('2023-12-15T09:30:00Z');
      const result = formatEmailDate(todayMorning);
      expect(result).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/);
    });

    it('formats yesterday as "Yesterday"', () => {
      const yesterday = new Date('2023-12-14T15:30:00Z');
      expect(formatEmailDate(yesterday)).toBe('Yesterday');
    });

    it('formats this week as day name', () => {
      const thisWeek = new Date('2023-12-13T10:00:00Z'); // Wednesday if Friday is current
      const result = formatEmailDate(thisWeek);
      expect(result).toMatch(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/);
    });

    it('formats this year as month and day', () => {
      const thisYear = new Date('2023-06-15T10:00:00Z');
      const result = formatEmailDate(thisYear);
      expect(result).toMatch(/^[A-Za-z]{3}\s\d{1,2}$/); // e.g., "Jun 15"
    });

    it('formats older dates with full year', () => {
      const oldDate = new Date('2022-06-15T10:00:00Z');
      const result = formatEmailDate(oldDate);
      expect(result).toMatch(/^[A-Za-z]{3}\s\d{1,2},\s\d{4}$/); // e.g., "Jun 15, 2022"
    });

    it('handles Date objects and date strings', () => {
      const dateObj = new Date('2023-12-14T15:30:00Z');
      const dateStr = '2023-12-14T15:30:00Z';
      
      expect(formatEmailDate(dateObj)).toBe(formatEmailDate(dateStr));
    });
  });

  describe('formatEmailHeaderDate', () => {
    it('returns empty string for invalid input', () => {
      expect(formatEmailHeaderDate(null)).toBe('');
      expect(formatEmailHeaderDate('invalid')).toBe('');
    });

    it('formats date as full readable format', () => {
      const date = new Date('2023-12-15T14:30:00Z');
      const result = formatEmailHeaderDate(date);
      
      // Should include weekday, full month, day, year, and time
      expect(result).toMatch(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/);
      expect(result).toMatch(/\d{4}/); // Year
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Time
    });
  });

  describe('getRelativeTime', () => {
    it('returns empty string for invalid input', () => {
      expect(getRelativeTime(null)).toBe('');
      expect(getRelativeTime('invalid')).toBe('');
    });

    it('returns "Just now" for very recent times', () => {
      const recent = new Date(mockNow.getTime() - 30000); // 30 seconds ago
      expect(getRelativeTime(recent)).toBe('Just now');
    });

    it('returns "Just now" for future dates', () => {
      const future = new Date(mockNow.getTime() + 60000); // 1 minute future
      expect(getRelativeTime(future)).toBe('Just now');
    });

    it('formats minutes correctly', () => {
      const fiveMinutesAgo = new Date(mockNow.getTime() - 5 * 60 * 1000);
      expect(getRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
      
      const oneMinuteAgo = new Date(mockNow.getTime() - 60 * 1000);
      expect(getRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
    });

    it('formats hours correctly', () => {
      const twoHoursAgo = new Date(mockNow.getTime() - 2 * 60 * 60 * 1000);
      expect(getRelativeTime(twoHoursAgo)).toBe('2 hours ago');
      
      const oneHourAgo = new Date(mockNow.getTime() - 60 * 60 * 1000);
      expect(getRelativeTime(oneHourAgo)).toBe('1 hour ago');
    });

    it('formats days correctly', () => {
      const threeDaysAgo = new Date(mockNow.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(getRelativeTime(threeDaysAgo)).toBe('3 days ago');
      
      const oneDayAgo = new Date(mockNow.getTime() - 24 * 60 * 60 * 1000);
      expect(getRelativeTime(oneDayAgo)).toBe('1 day ago');
    });

    it('falls back to formatted date for very old dates', () => {
      const veryOld = new Date(mockNow.getTime() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
      const result = getRelativeTime(veryOld);
      expect(result).not.toMatch(/ago$/);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('isToday', () => {
    it('returns false for invalid input', () => {
      expect(isToday(null)).toBe(false);
      expect(isToday('invalid')).toBe(false);
    });

    it('returns true for today dates', () => {
      // Use the same date as mockNow but different times
      const todayMorning = new Date('2023-12-15T09:00:00Z');
      const todayEvening = new Date('2023-12-15T15:00:00Z');
      
      expect(isToday(todayMorning)).toBe(true);
      expect(isToday(todayEvening)).toBe(true);
    });

    it('returns false for non-today dates', () => {
      const yesterday = new Date('2023-12-14T12:00:00Z');
      const tomorrow = new Date('2023-12-16T12:00:00Z');
      
      expect(isToday(yesterday)).toBe(false);
      expect(isToday(tomorrow)).toBe(false);
    });

    it('handles date strings', () => {
      expect(isToday('2023-12-15T12:00:00Z')).toBe(true);
      expect(isToday('2023-12-14T12:00:00Z')).toBe(false);
    });
  });

  describe('isThisWeek', () => {
    it('returns false for invalid input', () => {
      expect(isThisWeek(null)).toBe(false);
      expect(isThisWeek('invalid')).toBe(false);
    });

    it('returns true for dates within the last 7 days', () => {
      const threeDaysAgo = new Date('2023-12-12T12:00:00Z');
      const today = new Date('2023-12-15T12:00:00Z');
      
      expect(isThisWeek(threeDaysAgo)).toBe(true);
      expect(isThisWeek(today)).toBe(true);
    });

    it('returns false for dates over 7 days ago', () => {
      const eightDaysAgo = new Date('2023-12-07T12:00:00Z');
      expect(isThisWeek(eightDaysAgo)).toBe(false);
    });

    it('returns false for future dates', () => {
      const tomorrow = new Date('2023-12-16T12:00:00Z');
      expect(isThisWeek(tomorrow)).toBe(false);
    });
  });

  describe('sortEmailsByDate', () => {
    const mockEmails = [
      { id: '1', date: '2023-12-10T10:00:00Z', subject: 'Old email' },
      { id: '2', date: '2023-12-15T10:00:00Z', subject: 'New email' },
      { id: '3', date: '2023-12-12T10:00:00Z', subject: 'Medium email' },
      { id: '4', date: null, subject: 'No date email' }
    ];

    it('sorts emails by date (newest first)', () => {
      const sorted = sortEmailsByDate(mockEmails);
      
      expect(sorted[0].id).toBe('2'); // Newest
      expect(sorted[1].id).toBe('3'); // Medium
      expect(sorted[2].id).toBe('1'); // Oldest
      expect(sorted[3].id).toBe('4'); // No date (treated as epoch)
    });

    it('does not mutate the original array', () => {
      const original = [...mockEmails];
      sortEmailsByDate(mockEmails);
      
      expect(mockEmails).toEqual(original);
    });

    it('works with custom date field', () => {
      const emailsWithCustomField = [
        { id: '1', timestamp: '2023-12-10T10:00:00Z' },
        { id: '2', timestamp: '2023-12-15T10:00:00Z' }
      ];
      
      const sorted = sortEmailsByDate(emailsWithCustomField, 'timestamp');
      expect(sorted[0].id).toBe('2'); // Newer timestamp first
    });

    it('handles empty array', () => {
      expect(sortEmailsByDate([])).toEqual([]);
    });

    it('handles emails with invalid dates', () => {
      const emailsWithInvalidDates = [
        { id: '1', date: 'invalid-date' },
        { id: '2', date: '2023-12-15T10:00:00Z' }
      ];
      
      const sorted = sortEmailsByDate(emailsWithInvalidDates);
      expect(sorted).toHaveLength(2);
      expect(sorted[0].id).toBe('2'); // Valid date should come first
    });
  });
});
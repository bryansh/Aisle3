/**
 * Utility functions for date formatting and manipulation
 * Used across email components for consistent date display
 */

/**
 * Formats email date for display in email lists and headers
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {string} Formatted date string
 */
export function formatEmailDate(dateInput) {
  if (!dateInput) return '';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  // Handle invalid dates
  if (isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  
  // Check if it's today by comparing date strings
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }
  
  // Check if it's yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // This week: Show day name
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  }
  
  // This year: Show month and day
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  // Older: Show full date
  return date.toLocaleDateString([], { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Formats date for email viewer header (full format)
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {string} Full formatted date string
 */
export function formatEmailHeaderDate(dateInput) {
  if (!dateInput) return '';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get relative time description (e.g., "2 hours ago", "3 days ago")
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {string} Relative time string
 */
export function getRelativeTime(dateInput) {
  if (!dateInput) return '';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  // Future dates
  if (diffMs < 0) {
    return 'Just now';
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    // For older dates, fall back to formatted date
    return formatEmailDate(dateInput);
  }
}

/**
 * Check if a date is today
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {boolean} True if date is today
 */
export function isToday(dateInput) {
  if (!dateInput) return false;

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  
  // Compare year, month, and day
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate();
}

/**
 * Check if a date is this week
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {boolean} True if date is within current week
 */
export function isThisWeek(dateInput) {
  if (!dateInput) return false;

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays < 7;
}

/**
 * Sort emails by date (newest first)
 * @param {Array} emails - Array of email objects with date property
 * @param {string} dateField - Field name containing the date (default: 'date')
 * @returns {Array} Sorted array of emails
 */
export function sortEmailsByDate(emails, dateField = 'date') {
  return [...emails].sort((a, b) => {
    const dateA = new Date(a[dateField] || 0);
    const dateB = new Date(b[dateField] || 0);
    
    // Handle invalid dates - put them at the end
    const isDateAValid = !isNaN(dateA.getTime()) && a[dateField];
    const isDateBValid = !isNaN(dateB.getTime()) && b[dateField];
    
    if (!isDateAValid && !isDateBValid) return 0;
    if (!isDateAValid) return 1; // A goes to end
    if (!isDateBValid) return -1; // B goes to end
    
    return dateB.getTime() - dateA.getTime(); // Newest first
  });
}
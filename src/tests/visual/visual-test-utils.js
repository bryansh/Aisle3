/**
 * Visual Testing Utilities
 * Helper functions for visual regression testing
 */

/**
 * Mock data generators for consistent visual testing
 */
export const mockDataGenerators = {
  /**
   * Generate mock email data
   * @param {number} count - Number of emails to generate
   * @param {object} options - Generation options
   * @returns {Array} Array of mock emails
   */
  generateEmails(count = 10, options = {}) {
    const {
      readRatio = 0.3,
      subjectPrefix = 'Test Email',
      senderDomain = 'example.com',
      includeHtml = false
    } = options;

    return Array.from({ length: count }, (_, i) => ({
      id: `email-${i}`,
      thread_id: `thread-${Math.floor(i / 3)}`, // Group emails into threads
      subject: `${subjectPrefix} ${i + 1}`,
      sender: `sender${i + 1}@${senderDomain}`,
      snippet: `This is a sample email snippet for testing purposes. Email number ${i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
      body: includeHtml 
        ? `<p>This is the <strong>email body</strong> for email ${i + 1}.</p><p>With some <em>formatting</em> and <a href="#">links</a>.</p>`
        : `This is the plain text body for email ${i + 1}.`,
      is_read: Math.random() < readRatio,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(), // 1 hour apart
      attachments: i % 5 === 0 ? [`attachment-${i}.pdf`] : []
    }));
  },

  /**
   * Generate mock conversation data
   * @param {number} count - Number of conversations to generate
   * @returns {Array} Array of mock conversations
   */
  generateConversations(count = 5) {
    return Array.from({ length: count }, (_, i) => ({
      id: `conversation-${i}`,
      subject: `Conversation ${i + 1}`,
      participants: [`user${i}@example.com`, `user${i + 1}@example.com`],
      messageCount: Math.floor(Math.random() * 10) + 1,
      lastMessageTime: new Date(Date.now() - i * 7200000).toISOString(),
      hasUnread: Math.random() > 0.6
    }));
  },

  /**
   * Generate mock user settings
   * @returns {object} Mock settings object
   */
  generateSettings() {
    return {
      autoPollingEnabled: true,
      pollingIntervalSeconds: 30,
      autoMarkReadEnabled: true,
      autoMarkReadDelay: 1500,
      theme: 'light',
      emailsPerPage: 50,
      useVirtualization: true
    };
  }
};

/**
 * Page setup utilities for consistent testing
 */
export const pageSetup = {
  /**
   * Disable animations for consistent screenshots
   * @param {import('@playwright/test').Page} page - Playwright page
   */
  async disableAnimations(page) {
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
        
        .animate-spin {
          animation: none !important;
        }
        
        .transition-all,
        .transition-colors,
        .transition-opacity {
          transition: none !important;
        }
      `
    });
  },

  /**
   * Set up consistent viewport and page state
   * @param {import('@playwright/test').Page} page - Playwright page
   * @param {object} options - Setup options
   */
  async setupPage(page, options = {}) {
    const {
      viewport = { width: 1280, height: 720 },
      disableAnimations = true,
      mockData = null,
      waitForSelector = null
    } = options;

    // Set viewport
    await page.setViewportSize(viewport);

    // Disable animations if requested
    if (disableAnimations) {
      await this.disableAnimations(page);
    }

    // Inject mock data if provided
    if (mockData) {
      await page.evaluate((data) => {
        window.mockAuthData = data;
      }, mockData);
    }

    // Wait for specific selector if provided
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }
  },

  /**
   * Create mock authentication state
   * @param {object} options - Mock options
   * @returns {object} Mock auth state
   */
  createMockAuthState(options = {}) {
    const {
      isAuthenticated = true,
      emails = [],
      conversations = [],
      selectedEmail = null,
      showEmailView = false,
      showSettings = false,
      loading = false,
      error = null,
      viewMode = 'emails'
    } = options;

    return {
      isAuthenticated,
      emails,
      conversations,
      selectedEmail,
      showEmailView,
      showSettings,
      loading,
      error,
      viewMode,
      totalCount: emails.length,
      unreadCount: emails.filter(e => !e.is_read).length
    };
  }
};

/**
 * Screenshot comparison utilities
 */
export const screenshotUtils = {
  /**
   * Default screenshot options for consistency
   */
  defaultOptions: {
    animations: 'disabled',
    threshold: 0.2,
    maxDiffPixels: 100
  },

  /**
   * Take a full page screenshot with default options
   * @param {import('@playwright/test').Page} page - Playwright page
   * @param {string} name - Screenshot name
   * @param {object} options - Additional options
   * @returns {Promise} Screenshot promise
   */
  async takeFullPageScreenshot(page, name, options = {}) {
    return page.screenshot({
      ...this.defaultOptions,
      fullPage: true,
      path: `test-results/screenshots/${name}`,
      ...options
    });
  },

  /**
   * Take an element screenshot with default options
   * @param {import('@playwright/test').Locator} element - Element locator
   * @param {string} name - Screenshot name
   * @param {object} options - Additional options
   * @returns {Promise} Screenshot promise
   */
  async takeElementScreenshot(element, name, options = {}) {
    return element.screenshot({
      ...this.defaultOptions,
      path: `test-results/screenshots/${name}`,
      ...options
    });
  },

  /**
   * Compare screenshots with tolerance
   * @param {import('@playwright/test').Page} page - Playwright page
   * @param {string} name - Screenshot name
   * @param {object} options - Comparison options
   * @returns {Promise} Comparison promise
   */
  async compareScreenshot(page, name, options = {}) {
    const { expect } = await import('@playwright/test');
    
    return expect(page).toHaveScreenshot(name, {
      ...this.defaultOptions,
      ...options
    });
  }
};

/**
 * Test data scenarios for different UI states
 */
export const testScenarios = {
  /**
   * Empty state scenarios
   */
  emptyStates: {
    noEmails: () => pageSetup.createMockAuthState({
      emails: [],
      loading: false
    }),
    
    loading: () => pageSetup.createMockAuthState({
      emails: [],
      loading: true
    }),
    
    error: () => pageSetup.createMockAuthState({
      emails: [],
      loading: false,
      error: 'Failed to load emails. Please try again.'
    })
  },

  /**
   * Email list scenarios
   */
  emailList: {
    smallList: () => pageSetup.createMockAuthState({
      emails: mockDataGenerators.generateEmails(5)
    }),
    
    mediumList: () => pageSetup.createMockAuthState({
      emails: mockDataGenerators.generateEmails(25)
    }),
    
    largeList: () => pageSetup.createMockAuthState({
      emails: mockDataGenerators.generateEmails(100)
    }),
    
    allRead: () => pageSetup.createMockAuthState({
      emails: mockDataGenerators.generateEmails(10, { readRatio: 1.0 })
    }),
    
    allUnread: () => pageSetup.createMockAuthState({
      emails: mockDataGenerators.generateEmails(10, { readRatio: 0.0 })
    })
  },

  /**
   * Email viewer scenarios
   */
  emailViewer: {
    plainText: () => pageSetup.createMockAuthState({
      selectedEmail: {
        id: 'email-1',
        subject: 'Plain Text Email',
        sender: 'test@example.com',
        body: 'This is a plain text email body.',
        is_read: false,
        timestamp: new Date().toISOString()
      },
      showEmailView: true
    }),
    
    htmlEmail: () => pageSetup.createMockAuthState({
      selectedEmail: {
        id: 'email-1',
        subject: 'HTML Email',
        sender: 'test@example.com',
        body: '<p>This is an <strong>HTML</strong> email with <a href="#">links</a> and <em>formatting</em>.</p>',
        is_read: false,
        timestamp: new Date().toISOString()
      },
      showEmailView: true
    }),
    
    longEmail: () => pageSetup.createMockAuthState({
      selectedEmail: {
        id: 'email-1',
        subject: 'Very Long Email Subject That Should Be Truncated Properly',
        sender: 'verylongemailaddress@exampledomainwithverylongname.com',
        body: '<p>' + 'This is a very long email body. '.repeat(50) + '</p>',
        is_read: false,
        timestamp: new Date().toISOString()
      },
      showEmailView: true
    })
  },

  /**
   * Responsive design scenarios
   */
  responsive: {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 720 },
    wideDesktop: { width: 1920, height: 1080 }
  }
};

/**
 * Utility for running cross-browser visual tests
 */
export const crossBrowserUtils = {
  /**
   * Test configurations for different browsers
   */
  browserConfigs: {
    chromium: {
      name: 'chromium',
      viewport: { width: 1280, height: 720 }
    },
    firefox: {
      name: 'firefox',
      viewport: { width: 1280, height: 720 }
    },
    webkit: {
      name: 'webkit',
      viewport: { width: 1280, height: 720 }
    }
  },

  /**
   * Generate test matrix for multiple browsers and scenarios
   * @param {Array} scenarios - Test scenarios
   * @param {Array} browsers - Browser configs
   * @returns {Array} Test matrix
   */
  generateTestMatrix(scenarios, browsers = Object.values(this.browserConfigs)) {
    const matrix = [];
    
    for (const scenario of scenarios) {
      for (const browser of browsers) {
        matrix.push({
          ...scenario,
          browser: browser.name,
          viewport: browser.viewport,
          testName: `${scenario.name}-${browser.name}`
        });
      }
    }
    
    return matrix;
  }
};
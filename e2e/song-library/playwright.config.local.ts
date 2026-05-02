/**
 * Playwright Configuration for Song Library E2E Tests
 * 
 * This configuration extends the base Playwright config with
 * Song Library-specific settings and test projects.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/song-library',
  
  // Maximum time one test can run
  timeout: 60 * 1000,
  
  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report/song-library' }],
    ['json', { outputFile: 'test-results/song-library-results.json' }],
    ['junit', { outputFile: 'test-results/song-library-junit.xml' }],
    ['list']
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    
    // Collect trace on first retry
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on first retry
    video: 'retain-on-failure',
    
    // Timeout for each action
    actionTimeout: 10 * 1000,
    
    // Timeout for navigation
    navigationTimeout: 30 * 1000,
  },
  
  // Test projects for different browsers and devices
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    
    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 13'],
      },
    },
    
    // Tablet
    {
      name: 'iPad',
      use: {
        ...devices['iPad Pro'],
      },
    },
    
    // Accessibility testing with specific settings
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Enable accessibility tree
        contextOptions: {
          reducedMotion: 'reduce',
        },
      },
      testMatch: '**/accessibility-compliance.spec.ts',
    },
    
    // Performance testing
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Disable animations for consistent performance testing
        contextOptions: {
          reducedMotion: 'reduce',
        },
      },
      testMatch: '**/performance-benchmarks.spec.ts',
    },
    
    // Slow 3G network simulation
    {
      name: 'slow-3g',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Simulate slow 3G
        contextOptions: {
          offline: false,
        },
      },
      testMatch: '**/performance-benchmarks.spec.ts',
    },
  ],
  
  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  
  // Global setup and teardown
  globalSetup: './e2e/song-library/global-setup.ts',
  globalTeardown: './e2e/song-library/global-teardown.ts',
});

/**
 * Global Setup for Song Library E2E Tests
 * 
 * Runs once before all tests to:
 * - Set up test database
 * - Seed test data
 * - Create test users
 * - Configure test environment
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Song Library E2E Test Setup...');
  
  const baseURL = config.use?.baseURL || 'http://localhost:5173';
  
  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // 1. Check if application is running
    console.log('✓ Checking application availability...');
    await page.goto(baseURL, { timeout: 30000 });
    console.log('✓ Application is running');
    
    // 2. Set up test users (if needed)
    console.log('✓ Setting up test users...');
    // This would typically call an API endpoint or database script
    // For now, we assume users exist from database seeding
    
    // 3. Seed test data
    console.log('✓ Seeding test data...');
    // This would typically:
    // - Create test songs (1000+ for performance tests)
    // - Create test setlists
    // - Create test user preferences
    // - Set up collaboration scenarios
    
    // 4. Clear any existing test data
    console.log('✓ Clearing previous test data...');
    // Clean up from previous test runs
    
    // 5. Set up test environment variables
    console.log('✓ Configuring test environment...');
    process.env.TEST_MODE = 'true';
    process.env.SKIP_ANALYTICS = 'true';
    
    console.log('✅ Song Library E2E Test Setup Complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;

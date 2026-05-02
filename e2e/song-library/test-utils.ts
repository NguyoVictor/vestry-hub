/**
 * Test Utilities for Song Library E2E Tests
 * 
 * Shared helper functions and utilities used across test files
 */

import { Page, expect } from '@playwright/test';

// ============================================================================
// Authentication Helpers
// ============================================================================

export async function login(
  page: Page, 
  email: string = 'test@example.com', 
  password: string = 'password123'
) {
  const baseURL = process.env.BASE_URL || 'http://localhost:5173';
  await page.goto(`${baseURL}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL('**/login');
}

// ============================================================================
// Navigation Helpers
// ============================================================================

export async function navigateToSongLibrary(page: Page) {
  const baseURL = process.env.BASE_URL || 'http://localhost:5173';
  await page.goto(`${baseURL}/media/songs`);
  await page.waitForSelector('[data-testid="song-library-container"]', { timeout: 10000 });
}

export async function navigateToSetlistBuilder(page: Page) {
  await navigateToSongLibrary(page);
  await page.click('[data-testid="setlist-builder-tab"]');
  await page.waitForSelector('[data-testid="setlist-builder"]');
}

export async function navigateToSongDetail(page: Page, songId?: string) {
  if (songId) {
    const baseURL = process.env.BASE_URL || 'http://localhost:5173';
    await page.goto(`${baseURL}/media/songs/${songId}`);
  } else {
    await navigateToSongLibrary(page);
    await page.click('[data-testid="song-card"]', { position: { x: 10, y: 10 } });
  }
  await page.waitForSelector('[data-testid="song-detail"]');
}

// ============================================================================
// Command Palette Helpers
// ============================================================================

export async function openCommandPalette(page: Page) {
  const isMac = process.platform === 'darwin';
  const modifier = isMac ? 'Meta' : 'Control';
  await page.keyboard.press(`${modifier}+KeyK`);
  await page.waitForSelector('[data-testid="command-palette"]', { state: 'visible' });
}

export async function closeCommandPalette(page: Page) {
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-testid="command-palette"]', { state: 'hidden' });
}

export async function searchInCommandPalette(page: Page, query: string) {
  await openCommandPalette(page);
  await page.fill('[data-testid="search-input"]', query);
  await page.waitForSelector('[data-testid="search-results"]');
}

// ============================================================================
// Setlist Helpers
// ============================================================================

export async function createSetlist(
  page: Page, 
  name: string, 
  date?: string
) {
  await navigateToSetlistBuilder(page);
  await page.click('[data-testid="create-setlist-button"]');
  await page.fill('[data-testid="setlist-name-input"]', name);
  
  if (date) {
    await page.fill('[data-testid="setlist-date-input"]', date);
  }
  
  await page.click('[data-testid="save-setlist-button"]');
  await page.waitForSelector('[data-testid="setlist-drop-zone"]');
  
  return page.url(); // Return setlist URL for sharing
}

export async function addSongToSetlist(page: Page, songQuery: string) {
  await searchInCommandPalette(page, songQuery);
  const song = page.locator('[data-testid="search-result-item"]').first();
  const dropZone = page.locator('[data-testid="setlist-drop-zone"]');
  await song.dragTo(dropZone);
  await closeCommandPalette(page);
}

export async function getSetlistItemCount(page: Page): Promise<number> {
  return await page.locator('[data-testid="setlist-item"]').count();
}

// ============================================================================
// Theme Helpers
// ============================================================================

export async function toggleTheme(page: Page) {
  await page.click('[data-testid="theme-toggle"]');
  await page.waitForTimeout(500); // Wait for transition
}

export async function getCurrentTheme(page: Page): Promise<string | null> {
  return await page.getAttribute('html', 'data-theme');
}

export async function setTheme(page: Page, theme: 'light' | 'dark') {
  const currentTheme = await getCurrentTheme(page);
  if (currentTheme !== theme) {
    await toggleTheme(page);
  }
}

// ============================================================================
// View Mode Helpers
// ============================================================================

export async function switchViewMode(page: Page) {
  await page.click('[data-testid="view-mode-toggle"]');
  await page.waitForTimeout(300); // Wait for transition
}

export async function getCurrentViewMode(page: Page): Promise<'grid' | 'list'> {
  const gridVisible = await page.locator('[data-testid="song-grid"]').isVisible();
  return gridVisible ? 'grid' : 'list';
}

export async function setViewMode(page: Page, mode: 'grid' | 'list') {
  const currentMode = await getCurrentViewMode(page);
  if (currentMode !== mode) {
    await switchViewMode(page);
  }
}

// ============================================================================
// Performance Measurement Helpers
// ============================================================================

export async function measurePerformance(
  page: Page, 
  action: () => Promise<void>
): Promise<number> {
  const startTime = Date.now();
  await action();
  return Date.now() - startTime;
}

export async function measureFPS(page: Page, duration: number = 1000): Promise<number> {
  return await page.evaluate((duration) => {
    return new Promise<number>((resolve) => {
      let frameCount = 0;
      const startTime = performance.now();
      
      function countFrame() {
        frameCount++;
        if (performance.now() - startTime < duration) {
          requestAnimationFrame(countFrame);
        } else {
          const fps = (frameCount / duration) * 1000;
          resolve(fps);
        }
      }
      
      requestAnimationFrame(countFrame);
    });
  }, duration);
}

export async function getMemoryUsage(page: Page): Promise<number> {
  return await page.evaluate(() => {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  });
}

// ============================================================================
// Accessibility Helpers
// ============================================================================

export async function getFocusedElement(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    const el = document.activeElement;
    return el?.getAttribute('data-testid') || el?.tagName || null;
  });
}

export async function tabToElement(page: Page, targetTestId: string, maxTabs: number = 50): Promise<boolean> {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    const focused = await getFocusedElement(page);
    if (focused === targetTestId) {
      return true;
    }
  }
  return false;
}

export async function getAriaLabel(page: Page, selector: string): Promise<string | null> {
  return await page.locator(selector).getAttribute('aria-label');
}

export async function hasVisibleFocusIndicator(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const styles = window.getComputedStyle(el);
    return (
      styles.outline !== 'none' ||
      styles.outlineWidth !== '0px' ||
      styles.boxShadow !== 'none'
    );
  });
}

// ============================================================================
// Wait Helpers
// ============================================================================

export async function waitForLoadingToComplete(page: Page) {
  await page.waitForSelector('[data-testid="loading-skeleton"]', { state: 'hidden', timeout: 10000 });
}

export async function waitForToast(page: Page, expectedText?: string) {
  await page.waitForSelector('[data-testid="toast"]', { state: 'visible' });
  
  if (expectedText) {
    await expect(page.locator('[data-testid="toast"]')).toContainText(expectedText);
  }
}

export async function waitForRealtimeSync(page: Page, timeout: number = 3000) {
  await page.waitForTimeout(timeout);
}

// ============================================================================
// Data Helpers
// ============================================================================

export async function getSongCount(page: Page): Promise<number> {
  const text = await page.locator('[data-testid="total-songs"]').textContent();
  return parseInt(text?.match(/\d+/)?.[0] || '0');
}

export async function getVisibleSongCount(page: Page): Promise<number> {
  return await page.locator('[data-testid="song-card"]:visible').count();
}

export async function scrollToBottom(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
}

export async function scrollToTop(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
}

// ============================================================================
// Assertion Helpers
// ============================================================================

export async function expectElementToBeAccessible(page: Page, selector: string) {
  const element = page.locator(selector);
  
  // Should be visible
  await expect(element).toBeVisible();
  
  // Should have proper ARIA attributes
  const role = await element.getAttribute('role');
  const ariaLabel = await element.getAttribute('aria-label');
  const ariaLabelledBy = await element.getAttribute('aria-labelledby');
  
  // Should have some form of accessible name
  expect(role || ariaLabel || ariaLabelledBy).toBeTruthy();
}

export async function expectNoConsoleErrors(page: Page) {
  const errors: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Wait a bit to collect any errors
  await page.waitForTimeout(1000);
  
  expect(errors).toHaveLength(0);
}

// ============================================================================
// Network Helpers
// ============================================================================

export async function simulateSlowNetwork(page: Page) {
  await page.route('**/*', async (route) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    await route.continue();
  });
}

export async function simulateOffline(page: Page) {
  await page.context().setOffline(true);
}

export async function simulateOnline(page: Page) {
  await page.context().setOffline(false);
}

// ============================================================================
// Mobile Helpers
// ============================================================================

export async function performSwipeGesture(
  page: Page,
  direction: 'left' | 'right' | 'up' | 'down'
) {
  const viewport = page.viewportSize();
  if (!viewport) return;
  
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  
  let startX = centerX;
  let startY = centerY;
  let endX = centerX;
  let endY = centerY;
  
  switch (direction) {
    case 'left':
      startX = viewport.width * 0.8;
      endX = viewport.width * 0.2;
      break;
    case 'right':
      startX = viewport.width * 0.2;
      endX = viewport.width * 0.8;
      break;
    case 'up':
      startY = viewport.height * 0.8;
      endY = viewport.height * 0.2;
      break;
    case 'down':
      startY = viewport.height * 0.2;
      endY = viewport.height * 0.8;
      break;
  }
  
  await page.touchscreen.swipe({ x: startX, y: startY }, { x: endX, y: endY });
}

export async function performLongPress(page: Page, selector: string) {
  const element = page.locator(selector);
  await element.tap();
  await page.waitForTimeout(500); // Long press duration
}

// ============================================================================
// Debugging Helpers
// ============================================================================

export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
}

export async function logPageState(page: Page) {
  const url = page.url();
  const title = await page.title();
  const focused = await getFocusedElement(page);
  
  console.log('Page State:', { url, title, focused });
}

export async function waitForDebug(page: Page) {
  console.log('Paused for debugging. Press any key to continue...');
  await page.pause();
}

// ============================================================================
// Cleanup Helpers
// ============================================================================

export async function cleanupTestData(page: Page) {
  // This would typically call API endpoints to clean up test data
  // For now, it's a placeholder
  console.log('Cleaning up test data...');
}

export async function resetUserPreferences(page: Page) {
  // Reset theme, view mode, filters, etc.
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

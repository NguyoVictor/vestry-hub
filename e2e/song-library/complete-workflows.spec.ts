/**
 * End-to-End Tests: Complete User Workflows
 * Feature: song-library-ui-revamp
 * 
 * Tests complete user journeys through the Song Library UI including:
 * - Search and discovery workflows
 * - Setlist creation and management
 * - Real-time collaboration scenarios
 * - Theme switching and persistence
 * - Mobile and desktop experiences
 */

import { test, expect, type Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const TEST_TIMEOUT = 60000;

// Helper functions
async function login(page: Page, email: string = 'test@example.com', password: string = 'password123') {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

async function navigateToSongLibrary(page: Page) {
  await page.goto(`${BASE_URL}/media/songs`);
  await page.waitForSelector('[data-testid="song-library-container"]', { timeout: 10000 });
}

async function openCommandPalette(page: Page) {
  const isMac = process.platform === 'darwin';
  const modifier = isMac ? 'Meta' : 'Control';
  await page.keyboard.press(`${modifier}+KeyK`);
  await page.waitForSelector('[data-testid="command-palette"]', { state: 'visible' });
}

test.describe('Song Library - Complete User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToSongLibrary(page);
  });

  test.describe('Search and Discovery Workflow', () => {
    test('should complete full search workflow with filters', async ({ page }) => {
      // Open command palette
      await openCommandPalette(page);

      // Type search query
      await page.fill('[data-testid="search-input"]', 'amazing grace');
      
      // Wait for search results
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Verify results are displayed
      const results = await page.locator('[data-testid="search-result-item"]').count();
      expect(results).toBeGreaterThan(0);

      // Apply filter by key
      await page.click('[data-testid="filter-by-key"]');
      await page.click('[data-testid="key-option-C"]');

      // Verify filtered results
      const filteredResults = await page.locator('[data-testid="search-result-item"]').count();
      expect(filteredResults).toBeLessThanOrEqual(results);

      // Select a song from results
      await page.click('[data-testid="search-result-item"]', { position: { x: 10, y: 10 } });

      // Verify navigation to song detail
      await page.waitForURL('**/media/songs/*');
      await expect(page.locator('[data-testid="song-detail-title"]')).toBeVisible();
    });

    test('should show recent searches and popular songs when empty', async ({ page }) => {
      await openCommandPalette(page);

      // Verify default content is displayed
      await expect(page.locator('[data-testid="recent-searches"]')).toBeVisible();
      await expect(page.locator('[data-testid="popular-songs"]')).toBeVisible();

      // Verify popular songs are clickable
      const popularSong = page.locator('[data-testid="popular-song-item"]').first();
      await expect(popularSong).toBeVisible();
      await popularSong.click();

      // Verify navigation occurred
      await page.waitForURL('**/media/songs/*');
    });

    test('should perform fuzzy search across multiple fields', async ({ page }) => {
      await openCommandPalette(page);

      // Test fuzzy search with typo
      await page.fill('[data-testid="search-input"]', 'amzing grac'); // Intentional typos
      
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Should still find "Amazing Grace"
      const results = await page.locator('[data-testid="search-result-item"]').count();
      expect(results).toBeGreaterThan(0);

      // Verify highlighted matching text
      await expect(page.locator('[data-testid="search-highlight"]').first()).toBeVisible();
    });
  });

  test.describe('Setlist Creation and Management Workflow', () => {
    test('should create and manage a complete setlist', async ({ page }) => {
      // Navigate to setlist builder
      await page.click('[data-testid="setlist-builder-tab"]');
      await page.waitForSelector('[data-testid="setlist-builder"]');

      // Create new setlist
      await page.click('[data-testid="create-setlist-button"]');
      await page.fill('[data-testid="setlist-name-input"]', 'Sunday Morning Worship');
      await page.fill('[data-testid="setlist-date-input"]', '2026-05-03');
      await page.click('[data-testid="save-setlist-button"]');

      // Wait for setlist to be created
      await page.waitForSelector('[data-testid="setlist-drop-zone"]');

      // Search for songs to add
      await openCommandPalette(page);
      await page.fill('[data-testid="search-input"]', 'worship');
      await page.waitForSelector('[data-testid="search-results"]');

      // Drag first song to setlist
      const firstSong = page.locator('[data-testid="search-result-item"]').first();
      const dropZone = page.locator('[data-testid="setlist-drop-zone"]');
      
      await firstSong.dragTo(dropZone);

      // Verify song was added
      await expect(page.locator('[data-testid="setlist-item"]')).toHaveCount(1);

      // Add more songs
      await openCommandPalette(page);
      await page.fill('[data-testid="search-input"]', 'praise');
      const secondSong = page.locator('[data-testid="search-result-item"]').first();
      await secondSong.dragTo(dropZone);

      await expect(page.locator('[data-testid="setlist-item"]')).toHaveCount(2);

      // Reorder songs
      const firstItem = page.locator('[data-testid="setlist-item"]').first();
      const secondItem = page.locator('[data-testid="setlist-item"]').nth(1);
      await firstItem.dragTo(secondItem);

      // Verify total duration is displayed
      await expect(page.locator('[data-testid="total-duration"]')).toBeVisible();

      // Verify key transitions are shown
      await expect(page.locator('[data-testid="key-transition"]')).toBeVisible();

      // Auto-save should occur automatically
      await page.waitForTimeout(2000); // Wait for auto-save
      await expect(page.locator('[data-testid="save-indicator"]')).toContainText('Saved');
    });

    test('should handle drag-and-drop on touch devices', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Touch-specific test');

      await page.click('[data-testid="setlist-builder-tab"]');
      await page.click('[data-testid="create-setlist-button"]');
      await page.fill('[data-testid="setlist-name-input"]', 'Mobile Setlist');
      await page.click('[data-testid="save-setlist-button"]');

      // Open song library
      await page.click('[data-testid="song-library-tab"]');

      // Perform touch drag
      const song = page.locator('[data-testid="song-card"]').first();
      const dropZone = page.locator('[data-testid="setlist-drop-zone"]');

      await song.tap();
      await page.waitForTimeout(500); // Long press
      await dropZone.tap();

      // Verify song was added
      await expect(page.locator('[data-testid="setlist-item"]')).toHaveCount(1);
    });
  });

  test.describe('Real-time Collaboration Workflow', () => {
    test('should show presence indicators for multiple users', async ({ page, context }) => {
      // Create a setlist
      await page.click('[data-testid="setlist-builder-tab"]');
      await page.click('[data-testid="create-setlist-button"]');
      await page.fill('[data-testid="setlist-name-input"]', 'Collaboration Test');
      await page.click('[data-testid="save-setlist-button"]');

      // Get setlist URL
      const setlistUrl = page.url();

      // Open second browser context (simulating second user)
      const page2 = await context.newPage();
      await login(page2, 'user2@example.com', 'password123');
      await page2.goto(setlistUrl);

      // Verify presence indicator shows both users
      await expect(page.locator('[data-testid="collaborator-avatar"]')).toHaveCount(2);
      await expect(page2.locator('[data-testid="collaborator-avatar"]')).toHaveCount(2);

      // Make change in first page
      await openCommandPalette(page);
      await page.fill('[data-testid="search-input"]', 'song');
      const song = page.locator('[data-testid="search-result-item"]').first();
      await song.dragTo(page.locator('[data-testid="setlist-drop-zone"]'));

      // Verify change appears in second page
      await page2.waitForSelector('[data-testid="setlist-item"]', { timeout: 5000 });
      await expect(page2.locator('[data-testid="setlist-item"]')).toHaveCount(1);

      await page2.close();
    });

    test('should handle edit conflicts gracefully', async ({ page, context }) => {
      // Create setlist
      await page.click('[data-testid="setlist-builder-tab"]');
      await page.click('[data-testid="create-setlist-button"]');
      await page.fill('[data-testid="setlist-name-input"]', 'Conflict Test');
      await page.click('[data-testid="save-setlist-button"]');

      const setlistUrl = page.url();

      // Open second context
      const page2 = await context.newPage();
      await login(page2, 'user2@example.com', 'password123');
      await page2.goto(setlistUrl);

      // Both users try to edit simultaneously
      await Promise.all([
        page.fill('[data-testid="setlist-name-input"]', 'Updated Name 1'),
        page2.fill('[data-testid="setlist-name-input"]', 'Updated Name 2')
      ]);

      // Verify conflict notification appears
      await expect(page.locator('[data-testid="conflict-notification"]')).toBeVisible({ timeout: 5000 });

      // Resolve conflict
      await page.click('[data-testid="resolve-conflict-button"]');
      await page.click('[data-testid="keep-my-changes"]');

      // Verify resolution
      await expect(page.locator('[data-testid="conflict-notification"]')).not.toBeVisible();

      await page2.close();
    });

    test('should sync changes across multiple tabs', async ({ page, context }) => {
      // Create setlist in first tab
      await page.click('[data-testid="setlist-builder-tab"]');
      await page.click('[data-testid="create-setlist-button"]');
      await page.fill('[data-testid="setlist-name-input"]', 'Cross-Tab Test');
      await page.click('[data-testid="save-setlist-button"]');

      const setlistUrl = page.url();

      // Open same setlist in second tab (same user)
      const page2 = await context.newPage();
      await page2.goto(setlistUrl);

      // Make change in first tab
      await openCommandPalette(page);
      await page.fill('[data-testid="search-input"]', 'test song');
      const song = page.locator('[data-testid="search-result-item"]').first();
      await song.dragTo(page.locator('[data-testid="setlist-drop-zone"]'));

      // Verify change syncs to second tab within 1 second
      await page2.waitForSelector('[data-testid="setlist-item"]', { timeout: 1500 });
      await expect(page2.locator('[data-testid="setlist-item"]')).toHaveCount(1);

      await page2.close();
    });
  });

  test.describe('Theme Switching and Persistence', () => {
    test('should switch themes and persist selection', async ({ page }) => {
      // Verify initial theme
      const initialTheme = await page.getAttribute('html', 'data-theme');

      // Toggle theme
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(500); // Wait for transition

      // Verify theme changed
      const newTheme = await page.getAttribute('html', 'data-theme');
      expect(newTheme).not.toBe(initialTheme);

      // Reload page
      await page.reload();
      await page.waitForSelector('[data-testid="song-library-container"]');

      // Verify theme persisted
      const persistedTheme = await page.getAttribute('html', 'data-theme');
      expect(persistedTheme).toBe(newTheme);
    });

    test('should apply ambient colors in dark mode', async ({ page }) => {
      // Switch to dark mode
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(500);

      // Navigate to song with cover art
      await page.click('[data-testid="song-card"]', { position: { x: 10, y: 10 } });
      await page.waitForSelector('[data-testid="song-detail"]');

      // Verify ambient color effect is applied
      const ambientElement = page.locator('[data-testid="ambient-background"]');
      const backgroundColor = await ambientElement.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );

      // Should have some color (not pure black or white)
      expect(backgroundColor).not.toBe('rgb(0, 0, 0)');
      expect(backgroundColor).not.toBe('rgb(255, 255, 255)');
    });
  });

  test.describe('View Mode Switching', () => {
    test('should switch between grid and list views', async ({ page }) => {
      // Verify initial grid view
      await expect(page.locator('[data-testid="song-grid"]')).toBeVisible();

      // Switch to list view
      await page.click('[data-testid="view-mode-toggle"]');
      await page.waitForTimeout(300); // Wait for transition

      // Verify list view is displayed
      await expect(page.locator('[data-testid="song-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="song-grid"]')).not.toBeVisible();

      // Switch back to grid view
      await page.click('[data-testid="view-mode-toggle"]');
      await page.waitForTimeout(300);

      // Verify grid view is displayed
      await expect(page.locator('[data-testid="song-grid"]')).toBeVisible();
    });

    test('should maintain scroll position when switching views', async ({ page }) => {
      // Scroll down in grid view
      await page.evaluate(() => window.scrollTo(0, 500));
      const scrollPosition = await page.evaluate(() => window.scrollY);

      // Switch to list view
      await page.click('[data-testid="view-mode-toggle"]');
      await page.waitForTimeout(300);

      // Verify approximate scroll position maintained
      const newScrollPosition = await page.evaluate(() => window.scrollY);
      expect(Math.abs(newScrollPosition - scrollPosition)).toBeLessThan(100);
    });

    test('should persist view mode preference', async ({ page }) => {
      // Switch to list view
      await page.click('[data-testid="view-mode-toggle"]');
      await page.waitForTimeout(300);

      // Reload page
      await page.reload();
      await page.waitForSelector('[data-testid="song-library-container"]');

      // Verify list view is still active
      await expect(page.locator('[data-testid="song-list"]')).toBeVisible();
    });
  });

  test.describe('Chord Transposition Workflow', () => {
    test('should transpose chords and save preference', async ({ page }) => {
      // Navigate to song with chords
      await page.click('[data-testid="song-card"]', { position: { x: 10, y: 10 } });
      await page.waitForSelector('[data-testid="chord-display"]');

      // Get original key
      const originalKey = await page.locator('[data-testid="original-key"]').textContent();

      // Move transposition slider
      const slider = page.locator('[data-testid="transposition-slider"]');
      await slider.fill('2'); // Transpose up 2 semitones

      // Verify transposed key is displayed
      const transposedKey = await page.locator('[data-testid="transposed-key"]').textContent();
      expect(transposedKey).not.toBe(originalKey);

      // Verify chords updated in real-time
      await expect(page.locator('[data-testid="chord-display"]')).not.toContainText(originalKey!);

      // Navigate away and back
      await page.click('[data-testid="back-button"]');
      await page.click('[data-testid="song-card"]', { position: { x: 10, y: 10 } });

      // Verify transposition preference persisted
      const persistedTransposition = await slider.inputValue();
      expect(persistedTransposition).toBe('2');
    });

    test('should reset transposition on double-click', async ({ page }) => {
      await page.click('[data-testid="song-card"]', { position: { x: 10, y: 10 } });
      await page.waitForSelector('[data-testid="chord-display"]');

      // Transpose
      const slider = page.locator('[data-testid="transposition-slider"]');
      await slider.fill('3');

      // Double-click to reset
      await slider.dblclick();

      // Verify reset to 0
      const value = await slider.inputValue();
      expect(value).toBe('0');
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should adapt layout for mobile devices', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile-specific test');

      // Verify single column grid
      const gridColumns = await page.locator('[data-testid="song-grid"]').evaluate(el => 
        window.getComputedStyle(el).gridTemplateColumns
      );
      expect(gridColumns).toContain('1fr'); // Single column

      // Verify command palette is full screen
      await openCommandPalette(page);
      const palette = page.locator('[data-testid="command-palette"]');
      const paletteBox = await palette.boundingBox();
      const viewportSize = page.viewportSize();

      expect(paletteBox?.width).toBeCloseTo(viewportSize!.width, 10);
      expect(paletteBox?.height).toBeCloseTo(viewportSize!.height, 10);
    });

    test('should support swipe gestures', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile-specific test');

      // Navigate to song detail
      await page.click('[data-testid="song-card"]', { position: { x: 10, y: 10 } });
      await page.waitForSelector('[data-testid="song-detail"]');

      // Perform swipe gesture
      await page.touchscreen.swipe({ x: 300, y: 200 }, { x: 50, y: 200 });

      // Verify navigation occurred
      await page.waitForURL('**/media/songs');
    });
  });

  test.describe('Performance and Loading', () => {
    test('should load large song collections efficiently', async ({ page }) => {
      // Measure initial load time
      const startTime = Date.now();
      await navigateToSongLibrary(page);
      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);

      // Verify virtual scrolling is working
      const visibleCards = await page.locator('[data-testid="song-card"]:visible').count();
      
      // Should only render visible items (not all 1000+)
      expect(visibleCards).toBeLessThan(50);

      // Scroll down
      await page.evaluate(() => window.scrollTo(0, 2000));
      await page.waitForTimeout(500);

      // Verify new items loaded
      const newVisibleCards = await page.locator('[data-testid="song-card"]:visible').count();
      expect(newVisibleCards).toBeGreaterThan(0);
    });

    test('should lazy load cover art images', async ({ page }) => {
      // Get initial loaded images
      const initialImages = await page.locator('[data-testid="cover-art-image"][src]').count();

      // Scroll down to trigger lazy loading
      await page.evaluate(() => window.scrollTo(0, 1000));
      await page.waitForTimeout(500);

      // Verify more images loaded
      const newImages = await page.locator('[data-testid="cover-art-image"][src]').count();
      expect(newImages).toBeGreaterThan(initialImages);
    });

    test('should show loading skeletons during data fetch', async ({ page }) => {
      // Navigate to song library
      await page.goto(`${BASE_URL}/media/songs`);

      // Verify skeletons are shown initially
      await expect(page.locator('[data-testid="loading-skeleton"]').first()).toBeVisible({ timeout: 1000 });

      // Wait for data to load
      await page.waitForSelector('[data-testid="song-card"]', { timeout: 5000 });

      // Verify skeletons are replaced with content
      await expect(page.locator('[data-testid="loading-skeleton"]')).not.toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should support full keyboard navigation', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      let focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toBeTruthy();

      // Navigate through song cards
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      // Activate focused element with Enter
      await page.keyboard.press('Enter');

      // Verify navigation occurred
      await page.waitForURL('**/media/songs/*');
    });

    test('should announce dynamic content to screen readers', async ({ page }) => {
      // Open command palette
      await openCommandPalette(page);

      // Type search query
      await page.fill('[data-testid="search-input"]', 'test');

      // Verify aria-live region is updated
      const liveRegion = page.locator('[aria-live="polite"]');
      await expect(liveRegion).toContainText(/results?/i, { timeout: 2000 });
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Verify main landmarks
      await expect(page.locator('main[role="main"]')).toBeVisible();

      // Verify buttons have labels
      const buttons = page.locator('button');
      const count = await buttons.count();

      for (let i = 0; i < Math.min(count, 10); i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        
        // Button should have either aria-label or text content
        expect(ariaLabel || text?.trim()).toBeTruthy();
      }
    });
  });
});

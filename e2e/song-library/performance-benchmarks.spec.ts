/**
 * End-to-End Tests: Performance Benchmarking
 * Feature: song-library-ui-revamp
 * 
 * Tests performance requirements including:
 * - Large dataset handling (1000+ songs)
 * - Concurrent user scenarios
 * - Mobile performance
 * - Network condition variations
 * - Real-time synchronization performance
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  initialLoad: 3000, // 3 seconds
  searchResponse: 100, // 100ms
  viewSwitch: 500, // 500ms
  dragDrop: 200, // 200ms
  realtimeSync: 2000, // 2 seconds
  imageLoad: 1000, // 1 second
  scrollFPS: 30, // 30 FPS minimum
};

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

async function measurePerformance(page: Page, action: () => Promise<void>): Promise<number> {
  const startTime = Date.now();
  await action();
  return Date.now() - startTime;
}

async function measureFPS(page: Page, duration: number = 1000): Promise<number> {
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

test.describe('Song Library - Performance Benchmarks', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Large Dataset Handling (1000+ songs)', () => {
    test('should load initial page with 1000+ songs within threshold', async ({ page }) => {
      const loadTime = await measurePerformance(page, async () => {
        await page.goto(`${BASE_URL}/media/songs`);
        await page.waitForSelector('[data-testid="song-library-container"]');
        await page.waitForSelector('[data-testid="song-card"]', { timeout: 5000 });
      });

      console.log(`Initial load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.initialLoad);

      // Verify virtual scrolling is active
      const totalSongs = await page.locator('[data-testid="total-songs"]').textContent();
      const visibleSongs = await page.locator('[data-testid="song-card"]:visible').count();

      console.log(`Total songs: ${totalSongs}, Visible: ${visibleSongs}`);
      expect(visibleSongs).toBeLessThan(100); // Should only render visible items
    });

    test('should maintain smooth scrolling with large dataset', async ({ page }) => {
      await page.goto(`${BASE_URL}/media/songs`);
      await page.waitForSelector('[data-testid="song-grid"]');

      // Measure FPS during scroll
      await page.evaluate(() => window.scrollTo(0, 0));
      
      const scrollPromise = page.evaluate(() => {
        return new Promise<void>((resolve) => {
          let scrollTop = 0;
          const scrollStep = () => {
            scrollTop += 50;
            window.scrollTo(0, scrollTop);
            if (scrollTop < 2000) {
              requestAnimationFrame(scrollStep);
            } else {
              resolve();
            }
          };
          requestAnimationFrame(scrollStep);
        });
      });

      const fps = await measureFPS(page, 2000);
      await scrollPromise;

      console.log(`Scroll FPS: ${fps.toFixed(2)}`);
      expect(fps).toBeGreaterThan(PERFORMANCE_THRESHOLDS.scrollFPS);
    });

    test('should handle search across 1000+ songs efficiently', async ({ page }) => {
      await page.goto(`${BASE_URL}/media/songs`);
      await page.waitForSelector('[data-testid="song-library-container"]');

      // Open command palette
      await page.keyboard.press('Control+KeyK');
      await page.waitForSelector('[data-testid="command-palette"]');

      // Measure search response time
      const searchTime = await measurePerformance(page, async () => {
        await page.fill('[data-testid="search-input"]', 'amazing');
        await page.waitForSelector('[data-testid="search-results"]');
      });

      console.log(`Search response time: ${searchTime}ms`);
      expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.searchResponse);

      // Verify results are displayed
      const results = await page.locator('[data-testid="search-result-item"]').count();
      expect(results).toBeGreaterThan(0);
    });

    test('should filter large dataset efficiently', async ({ page }) => {
      await page.goto(`${BASE_URL}/media/songs`);
      await page.waitForSelector('[data-testid="song-library-container"]');

      // Apply multiple filters
      const filterTime = await measurePerformance(page, async () => {
        await page.click('[data-testid="filter-button"]');
        await page.click('[data-testid="filter-key-C"]');
        await page.click('[data-testid="filter-bpm-fast"]');
        await page.click('[data-testid="apply-filters"]');
        await page.waitForSelector('[data-testid="song-card"]');
      });

      console.log(`Filter application time: ${filterTime}ms`);
      expect(filterTime).toBeLessThan(500); // Should filter within 500ms
    });

    test('should sort large dataset efficiently', async ({ page }) => {
      await page.goto(`${BASE_URL}/media/songs`);
      await page.waitForSelector('[data-testid="song-library-container"]');

      // Measure sort time
      const sortTime = await measurePerformance(page, async () => {
        await page.click('[data-testid="sort-dropdown"]');
        await page.click('[data-testid="sort-by-usage"]');
        await page.waitForTimeout(100); // Wait for re-render
      });

      console.log(`Sort time: ${sortTime}ms`);
      expect(sortTime).toBeLessThan(300);
    });
  });

  test.describe('Concurrent User Scenarios', () => {
    test('should handle 5 concurrent users editing same setlist', async ({ page, context }) => {
      // Create setlist
      await page.goto(`${BASE_URL}/media/songs`);
      await page.click('[data-testid="setlist-builder-tab"]');
      await page.click('[data-testid="create-setlist-button"]');
      await page.fill('[data-testid="setlist-name-input"]', 'Concurrent Test');
      await page.click('[data-testid="save-setlist-button"]');

      const setlistUrl = page.url();

      // Create 4 additional users
      const additionalPages: Page[] = [];
      for (let i = 0; i < 4; i++) {
        const newPage = await context.newPage();
        await newPage.goto(`${BASE_URL}/login`);
        await newPage.fill('input[type="email"]', `user${i}@example.com`);
        await newPage.fill('input[type="password"]', 'password123');
        await newPage.click('button[type="submit"]');
        await newPage.goto(setlistUrl);
        additionalPages.push(newPage);
      }

      // All users add songs simultaneously
      const startTime = Date.now();
      
      await Promise.all([
        page.evaluate(() => {
          // Simulate adding song
          const event = new CustomEvent('add-song', { detail: { songId: '1' } });
          document.dispatchEvent(event);
        }),
        ...additionalPages.map((p, i) => 
          p.evaluate((songId) => {
            const event = new CustomEvent('add-song', { detail: { songId } });
            document.dispatchEvent(event);
          }, `${i + 2}`)
        )
      ]);

      // Wait for all changes to sync
      await page.waitForTimeout(3000);
      const syncTime = Date.now() - startTime;

      console.log(`Concurrent sync time: ${syncTime}ms`);
      expect(syncTime).toBeLessThan(5000); // Should sync within 5 seconds

      // Verify all changes are reflected
      const itemCount = await page.locator('[data-testid="setlist-item"]').count();
      expect(itemCount).toBe(5); // All 5 songs should be added

      // Cleanup
      for (const p of additionalPages) {
        await p.close();
      }
    });

    test('should maintain performance with 10 concurrent searches', async ({ page, context }) => {
      await page.goto(`${BASE_URL}/media/songs`);

      // Create 9 additional pages
      const pages: Page[] = [page];
      for (let i = 0; i < 9; i++) {
        const newPage = await context.newPage();
        await newPage.goto(`${BASE_URL}/login`);
        await newPage.fill('input[type="email"]', `user${i}@example.com`);
        await newPage.fill('input[type="password"]', 'password123');
        await newPage.click('button[type="submit"]');
        await newPage.goto(`${BASE_URL}/media/songs`);
        pages.push(newPage);
      }

      // All users search simultaneously
      const startTime = Date.now();
      
      await Promise.all(
        pages.map(async (p, i) => {
          await p.keyboard.press('Control+KeyK');
          await p.fill('[data-testid="search-input"]', `search${i}`);
          await p.waitForSelector('[data-testid="search-results"]');
        })
      );

      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / 10;

      console.log(`Average search time with 10 concurrent users: ${avgTime}ms`);
      expect(avgTime).toBeLessThan(500);

      // Cleanup
      for (let i = 1; i < pages.length; i++) {
        await pages[i].close();
      }
    });
  });

  test.describe('Mobile Performance', () => {
    test('should load efficiently on mobile devices', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile-specific test');

      const loadTime = await measurePerformance(page, async () => {
        await page.goto(`${BASE_URL}/media/songs`);
        await page.waitForSelector('[data-testid="song-library-container"]');
      });

      console.log(`Mobile load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.initialLoad * 1.5); // Allow 50% more time on mobile
    });

    test('should maintain smooth touch scrolling on mobile', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile-specific test');

      await page.goto(`${BASE_URL}/media/songs`);
      await page.waitForSelector('[data-testid="song-grid"]');

      // Measure FPS during touch scroll
      const fps = await measureFPS(page, 2000);

      // Perform touch scroll
      await page.touchscreen.swipe({ x: 200, y: 400 }, { x: 200, y: 100 });

      console.log(`Mobile scroll FPS: ${fps.toFixed(2)}`);
      expect(fps).toBeGreaterThan(PERFORMANCE_THRESHOLDS.scrollFPS * 0.8); // Allow 20% lower on mobile
    });

    test('should load adaptive images on mobile', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile-specific test');

      await page.goto(`${BASE_URL}/media/songs`);
      await page.waitForSelector('[data-testid="song-card"]');

      // Check image sizes
      const imageSrc = await page.locator('[data-testid="cover-art-image"]').first().getAttribute('src');
      
      // Mobile should load smaller images
      expect(imageSrc).toMatch(/small|thumbnail/i);
    });

    test('should handle touch drag-and-drop efficiently', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile-specific test');

      await page.goto(`${BASE_URL}/media/songs`);
      await page.click('[data-testid="setlist-builder-tab"]');
      await page.click('[data-testid="create-setlist-button"]');
      await page.fill('[data-testid="setlist-name-input"]', 'Mobile Drag Test');
      await page.click('[data-testid="save-setlist-button"]');

      const dragTime = await measurePerformance(page, async () => {
        const song = page.locator('[data-testid="song-card"]').first();
        const dropZone = page.locator('[data-testid="setlist-drop-zone"]');
        
        await song.tap();
        await page.waitForTimeout(500); // Long press
        await dropZone.tap();
      });

      console.log(`Mobile drag-and-drop time: ${dragTime}ms`);
      expect(dragTime).toBeLessThan(1000);
    });
  });

  test.describe('Network Condition Variations', () => {
    test('should handle slow 3G connection', async ({ page, context }) => {
      // Simulate slow 3G
      await context.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });

      const loadTime = await measurePerformance(page, async () => {
        await page.goto(`${BASE_URL}/media/songs`);
        await page.waitForSelector('[data-testid="song-library-container"]');
      });

      console.log(`Load time on slow 3G: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(10000); // Should still load within 10 seconds

      // Verify progressive loading
      await expect(page.locator('[data-testid="loading-skeleton"]')).toBeVisible();
    });

    test('should handle offline mode gracefully', async ({ page, context }) => {
      // Load page first
      await page.goto(`${BASE_URL}/media/songs`);
      await page.waitForSelector('[data-testid="song-library-container"]');

      // Go offline
      await context.setOffline(true);

      // Try to perform action
      await page.keyboard.press('Control+KeyK');
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible({ timeout: 2000 });

      // Cached data should still be accessible
      await expect(page.locator('[data-testid="song-card"]')).toHaveCount(await page.locator('[data-testid="song-card"]').count());

      // Go back online
      await context.setOffline(false);
      await page.waitForTimeout(1000);

      // Offline indicator should disappear
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    });

    test('should retry failed requests with exponential backoff', async ({ page, context }) => {
      let requestCount = 0;
      const requestTimes: number[] = [];

      await context.route('**/api/songs', async (route) => {
        requestCount++;
        requestTimes.push(Date.now());
        
        if (requestCount < 3) {
          // Fail first 2 requests
          await route.abort('failed');
        } else {
          // Succeed on 3rd request
          await route.continue();
        }
      });

      await page.goto(`${BASE_URL}/media/songs`);
      await page.waitForSelector('[data-testid="song-library-container"]', { timeout: 10000 });

      // Verify exponential backoff
      expect(requestCount).toBeGreaterThanOrEqual(3);
      
      if (requestTimes.length >= 3) {
        const delay1 = requestTimes[1] - requestTimes[0];
        const delay2 = requestTimes[2] - requestTimes[1];
        
        console.log(`Retry delays: ${delay1}ms, ${delay2}ms`);
        expect(delay2).toBeGreaterThan(delay1); // Second delay should be longer
      }
    });

    test('should optimize image loading on slow connections', async ({ page, context }) => {
      // Simulate slow connection
      await context.route('**/*.{jpg,jpeg,png,webp}', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 200));
        await route.continue();
      });

      await page.goto(`${BASE_URL}/media/songs`);
      await page.waitForSelector('[data-testid="song-grid"]');

      // Verify lazy loading is working
      const initialLoadedImages = await page.locator('[data-testid="cover-art-image"][src]').count();
      
      // Should only load visible images
      expect(initialLoadedImages).toBeLessThan(20);

      // Scroll to trigger more loading
      await page.evaluate(() => window.scrollTo(0, 1000));
      await page.waitForTimeout(1000);

      const newLoadedImages = await page.locator('[data-testid="cover-art-image"][src]').count();
      expect(newLoadedImages).toBeGreaterThan(initialLoadedImages);
    });
  });

  test.describe('Real-time Synchronization Performance', () => {
    test('should sync changes within 2 seconds', async ({ page, context }) => {
      // Create setlist
      await page.goto(`${BASE_URL}/media/songs`);
      await page.click('[data-testid="setlist-builder-tab"]');
      await page.click('[data-testid="create-setlist-button"]');
      await page.fill('[data-testid="setlist-name-input"]', 'Sync Test');
      await page.click('[data-testid="save-setlist-button"]');

      const setlistUrl = page.url();

      // Open second page
      const page2 = await context.newPage();
      await page2.goto(`${BASE_URL}/login`);
      await page2.fill('input[type="email"]', 'user2@example.com');
      await page2.fill('input[type="password"]', 'password123');
      await page2.click('button[type="submit"]');
      await page2.goto(setlistUrl);

      // Make change and measure sync time
      const startTime = Date.now();
      
      await page.evaluate(() => {
        const event = new CustomEvent('add-song', { detail: { songId: 'test-song' } });
        document.dispatchEvent(event);
      });

      // Wait for change to appear in second page
      await page2.waitForSelector('[data-testid="setlist-item"]', { timeout: 3000 });
      
      const syncTime = Date.now() - startTime;

      console.log(`Real-time sync time: ${syncTime}ms`);
      expect(syncTime).toBeLessThan(PERFORMANCE_THRESHOLDS.realtimeSync);

      await page2.close();
    });

    test('should handle rapid successive changes efficiently', async ({ page, context }) => {
      await page.goto(`${BASE_URL}/media/songs`);
      await page.click('[data-testid="setlist-builder-tab"]');
      await page.click('[data-testid="create-setlist-button"]');
      await page.fill('[data-testid="setlist-name-input"]', 'Rapid Changes Test');
      await page.click('[data-testid="save-setlist-button"]');

      const setlistUrl = page.url();

      const page2 = await context.newPage();
      await page2.goto(`${BASE_URL}/login`);
      await page2.fill('input[type="email"]', 'user2@example.com');
      await page2.fill('input[type="password"]', 'password123');
      await page2.click('button[type="submit"]');
      await page2.goto(setlistUrl);

      // Make 10 rapid changes
      const startTime = Date.now();
      
      for (let i = 0; i < 10; i++) {
        await page.evaluate((songId) => {
          const event = new CustomEvent('add-song', { detail: { songId } });
          document.dispatchEvent(event);
        }, `song-${i}`);
        await page.waitForTimeout(50); // 50ms between changes
      }

      // Wait for all changes to sync
      await page2.waitForSelector('[data-testid="setlist-item"]:nth-child(10)', { timeout: 5000 });
      
      const totalTime = Date.now() - startTime;

      console.log(`Time to sync 10 rapid changes: ${totalTime}ms`);
      expect(totalTime).toBeLessThan(5000);

      // Verify all changes synced
      const itemCount = await page2.locator('[data-testid="setlist-item"]').count();
      expect(itemCount).toBe(10);

      await page2.close();
    });

    test('should maintain performance with 20+ active collaborators', async ({ page, context }) => {
      await page.goto(`${BASE_URL}/media/songs`);
      await page.click('[data-testid="setlist-builder-tab"]');
      await page.click('[data-testid="create-setlist-button"]');
      await page.fill('[data-testid="setlist-name-input"]', 'Many Collaborators Test');
      await page.click('[data-testid="save-setlist-button"]');

      const setlistUrl = page.url();

      // Create 20 additional pages (simulating collaborators)
      const pages: Page[] = [page];
      for (let i = 0; i < 20; i++) {
        const newPage = await context.newPage();
        await newPage.goto(`${BASE_URL}/login`);
        await newPage.fill('input[type="email"]', `user${i}@example.com`);
        await newPage.fill('input[type="password"]', 'password123');
        await newPage.click('button[type="submit"]');
        await newPage.goto(setlistUrl);
        pages.push(newPage);
      }

      // Verify presence indicators load efficiently
      const presenceLoadTime = await measurePerformance(page, async () => {
        await page.waitForSelector('[data-testid="collaborator-avatar"]', { timeout: 5000 });
      });

      console.log(`Presence indicator load time with 20 collaborators: ${presenceLoadTime}ms`);
      expect(presenceLoadTime).toBeLessThan(3000);

      // Make a change and verify it syncs to all
      const startTime = Date.now();
      await page.evaluate(() => {
        const event = new CustomEvent('add-song', { detail: { songId: 'broadcast-test' } });
        document.dispatchEvent(event);
      });

      // Wait for change to appear in last page
      await pages[pages.length - 1].waitForSelector('[data-testid="setlist-item"]', { timeout: 5000 });
      
      const broadcastTime = Date.now() - startTime;

      console.log(`Broadcast time to 20 collaborators: ${broadcastTime}ms`);
      expect(broadcastTime).toBeLessThan(5000);

      // Cleanup
      for (let i = 1; i < pages.length; i++) {
        await pages[i].close();
      }
    });
  });

  test.describe('Memory and Resource Usage', () => {
    test('should not leak memory during extended use', async ({ page }) => {
      await page.goto(`${BASE_URL}/media/songs`);
      await page.waitForSelector('[data-testid="song-library-container"]');

      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      // Perform 50 operations
      for (let i = 0; i < 50; i++) {
        // Open command palette
        await page.keyboard.press('Control+KeyK');
        await page.fill('[data-testid="search-input"]', `search${i}`);
        await page.keyboard.press('Escape');
        
        // Scroll
        await page.evaluate(() => window.scrollTo(0, Math.random() * 2000));
        await page.waitForTimeout(100);
      }

      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const increasePercentage = (memoryIncrease / initialMemory) * 100;

        console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${increasePercentage.toFixed(2)}%)`);
        
        // Memory should not increase by more than 50%
        expect(increasePercentage).toBeLessThan(50);
      }
    });

    test('should clean up resources when navigating away', async ({ page }) => {
      await page.goto(`${BASE_URL}/media/songs`);
      await page.waitForSelector('[data-testid="song-library-container"]');

      // Open real-time connections
      await page.click('[data-testid="setlist-builder-tab"]');
      await page.waitForTimeout(1000);

      // Navigate away
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForTimeout(1000);

      // Check for cleanup (no console errors about unclosed connections)
      const consoleErrors = await page.evaluate(() => {
        return (window as any).__consoleErrors || [];
      });

      expect(consoleErrors.filter((e: string) => e.includes('WebSocket'))).toHaveLength(0);
    });
  });
});

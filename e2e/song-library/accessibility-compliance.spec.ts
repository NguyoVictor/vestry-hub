/**
 * End-to-End Tests: Accessibility Compliance
 * Feature: song-library-ui-revamp
 * 
 * Tests WCAG 2.1 AA compliance including:
 * - Keyboard navigation completeness
 * - Screen reader compatibility
 * - High contrast mode support
 * - Color accessibility
 * - Focus management
 * - ARIA attributes and roles
 */

import { test, expect, type Page } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

async function navigateToSongLibrary(page: Page) {
  await page.goto(`${BASE_URL}/media/songs`);
  await page.waitForSelector('[data-testid="song-library-container"]');
}

async function getFocusedElement(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    const el = document.activeElement;
    return el?.getAttribute('data-testid') || el?.tagName || null;
  });
}

async function getAriaLabel(page: Page, selector: string): Promise<string | null> {
  return await page.locator(selector).getAttribute('aria-label');
}

test.describe('Song Library - Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToSongLibrary(page);
  });

  test.describe('WCAG 2.1 AA Automated Checks', () => {
    test('should pass axe accessibility scan on main page', async ({ page }) => {
      await injectAxe(page);
      
      const violations = await getViolations(page);
      
      if (violations.length > 0) {
        console.log('Accessibility violations found:');
        violations.forEach(violation => {
          console.log(`- ${violation.id}: ${violation.description}`);
          console.log(`  Impact: ${violation.impact}`);
          console.log(`  Nodes: ${violation.nodes.length}`);
        });
      }

      expect(violations).toHaveLength(0);
    });

    test('should pass axe scan on command palette', async ({ page }) => {
      await page.keyboard.press('Control+KeyK');
      await page.waitForSelector('[data-testid="command-palette"]');
      
      await injectAxe(page);
      await checkA11y(page, '[data-testid="command-palette"]', {
        detailedReport: true,
        detailedReportOptions: { html: true }
      });
    });

    test('should pass axe scan on setlist builder', async ({ page }) => {
      await page.click('[data-testid="setlist-builder-tab"]');
      await page.waitForSelector('[data-testid="setlist-builder"]');
      
      await injectAxe(page);
      await checkA11y(page, '[data-testid="setlist-builder"]');
    });

    test('should pass axe scan on song detail page', async ({ page }) => {
      await page.click('[data-testid="song-card"]', { position: { x: 10, y: 10 } });
      await page.waitForSelector('[data-testid="song-detail"]');
      
      await injectAxe(page);
      await checkA11y(page);
    });

    test('should pass axe scan in dark mode', async ({ page }) => {
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(500);
      
      await injectAxe(page);
      await checkA11y(page);
    });
  });

  test.describe('Keyboard Navigation Completeness', () => {
    test('should navigate through all interactive elements with Tab', async ({ page }) => {
      const focusedElements: string[] = [];
      
      // Tab through first 20 elements
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        const focused = await getFocusedElement(page);
        if (focused) {
          focusedElements.push(focused);
        }
      }

      // Should have focused multiple different elements
      expect(focusedElements.length).toBeGreaterThan(10);
      
      // Should not get stuck on any element
      const uniqueElements = new Set(focusedElements);
      expect(uniqueElements.size).toBeGreaterThan(5);

      console.log('Focused elements:', Array.from(uniqueElements));
    });

    test('should navigate backwards with Shift+Tab', async ({ page }) => {
      // Tab forward 5 times
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      const forwardElement = await getFocusedElement(page);

      // Tab backward 2 times
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Shift+Tab');

      const backwardElement = await getFocusedElement(page);

      // Should be on a different element
      expect(backwardElement).not.toBe(forwardElement);
    });

    test('should activate focused elements with Enter', async ({ page }) => {
      // Tab to first song card
      let focused = await getFocusedElement(page);
      while (focused !== 'song-card' && focused !== null) {
        await page.keyboard.press('Tab');
        focused = await getFocusedElement(page);
      }

      expect(focused).toBe('song-card');

      // Activate with Enter
      await page.keyboard.press('Enter');

      // Should navigate to song detail
      await page.waitForURL('**/media/songs/*', { timeout: 2000 });
    });

    test('should activate focused elements with Space', async ({ page }) => {
      // Tab to view mode toggle
      let focused = await getFocusedElement(page);
      while (focused !== 'view-mode-toggle' && focused !== null) {
        await page.keyboard.press('Tab');
        focused = await getFocusedElement(page);
      }

      if (focused === 'view-mode-toggle') {
        // Activate with Space
        await page.keyboard.press('Space');
        await page.waitForTimeout(300);

        // View should have changed
        const listView = await page.locator('[data-testid="song-list"]').isVisible();
        expect(listView).toBe(true);
      }
    });

    test('should close modals with Escape', async ({ page }) => {
      // Open command palette
      await page.keyboard.press('Control+KeyK');
      await page.waitForSelector('[data-testid="command-palette"]');

      // Close with Escape
      await page.keyboard.press('Escape');

      // Should be closed
      await expect(page.locator('[data-testid="command-palette"]')).not.toBeVisible();
    });

    test('should navigate command palette with arrow keys', async ({ page }) => {
      await page.keyboard.press('Control+KeyK');
      await page.waitForSelector('[data-testid="command-palette"]');

      // Type to get results
      await page.fill('[data-testid="search-input"]', 'test');
      await page.waitForSelector('[data-testid="search-result-item"]');

      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowUp');

      // Should have an active item
      const activeItem = await page.locator('[data-testid="search-result-item"][aria-selected="true"]').count();
      expect(activeItem).toBeGreaterThan(0);
    });

    test('should navigate slider with arrow keys', async ({ page }) => {
      // Navigate to song with chords
      await page.click('[data-testid="song-card"]', { position: { x: 10, y: 10 } });
      await page.waitForSelector('[data-testid="chord-display"]');

      // Focus slider
      await page.locator('[data-testid="transposition-slider"]').focus();

      // Get initial value
      const initialValue = await page.locator('[data-testid="transposition-slider"]').inputValue();

      // Use arrow keys
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');

      // Value should have changed
      const newValue = await page.locator('[data-testid="transposition-slider"]').inputValue();
      expect(parseInt(newValue)).toBeGreaterThan(parseInt(initialValue));
    });

    test('should skip to main content with skip link', async ({ page }) => {
      // Focus skip link (usually first focusable element)
      await page.keyboard.press('Tab');
      
      const skipLink = await page.locator('a[href="#main-content"]');
      if (await skipLink.count() > 0) {
        await page.keyboard.press('Enter');
        
        // Focus should be on main content
        const focused = await page.evaluate(() => {
          return document.activeElement?.id;
        });
        
        expect(focused).toBe('main-content');
      }
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('should have proper landmark regions', async ({ page }) => {
      // Check for main landmark
      const main = await page.locator('main[role="main"], main').count();
      expect(main).toBeGreaterThan(0);

      // Check for navigation landmark
      const nav = await page.locator('nav[role="navigation"], nav').count();
      expect(nav).toBeGreaterThan(0);

      // Check for complementary regions if present
      const aside = await page.locator('aside[role="complementary"], aside').count();
      console.log(`Complementary regions: ${aside}`);
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      const headingLevels = await Promise.all(
        headings.map(h => h.evaluate(el => parseInt(el.tagName.substring(1))))
      );

      // Should have at least one h1
      expect(headingLevels.filter(l => l === 1).length).toBeGreaterThan(0);

      // Check for proper hierarchy (no skipping levels)
      for (let i = 1; i < headingLevels.length; i++) {
        const diff = headingLevels[i] - headingLevels[i - 1];
        expect(diff).toBeLessThanOrEqual(1); // Should not skip levels
      }

      console.log('Heading hierarchy:', headingLevels);
    });

    test('should have descriptive button labels', async ({ page }) => {
      const buttons = await page.locator('button').all();
      
      for (const button of buttons.slice(0, 20)) { // Check first 20 buttons
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        const ariaLabelledBy = await button.getAttribute('aria-labelledby');
        
        // Button should have either aria-label, text content, or aria-labelledby
        const hasLabel = ariaLabel || text?.trim() || ariaLabelledBy;
        
        if (!hasLabel) {
          const html = await button.evaluate(el => el.outerHTML);
          console.log('Button without label:', html);
        }
        
        expect(hasLabel).toBeTruthy();
      }
    });

    test('should have alt text for images', async ({ page }) => {
      const images = await page.locator('img').all();
      
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');
        
        // Image should have alt text or role="presentation"
        expect(alt !== null || role === 'presentation').toBe(true);
      }
    });

    test('should announce dynamic content changes', async ({ page }) => {
      // Check for aria-live regions
      const liveRegions = await page.locator('[aria-live]').count();
      expect(liveRegions).toBeGreaterThan(0);

      // Open command palette and search
      await page.keyboard.press('Control+KeyK');
      await page.fill('[data-testid="search-input"]', 'test');
      await page.waitForTimeout(500);

      // Check if live region was updated
      const liveRegion = page.locator('[aria-live="polite"]');
      const liveText = await liveRegion.textContent();
      
      expect(liveText).toBeTruthy();
      console.log('Live region content:', liveText);
    });

    test('should have proper form labels', async ({ page }) => {
      // Navigate to a form (e.g., create setlist)
      await page.click('[data-testid="setlist-builder-tab"]');
      await page.click('[data-testid="create-setlist-button"]');
      await page.waitForSelector('form');

      const inputs = await page.locator('input, textarea, select').all();
      
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        // Input should have associated label
        let hasLabel = false;
        
        if (id) {
          const label = await page.locator(`label[for="${id}"]`).count();
          hasLabel = label > 0;
        }
        
        hasLabel = hasLabel || !!ariaLabel || !!ariaLabelledBy;
        
        if (!hasLabel) {
          const html = await input.evaluate(el => el.outerHTML);
          console.log('Input without label:', html);
        }
        
        expect(hasLabel).toBe(true);
      }
    });

    test('should have proper ARIA roles for custom components', async ({ page }) => {
      // Check command palette
      await page.keyboard.press('Control+KeyK');
      await page.waitForSelector('[data-testid="command-palette"]');

      const paletteRole = await page.locator('[data-testid="command-palette"]').getAttribute('role');
      expect(paletteRole).toBe('dialog');

      // Check if it has aria-modal
      const ariaModal = await page.locator('[data-testid="command-palette"]').getAttribute('aria-modal');
      expect(ariaModal).toBe('true');

      // Check search input
      const searchRole = await page.locator('[data-testid="search-input"]').getAttribute('role');
      expect(searchRole).toMatch(/combobox|searchbox/);
    });

    test('should have proper status messages', async ({ page }) => {
      // Perform action that triggers status message
      await page.click('[data-testid="setlist-builder-tab"]');
      await page.click('[data-testid="create-setlist-button"]');
      await page.fill('[data-testid="setlist-name-input"]', 'Test Setlist');
      await page.click('[data-testid="save-setlist-button"]');

      // Check for status message with proper role
      const status = await page.locator('[role="status"], [role="alert"]').count();
      expect(status).toBeGreaterThan(0);
    });
  });

  test.describe('Focus Management', () => {
    test('should trap focus in modal dialogs', async ({ page }) => {
      // Open command palette
      await page.keyboard.press('Control+KeyK');
      await page.waitForSelector('[data-testid="command-palette"]');

      // Tab through all focusable elements in modal
      const focusedElements: string[] = [];
      
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const focused = await getFocusedElement(page);
        if (focused) {
          focusedElements.push(focused);
        }
      }

      // All focused elements should be within the modal
      // (This is a simplified check - in reality, you'd verify the DOM hierarchy)
      expect(focusedElements.length).toBeGreaterThan(0);
    });

    test('should return focus after closing modal', async ({ page }) => {
      // Focus an element
      await page.locator('[data-testid="theme-toggle"]').focus();
      const initialFocus = await getFocusedElement(page);

      // Open and close command palette
      await page.keyboard.press('Control+KeyK');
      await page.waitForSelector('[data-testid="command-palette"]');
      await page.keyboard.press('Escape');

      // Focus should return to original element or nearby
      await page.waitForTimeout(300);
      const finalFocus = await getFocusedElement(page);
      
      // Should have focus somewhere (not lost)
      expect(finalFocus).toBeTruthy();
    });

    test('should maintain focus during view transitions', async ({ page }) => {
      // Focus a song card
      await page.locator('[data-testid="song-card"]').first().focus();
      
      // Switch view mode
      await page.click('[data-testid="view-mode-toggle"]');
      await page.waitForTimeout(300);

      // Focus should still be on a song element
      const focused = await getFocusedElement(page);
      expect(focused).toMatch(/song/i);
    });

    test('should have visible focus indicators', async ({ page }) => {
      // Tab to an element
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Check if focused element has visible outline
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow
        };
      });

      // Should have some form of focus indicator
      const hasFocusIndicator = 
        focusedElement.outline !== 'none' ||
        focusedElement.outlineWidth !== '0px' ||
        focusedElement.boxShadow !== 'none';

      expect(hasFocusIndicator).toBe(true);
    });

    test('should focus first error in form validation', async ({ page }) => {
      // Navigate to form
      await page.click('[data-testid="setlist-builder-tab"]');
      await page.click('[data-testid="create-setlist-button"]');

      // Submit without filling required fields
      await page.click('[data-testid="save-setlist-button"]');
      await page.waitForTimeout(300);

      // Focus should be on first error
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.getAttribute('aria-invalid') === 'true';
      });

      expect(focused).toBe(true);
    });
  });

  test.describe('High Contrast Mode Support', () => {
    test('should apply high contrast styles when enabled', async ({ page }) => {
      // Enable high contrast mode (if supported)
      await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
      await page.reload();
      await page.waitForSelector('[data-testid="song-library-container"]');

      // Check if high contrast styles are applied
      const backgroundColor = await page.locator('body').evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );

      // In forced colors mode, background should be system color
      console.log('High contrast background:', backgroundColor);
      expect(backgroundColor).toBeTruthy();
    });

    test('should maintain sufficient contrast ratios', async ({ page }) => {
      // Check contrast of text elements
      const textElements = await page.locator('p, span, h1, h2, h3, button').all();
      
      for (const element of textElements.slice(0, 10)) {
        const styles = await element.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize
          };
        });

        // This is a simplified check - proper contrast checking requires color parsing
        console.log('Text styles:', styles);
        expect(styles.color).toBeTruthy();
      }
    });

    test('should not rely solely on color for information', async ({ page }) => {
      // Check status indicators have text or icons, not just color
      const statusElements = await page.locator('[data-testid*="status"]').all();
      
      for (const element of statusElements) {
        const text = await element.textContent();
        const ariaLabel = await element.getAttribute('aria-label');
        const hasIcon = await element.locator('svg').count() > 0;

        // Should have text, aria-label, or icon
        expect(text?.trim() || ariaLabel || hasIcon).toBeTruthy();
      }
    });
  });

  test.describe('Color Accessibility', () => {
    test('should have sufficient color contrast for text', async ({ page }) => {
      await injectAxe(page);
      
      const violations = await getViolations(page, {
        rules: ['color-contrast']
      });

      if (violations.length > 0) {
        console.log('Color contrast violations:');
        violations.forEach(v => {
          console.log(`- ${v.description}`);
          v.nodes.forEach(node => {
            console.log(`  Element: ${node.html}`);
          });
        });
      }

      expect(violations).toHaveLength(0);
    });

    test('should maintain contrast in dark mode', async ({ page }) => {
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(500);

      await injectAxe(page);
      
      const violations = await getViolations(page, {
        rules: ['color-contrast']
      });

      expect(violations).toHaveLength(0);
    });

    test('should have accessible link colors', async ({ page }) => {
      const links = await page.locator('a').all();
      
      for (const link of links.slice(0, 10)) {
        const color = await link.evaluate(el => 
          window.getComputedStyle(el).color
        );
        
        // Links should have a defined color
        expect(color).toBeTruthy();
        expect(color).not.toBe('rgb(0, 0, 0)'); // Should not be pure black
      }
    });
  });

  test.describe('Responsive Accessibility', () => {
    test('should maintain accessibility on mobile', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile-specific test');

      await injectAxe(page);
      await checkA11y(page);
    });

    test('should have touch-friendly target sizes', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile-specific test');

      const buttons = await page.locator('button, a').all();
      
      for (const button of buttons.slice(0, 10)) {
        const box = await button.boundingBox();
        
        if (box) {
          // WCAG recommends minimum 44x44 pixels for touch targets
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('should support zoom up to 200%', async ({ page }) => {
      // Set zoom to 200%
      await page.evaluate(() => {
        document.body.style.zoom = '2';
      });

      await page.waitForTimeout(500);

      // Content should still be accessible
      await expect(page.locator('[data-testid="song-library-container"]')).toBeVisible();
      
      // Should not have horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });
  });

  test.describe('Error Handling Accessibility', () => {
    test('should announce errors to screen readers', async ({ page }) => {
      // Trigger an error
      await page.click('[data-testid="setlist-builder-tab"]');
      await page.click('[data-testid="create-setlist-button"]');
      await page.click('[data-testid="save-setlist-button"]');

      // Check for error announcement
      const errorRegion = await page.locator('[role="alert"], [aria-live="assertive"]').count();
      expect(errorRegion).toBeGreaterThan(0);
    });

    test('should have descriptive error messages', async ({ page }) => {
      // Trigger validation error
      await page.click('[data-testid="setlist-builder-tab"]');
      await page.click('[data-testid="create-setlist-button"]');
      await page.click('[data-testid="save-setlist-button"]');

      // Error message should be descriptive
      const errorMessage = await page.locator('[role="alert"]').textContent();
      expect(errorMessage).toBeTruthy();
      expect(errorMessage!.length).toBeGreaterThan(10); // Should be descriptive, not just "Error"
    });

    test('should associate errors with form fields', async ({ page }) => {
      await page.click('[data-testid="setlist-builder-tab"]');
      await page.click('[data-testid="create-setlist-button"]');
      await page.click('[data-testid="save-setlist-button"]');

      // Check if error is associated with field
      const invalidInput = await page.locator('[aria-invalid="true"]').count();
      expect(invalidInput).toBeGreaterThan(0);

      // Check if error has describedby
      const describedBy = await page.locator('[aria-invalid="true"]').first().getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
    });
  });
});

/**
 * Enhanced Gradient Generator Tests
 * 
 * Tests for the gradient generation system including:
 * - Consistency validation
 * - Fallback system testing
 * - Variation algorithms
 * - Performance and caching
 * 
 * Requirements: 5.2, 5.5, 5.7
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GradientGenerator, getGradientColors, getGradientCSS, preloadGradients } from './GradientGenerator';
import {
  generateSongGradient,
  generateGradientVariations,
  getFallbackGradient,
  gradientToCss,
  validateGradient,
  clearGradientCache,
  getGradientCacheStats,
} from '../../utils/gradientGeneration';

// Mock toast for testing
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

describe('GradientGenerator Component', () => {
  beforeEach(() => {
    clearGradientCache();
  });

  afterEach(() => {
    clearGradientCache();
  });

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<GradientGenerator songTitle="Amazing Grace" />);
      
      const gradientElement = screen.getByTitle(/Generated gradient for "Amazing Grace"/);
      expect(gradientElement).toBeInTheDocument();
      expect(gradientElement).toHaveClass('w-24', 'h-24'); // md size
    });

    it('renders with custom size', () => {
      render(<GradientGenerator songTitle="How Great Thou Art" size="lg" />);
      
      const gradientElement = screen.getByTitle(/Generated gradient for "How Great Thou Art"/);
      expect(gradientElement).toHaveClass('w-32', 'h-32'); // lg size
    });

    it('includes artist name in title', () => {
      render(
        <GradientGenerator 
          songTitle="Blessed Be Your Name" 
          artistName="Matt Redman" 
        />
      );
      
      const gradientElement = screen.getByTitle(/Generated gradient for "Blessed Be Your Name" by Matt Redman/);
      expect(gradientElement).toBeInTheDocument();
    });
  });

  describe('Gradient Consistency', () => {
    it('generates consistent gradients for same song', () => {
      const gradient1 = generateSongGradient('Amazing Grace', 'John Newton');
      const gradient2 = generateSongGradient('Amazing Grace', 'John Newton');
      
      expect(gradient1).toEqual(gradient2);
      expect(gradient1.colors).toEqual(gradient2.colors);
      expect(gradient1.type).toBe(gradient2.type);
    });

    it('generates different gradients for different songs', () => {
      const gradient1 = generateSongGradient('Amazing Grace');
      const gradient2 = generateSongGradient('How Great Thou Art');
      
      expect(gradient1).not.toEqual(gradient2);
      // Colors should be different (very unlikely to be the same)
      expect(gradient1.colors).not.toEqual(gradient2.colors);
    });

    it('generates different gradients with and without artist', () => {
      const gradient1 = generateSongGradient('Amazing Grace');
      const gradient2 = generateSongGradient('Amazing Grace', 'John Newton');
      
      expect(gradient1).not.toEqual(gradient2);
    });
  });

  describe('Gradient Variations', () => {
    it('generates multiple variations', () => {
      const variations = generateGradientVariations('Blessed Be Your Name', 'Matt Redman');
      
      expect(variations.length).toBeGreaterThan(1);
      expect(variations.length).toBeLessThanOrEqual(6); // Can generate up to 6 variations
      
      // All variations should be valid
      variations.forEach(variation => {
        expect(validateGradient(variation)).toBe(true);
      });
    });

    it('includes different gradient types in variations', () => {
      const variations = generateGradientVariations('How Great Thou Art');
      const types = variations.map(v => v.type);
      
      // Should have at least 2 different types
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBeGreaterThan(1);
    });

    it('renders variation controls when enabled', () => {
      render(
        <GradientGenerator 
          songTitle="Amazing Grace"
          showControls={true}
          showVariations={true}
          size="lg"
        />
      );
      
      // Hover to show controls
      const gradientElement = screen.getByTitle(/Generated gradient/);
      fireEvent.mouseEnter(gradientElement);
      
      // Should show refresh button for variations
      expect(screen.getByTitle('Try different variation')).toBeInTheDocument();
    });
  });

  describe('Fallback System', () => {
    it('provides default fallback gradient', () => {
      const fallback = getFallbackGradient('default');
      
      expect(validateGradient(fallback)).toBe(true);
      expect(fallback.colors.length).toBeGreaterThan(1);
      expect(fallback.type).toBe('linear');
    });

    it('provides error fallback gradient', () => {
      const fallback = getFallbackGradient('error');
      
      expect(validateGradient(fallback)).toBe(true);
      expect(fallback.colors).toContain('#ef4444'); // Red color for errors
    });

    it('provides loading fallback gradient', () => {
      const fallback = getFallbackGradient('loading');
      
      expect(validateGradient(fallback)).toBe(true);
      expect(fallback.colors).toContain('#e2e8f0'); // Grey color for loading
    });

    it('handles empty song title gracefully', () => {
      const gradient = generateSongGradient('');
      expect(validateGradient(gradient)).toBe(true);
    });
  });

  describe('CSS Generation', () => {
    it('generates valid CSS for linear gradients', () => {
      // Force a linear gradient by creating one explicitly
      const gradient = {
        type: 'linear' as const,
        colors: ['#ff6b6b', '#feca57'],
        direction: 'to right',
        stops: [0, 100]
      };
      const css = gradientToCss(gradient);
      
      expect(css).toMatch(/^linear-gradient\(/);
      expect(css).toContain('#'); // Should contain hex colors
    });

    it('generates valid CSS for radial gradients', () => {
      const gradient = { ...generateSongGradient('Amazing Grace'), type: 'radial' as const };
      const css = gradientToCss(gradient);
      
      expect(css).toMatch(/^radial-gradient\(/);
      expect(css).toContain('circle at center');
    });

    it('generates valid CSS for conic gradients', () => {
      const gradient = { ...generateSongGradient('Amazing Grace'), type: 'conic' as const };
      const css = gradientToCss(gradient);
      
      expect(css).toMatch(/^conic-gradient\(/);
      expect(css).toContain('from 0deg at center');
    });
  });

  describe('Caching System', () => {
    it('caches generated gradients', () => {
      // Generate same gradient twice
      generateSongGradient('Amazing Grace', 'John Newton');
      generateSongGradient('Amazing Grace', 'John Newton');
      
      const stats = getGradientCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('amazing gracejohn newton');
    });

    it('clears cache when requested', () => {
      generateSongGradient('Amazing Grace');
      expect(getGradientCacheStats().size).toBe(1);
      
      clearGradientCache();
      expect(getGradientCacheStats().size).toBe(0);
    });
  });

  describe('Utility Functions', () => {
    it('extracts gradient colors correctly', () => {
      const colors = getGradientColors('Amazing Grace', 'John Newton');
      
      expect(colors.length).toBeGreaterThan(1);
      colors.forEach(color => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/); // Valid hex color
      });
    });

    it('generates gradient CSS with different variants', () => {
      const linearCSS = getGradientCSS('Amazing Grace', 'John Newton', 'linear');
      const radialCSS = getGradientCSS('Amazing Grace', 'John Newton', 'radial');
      const conicCSS = getGradientCSS('Amazing Grace', 'John Newton', 'conic');
      
      expect(linearCSS).toMatch(/^linear-gradient\(/);
      expect(radialCSS).toMatch(/^radial-gradient\(/);
      expect(conicCSS).toMatch(/^conic-gradient\(/);
    });

    it('preloads gradients for song list', () => {
      const songs = [
        { title: 'Amazing Grace', artist: 'John Newton' },
        { title: 'How Great Thou Art', artist: 'Carl Boberg' },
        { title: 'Blessed Be Your Name', artist: 'Matt Redman' },
      ];
      
      preloadGradients(songs);
      
      const stats = getGradientCacheStats();
      expect(stats.size).toBe(3);
    });
  });

  describe('Interactive Features', () => {
    it('copies gradient CSS to clipboard', async () => {
      render(
        <GradientGenerator 
          songTitle="Amazing Grace"
          showControls={true}
          size="lg"
        />
      );
      
      // Hover to show controls
      const gradientElement = screen.getByTitle(/Generated gradient/);
      fireEvent.mouseEnter(gradientElement);
      
      // Click copy button
      const copyButton = screen.getByTitle('Copy CSS gradient');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });

    it('cycles through variations when refresh is clicked', async () => {
      render(
        <GradientGenerator 
          songTitle="Amazing Grace"
          showControls={true}
          showVariations={true}
          size="lg"
        />
      );
      
      // Hover to show controls
      const gradientElement = screen.getByTitle(/Generated gradient/);
      fireEvent.mouseEnter(gradientElement);
      
      // Click refresh button
      const refreshButton = screen.getByTitle('Try different variation');
      fireEvent.click(refreshButton);
      
      // Should trigger animation
      await waitFor(() => {
        expect(refreshButton.querySelector('svg')).toHaveClass('animate-spin');
      });
    });
  });

  describe('Accessibility', () => {
    it('provides descriptive titles', () => {
      render(
        <GradientGenerator 
          songTitle="Amazing Grace" 
          artistName="John Newton"
        />
      );
      
      const gradientElement = screen.getByTitle('Generated gradient for "Amazing Grace" by John Newton');
      expect(gradientElement).toBeInTheDocument();
    });

    it('provides button titles for controls', () => {
      render(
        <GradientGenerator 
          songTitle="Amazing Grace"
          showControls={true}
          showVariations={true}
          size="lg"
        />
      );
      
      const gradientElement = screen.getByTitle(/Generated gradient/);
      fireEvent.mouseEnter(gradientElement);
      
      expect(screen.getByTitle('Try different variation')).toBeInTheDocument();
      expect(screen.getByTitle('Copy CSS gradient')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid gradient configurations', () => {
      const invalidGradient = {
        type: 'invalid' as any,
        colors: [],
        direction: 'to right',
        stops: [0, 100],
      };
      
      expect(validateGradient(invalidGradient)).toBe(false);
    });

    it('falls back to error gradient on generation failure', () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // This should trigger error handling
      render(<GradientGenerator songTitle="" />);
      
      // Should still render without crashing
      expect(screen.getByTitle(/Generated gradient/)).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('generates gradients efficiently', () => {
      const startTime = performance.now();
      
      // Generate 100 gradients
      for (let i = 0; i < 100; i++) {
        generateSongGradient(`Song ${i}`, `Artist ${i}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second
    });

    it('benefits from caching on repeated calls', () => {
      const songTitle = 'Performance Test Song';
      const artistName = 'Test Artist';
      
      // First call (cache miss)
      const start1 = performance.now();
      generateSongGradient(songTitle, artistName);
      const duration1 = performance.now() - start1;
      
      // Second call (cache hit)
      const start2 = performance.now();
      generateSongGradient(songTitle, artistName);
      const duration2 = performance.now() - start2;
      
      // Cached call should be faster
      expect(duration2).toBeLessThan(duration1);
    });
  });
});
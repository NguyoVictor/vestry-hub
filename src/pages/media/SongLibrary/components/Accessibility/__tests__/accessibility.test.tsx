/**
 * Accessibility Tests for Song Library UI Revamp
 * 
 * Tests comprehensive accessibility features including:
 * - Keyboard navigation
 * - ARIA attributes
 * - Screen reader support
 * - Focus management
 * - High contrast mode
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

import { AccessibilityProvider } from '../AccessibilityProvider';
import { AccessibleSongCard } from '../AccessibleSongCard';
import { AccessibleSongGrid } from '../AccessibleSongGrid';
import { AccessibleCommandPalette } from '../AccessibleCommandPalette';
import { KeyboardShortcutsHelp } from '../KeyboardShortcutsHelp';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock song data
const mockSong = {
  id: '1',
  tenant_id: 'test',
  title: 'Amazing Grace',
  artist: 'John Newton',
  key: 'G',
  bpm: 120,
  tags: ['hymn', 'classic'],
  usage_count: 5,
  is_trending: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01'
};

const mockSongs = [
  mockSong,
  {
    ...mockSong,
    id: '2',
    title: 'How Great Thou Art',
    artist: 'Carl Boberg',
    key: 'C',
    bpm: 80,
    is_trending: false
  }
];

// Test wrapper with accessibility provider
const AccessibilityWrapper = ({ children }: { children: React.ReactNode }) => (
  <AccessibilityProvider>
    {children}
  </AccessibilityProvider>
);

describe('Accessibility Features', () => {
  describe('AccessibleSongCard', () => {
    const defaultProps = {
      song: mockSong,
      isSelected: false,
      isFocused: false,
      onSelect: jest.fn(),
      onPlay: jest.fn(),
      onFavorite: jest.fn(),
      onMoreOptions: jest.fn(),
      onFocus: jest.fn(),
      onKeyDown: jest.fn()
    };

    it('should have proper ARIA attributes', () => {
      render(
        <AccessibilityWrapper>
          <AccessibleSongCard {...defaultProps} />
        </AccessibilityWrapper>
      );

      const card = screen.getByRole('gridcell');
      expect(card).toHaveAttribute('aria-label');
      expect(card).toHaveAttribute('aria-selected', 'false');
      expect(card).toHaveAttribute('tabindex');
    });

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup();
      const onKeyDown = jest.fn();

      render(
        <AccessibilityWrapper>
          <AccessibleSongCard {...defaultProps} onKeyDown={onKeyDown} />
        </AccessibilityWrapper>
      );

      const card = screen.getByRole('gridcell');
      
      // Test Enter key
      await user.type(card, '{Enter}');
      expect(defaultProps.onSelect).toHaveBeenCalledWith(mockSong);

      // Test Space key
      await user.type(card, ' ');
      expect(defaultProps.onSelect).toHaveBeenCalledTimes(2);

      // Test P key for play
      await user.type(card, 'p');
      expect(defaultProps.onPlay).toHaveBeenCalledWith(mockSong);
    });

    it('should announce actions to screen readers', async () => {
      const user = userEvent.setup();

      render(
        <AccessibilityWrapper>
          <AccessibleSongCard {...defaultProps} />
        </AccessibilityWrapper>
      );

      const card = screen.getByRole('gridcell');
      
      // Focus should trigger announcement
      await user.click(card);
      
      // Check for screen reader content
      expect(screen.getByText(/Song: Amazing Grace/)).toBeInTheDocument();
    });

    it('should have no accessibility violations', async () => {
      const { container } = render(
        <AccessibilityWrapper>
          <AccessibleSongCard {...defaultProps} />
        </AccessibilityWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('AccessibleSongGrid', () => {
    const defaultProps = {
      songs: mockSongs,
      loading: false,
      selectedSongs: [],
      onSongSelect: jest.fn(),
      onSongPlay: jest.fn(),
      onSongFavorite: jest.fn(),
      onSongMoreOptions: jest.fn()
    };

    it('should have proper grid ARIA attributes', () => {
      render(
        <AccessibilityWrapper>
          <AccessibleSongGrid {...defaultProps} />
        </AccessibilityWrapper>
      );

      const grid = screen.getByRole('grid');
      expect(grid).toHaveAttribute('aria-label');
      expect(grid).toHaveAttribute('aria-rowcount');
      expect(grid).toHaveAttribute('aria-colcount');
    });

    it('should handle grid keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <AccessibilityWrapper>
          <AccessibleSongGrid {...defaultProps} />
        </AccessibilityWrapper>
      );

      const grid = screen.getByRole('grid');
      
      // Focus grid and test arrow key navigation
      await user.click(grid);
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{Home}');
      await user.keyboard('{End}');
    });

    it('should announce loading states', () => {
      render(
        <AccessibilityWrapper>
          <AccessibleSongGrid {...defaultProps} loading={true} />
        </AccessibilityWrapper>
      );

      const grid = screen.getByRole('grid');
      expect(grid).toHaveAttribute('aria-busy', 'true');
      expect(grid).toHaveAttribute('aria-label', 'Loading songs');
    });

    it('should have no accessibility violations', async () => {
      const { container } = render(
        <AccessibilityWrapper>
          <AccessibleSongGrid {...defaultProps} />
        </AccessibilityWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('AccessibleCommandPalette', () => {
    const defaultProps = {
      isOpen: true,
      onClose: jest.fn(),
      songs: mockSongs,
      onSongSelect: jest.fn()
    };

    it('should have proper combobox ARIA attributes', () => {
      render(
        <AccessibilityWrapper>
          <AccessibleCommandPalette {...defaultProps} />
        </AccessibilityWrapper>
      );

      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveAttribute('aria-expanded', 'true');
      expect(combobox).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('should handle search keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <AccessibilityWrapper>
          <AccessibleCommandPalette {...defaultProps} />
        </AccessibilityWrapper>
      );

      const input = screen.getByRole('combobox');
      
      // Type search query
      await user.type(input, 'Amazing');
      
      // Navigate results with arrow keys
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      
      expect(defaultProps.onSongSelect).toHaveBeenCalled();
    });

    it('should announce search results', async () => {
      const user = userEvent.setup();

      render(
        <AccessibilityWrapper>
          <AccessibleCommandPalette {...defaultProps} />
        </AccessibilityWrapper>
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'Amazing');
      
      // Should have live region for announcements
      expect(screen.getByLabelText(/results available/)).toBeInTheDocument();
    });

    it('should have no accessibility violations', async () => {
      const { container } = render(
        <AccessibilityWrapper>
          <AccessibleCommandPalette {...defaultProps} />
        </AccessibilityWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('KeyboardShortcutsHelp', () => {
    const defaultProps = {
      isOpen: true,
      onClose: jest.fn()
    };

    it('should have proper dialog ARIA attributes', () => {
      render(
        <AccessibilityWrapper>
          <KeyboardShortcutsHelp {...defaultProps} />
        </AccessibilityWrapper>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should handle escape key to close', async () => {
      const user = userEvent.setup();

      render(
        <AccessibilityWrapper>
          <KeyboardShortcutsHelp {...defaultProps} />
        </AccessibilityWrapper>
      );

      await user.keyboard('{Escape}');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should have keyboard shortcut descriptions', () => {
      render(
        <AccessibilityWrapper>
          <KeyboardShortcutsHelp {...defaultProps} />
        </AccessibilityWrapper>
      );

      expect(screen.getByText('General Navigation')).toBeInTheDocument();
      expect(screen.getByText('Song Grid Navigation')).toBeInTheDocument();
      expect(screen.getByText('Song Actions')).toBeInTheDocument();
    });

    it('should have no accessibility violations', async () => {
      const { container } = render(
        <AccessibilityWrapper>
          <KeyboardShortcutsHelp {...defaultProps} />
        </AccessibilityWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('High Contrast Mode', () => {
    it('should apply high contrast styles when enabled', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <AccessibilityWrapper>
          <AccessibleSongCard {...{
            song: mockSong,
            isSelected: false,
            isFocused: false,
            onSelect: jest.fn(),
            onPlay: jest.fn(),
            onFavorite: jest.fn(),
            onMoreOptions: jest.fn(),
            onFocus: jest.fn(),
            onKeyDown: jest.fn()
          }} />
        </AccessibilityWrapper>
      );

      // Check if high contrast class is applied
      expect(document.documentElement).toHaveClass('high-contrast');
    });
  });

  describe('Reduced Motion', () => {
    it('should respect reduced motion preferences', () => {
      // Mock reduced motion media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <AccessibilityWrapper>
          <AccessibleSongCard {...{
            song: mockSong,
            isSelected: false,
            isFocused: false,
            onSelect: jest.fn(),
            onPlay: jest.fn(),
            onFavorite: jest.fn(),
            onMoreOptions: jest.fn(),
            onFocus: jest.fn(),
            onKeyDown: jest.fn()
          }} />
        </AccessibilityWrapper>
      );

      // Check if reduced motion class is applied
      expect(document.documentElement).toHaveClass('reduce-motion');
    });
  });
});
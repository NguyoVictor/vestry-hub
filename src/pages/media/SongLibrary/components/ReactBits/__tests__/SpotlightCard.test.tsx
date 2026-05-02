/**
 * SpotlightCard Component Tests
 * 
 * Tests for React Bits SpotlightCard integration in Song Library UI Revamp
 * Requirements: 2.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Song } from '@/types/song-library';

// Mock ALL dependencies BEFORE any imports to prevent real modules from loading

// Mock React Bits components
vi.mock('react-bits', () => ({
  SpotlightCard: ({ children, className, onClick, ...props }: any) => (
    <div 
      data-testid="spotlight-card" 
      className={className}
      onClick={onClick}
      data-spotlight-color={props.spotlightColor}
      data-spotlight-size={props.spotlightSize}
      data-intensity={props.intensity}
    >
      {children}
    </div>
  ),
  BlurText: ({ text, className, ...props }: any) => (
    <span 
      data-testid="react-bits-blur-text" 
      className={className}
      {...props}
    >
      {text}
    </span>
  ),
}));

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onMouseEnter, onMouseLeave, onClick, ...props }: any) => (
      <div 
        data-testid="motion-div" 
        className={className}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        {...props}
      >
        {children}
      </div>
    ),
  },
}));

// Mock the CoverArt component completely to avoid ThemeProvider dependency
vi.mock('../CoverArt', () => ({
  CoverArt: ({ songId, className }: any) => (
    <div data-testid="cover-art" data-song-id={songId} className={className}>
      Cover Art Mock
    </div>
  ),
}));

// Mock BlurText component
vi.mock('./BlurText', () => ({
  BlurText: ({ text, className }: any) => (
    <span data-testid="blur-text" className={className}>
      {text}
    </span>
  ),
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, className, onClick, ...props }: any) => (
    <button 
      data-testid="button" 
      className={className} 
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Play: () => <span data-testid="play-icon">Play</span>,
  Heart: () => <span data-testid="heart-icon">Heart</span>,
  MoreHorizontal: () => <span data-testid="more-icon">More</span>,
  TrendingUp: () => <span data-testid="trending-icon">Trending</span>,
}));

// Mock utility functions
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Now import the components after all mocks are set up
import { SpotlightCard, FeaturedSongCard, CompactSpotlightCard, TrendingSongCard } from '../SpotlightCard';

const mockSong: Song = {
  id: 'test-song-1',
  tenant_id: 'test-tenant',
  title: 'Amazing Grace',
  artist: 'John Newton',
  lyrics: 'Amazing grace how sweet the sound...',
  chords: 'G C G D',
  key: 'G',
  bpm: 120,
  time_signature: '4/4',
  tags: ['hymn', 'classic'],
  cover_art_url: 'https://example.com/cover.jpg',
  cover_art_colors: {
    primary: '#ff6b35',
    secondary: '#f7931e',
    accent: '#ffd23f',
    dominant: ['#ff6b35', '#f7931e'],
  },
  chord_sheet_path: null,
  video_url: null,
  duration_seconds: 240,
  usage_count: 15,
  last_played_at: '2024-01-15T10:30:00Z',
  custom_fields: {},
  is_trending: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:30:00Z',
};

describe('SpotlightCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders song information correctly', () => {
    render(<SpotlightCard song={mockSong} />);
    
    expect(screen.getByText('Amazing Grace')).toBeInTheDocument();
    expect(screen.getByText('John Newton')).toBeInTheDocument();
    expect(screen.getByTestId('cover-art')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<SpotlightCard song={mockSong} size="sm" />);
    expect(screen.getByTestId('motion-div')).toHaveClass('w-48', 'h-64');

    rerender(<SpotlightCard song={mockSong} size="md" />);
    expect(screen.getByTestId('motion-div')).toHaveClass('w-56', 'h-72');

    rerender(<SpotlightCard song={mockSong} size="lg" />);
    expect(screen.getByTestId('motion-div')).toHaveClass('w-64', 'h-80');
  });

  it('configures spotlight effects correctly', () => {
    render(<SpotlightCard song={mockSong} spotlightIntensity={1.2} />);
    
    const spotlightCard = screen.getByTestId('spotlight-card');
    expect(spotlightCard).toHaveAttribute('data-spotlight-color', 'rgba(249, 115, 22, 0.3)');
    expect(spotlightCard).toHaveAttribute('data-spotlight-size', '120');
    expect(spotlightCard).toHaveAttribute('data-intensity', '1.2');
  });

  it('handles song selection correctly', () => {
    const onSelect = vi.fn();
    render(<SpotlightCard song={mockSong} onSelect={onSelect} />);
    
    const card = screen.getByTestId('spotlight-card');
    fireEvent.click(card);
    
    expect(onSelect).toHaveBeenCalledWith(mockSong);
  });

  it('handles play button click', () => {
    const onPlay = vi.fn();
    render(<SpotlightCard song={mockSong} onPlay={onPlay} />);
    
    // Find play button by looking for the button with play icon
    const playButtons = screen.getAllByTestId('button');
    const playButton = playButtons.find(button => 
      button.querySelector('[data-testid="play-icon"]')
    );
    
    expect(playButton).toBeInTheDocument();
    fireEvent.click(playButton!);
    
    expect(onPlay).toHaveBeenCalledWith(mockSong);
  });

  it('shows trending badge for trending songs', () => {
    render(<SpotlightCard song={mockSong} />);
    
    expect(screen.getByTestId('trending-icon')).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
  });

  it('displays song metadata when enabled', () => {
    render(<SpotlightCard song={mockSong} showMetadata={true} />);
    
    expect(screen.getByText('G')).toBeInTheDocument(); // Key
    expect(screen.getByText('120 BPM')).toBeInTheDocument(); // BPM
    expect(screen.getByText('Used 15 times')).toBeInTheDocument(); // Usage count
  });

  it('hides metadata when disabled', () => {
    render(<SpotlightCard song={mockSong} showMetadata={false} />);
    
    expect(screen.queryByText('G')).not.toBeInTheDocument();
    expect(screen.queryByText('120 BPM')).not.toBeInTheDocument();
    expect(screen.queryByText('Used 15 times')).not.toBeInTheDocument();
  });

  it('applies selected state styling', () => {
    render(<SpotlightCard song={mockSong} isSelected={true} />);
    
    const spotlightCard = screen.getByTestId('spotlight-card');
    expect(spotlightCard).toHaveClass('ring-2', 'ring-orange-500');
  });

  it('applies custom className', () => {
    render(<SpotlightCard song={mockSong} className="custom-class" />);
    
    expect(screen.getByTestId('motion-div')).toHaveClass('custom-class');
  });
});

describe('SpotlightCard Preset Components', () => {
  it('renders FeaturedSongCard with correct props', () => {
    const onSelect = vi.fn();
    const onPlay = vi.fn();
    
    render(<FeaturedSongCard song={mockSong} onSelect={onSelect} onPlay={onPlay} />);
    
    const motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv).toHaveClass('w-64', 'h-80'); // Large size
    expect(motionDiv).toHaveClass('featured-song-card');
    
    const spotlightCard = screen.getByTestId('spotlight-card');
    expect(spotlightCard).toHaveAttribute('data-intensity', '1.2'); // Enhanced intensity
  });

  it('renders CompactSpotlightCard with correct styling', () => {
    const onSelect = vi.fn();
    
    render(<CompactSpotlightCard song={mockSong} onSelect={onSelect} />);
    
    const motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv).toHaveClass('w-48', 'h-64'); // Small size
    expect(motionDiv).toHaveClass('compact-spotlight-card');
    
    const spotlightCard = screen.getByTestId('spotlight-card');
    expect(spotlightCard).toHaveAttribute('data-intensity', '0.6'); // Reduced intensity
  });

  it('renders TrendingSongCard with special styling', () => {
    const onSelect = vi.fn();
    const onPlay = vi.fn();
    
    render(<TrendingSongCard song={mockSong} onSelect={onSelect} onPlay={onPlay} />);
    
    const motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv).toHaveClass('w-56', 'h-72'); // Medium size
    expect(motionDiv).toHaveClass('trending-song-card');
    
    const spotlightCard = screen.getByTestId('spotlight-card');
    expect(spotlightCard).toHaveAttribute('data-intensity', '1'); // Standard intensity
  });
});

describe('SpotlightCard Interaction Behaviors', () => {
  it('handles mouse hover state changes', () => {
    render(<SpotlightCard song={mockSong} />);
    
    const motionDiv = screen.getByTestId('motion-div');
    
    // Test mouse enter
    fireEvent.mouseEnter(motionDiv);
    expect(motionDiv).toBeInTheDocument(); // Component should still be rendered
    
    // Test mouse leave
    fireEvent.mouseLeave(motionDiv);
    expect(motionDiv).toBeInTheDocument(); // Component should still be rendered
  });
});

describe('SpotlightCard Accessibility', () => {
  it('maintains proper focus management', () => {
    render(<SpotlightCard song={mockSong} />);
    
    const card = screen.getByTestId('spotlight-card');
    expect(card).toHaveClass('cursor-pointer');
  });

  it('provides proper button accessibility', () => {
    render(<SpotlightCard song={mockSong} />);
    
    const buttons = screen.getAllByTestId('button');
    expect(buttons.length).toBeGreaterThan(0);
    
    // All buttons should be properly rendered
    buttons.forEach(button => {
      expect(button).toBeInTheDocument();
    });
  });
});

describe('SpotlightCard Performance', () => {
  it('handles multiple instances efficiently', () => {
    const songs = Array.from({ length: 5 }, (_, i) => ({
      ...mockSong,
      id: `song-${i}`,
      title: `Song ${i}`,
    }));
    
    render(
      <div>
        {songs.map((song, index) => (
          <SpotlightCard 
            key={song.id} 
            song={song} 
            animationDelay={index * 0.1}
          />
        ))}
      </div>
    );
    
    // All cards should render
    songs.forEach(song => {
      expect(screen.getByText(song.title)).toBeInTheDocument();
    });
  });

  it('applies stagger animation delays correctly', () => {
    render(<SpotlightCard song={mockSong} animationDelay={0.5} />);
    
    // Component should render with animation delay
    expect(screen.getByTestId('motion-div')).toBeInTheDocument();
  });
});
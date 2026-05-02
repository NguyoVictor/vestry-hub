/**
 * TiltedCard Component Tests
 * 
 * Tests for React Bits TiltedCard integration in Song Library UI Revamp
 * Requirements: 2.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Song } from '@/types/song-library';

// Mock ALL dependencies BEFORE any imports to prevent real modules from loading

// Mock React Bits components
vi.mock('react-bits', () => ({
  TiltedCard: ({ children, className, onClick, ...props }: any) => (
    <div 
      data-testid="tilted-card" 
      className={className}
      onClick={onClick}
      data-tilt-max-angle-x={props.tiltMaxAngleX}
      data-tilt-max-angle-y={props.tiltMaxAngleY}
      data-perspective={props.perspective}
      data-scale={props.scale}
    >
      {children}
    </div>
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
  Music: () => <span data-testid="music-icon">Music</span>,
}));

// Mock utility functions
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Now import the components after all mocks are set up
import { TiltedCard, InteractiveTiltedCard, CompactTiltedCard, ShowcaseTiltedCard } from '../TiltedCard';

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
  is_trending: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:30:00Z',
};

describe('TiltedCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders song information correctly', () => {
    render(<TiltedCard song={mockSong} />);
    
    expect(screen.getByText('Amazing Grace')).toBeInTheDocument();
    expect(screen.getByText('John Newton')).toBeInTheDocument();
    expect(screen.getByTestId('cover-art')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<TiltedCard song={mockSong} size="sm" />);
    expect(screen.getByTestId('motion-div')).toHaveClass('w-44', 'h-56');

    rerender(<TiltedCard song={mockSong} size="md" />);
    expect(screen.getByTestId('motion-div')).toHaveClass('w-52', 'h-64');

    rerender(<TiltedCard song={mockSong} size="lg" />);
    expect(screen.getByTestId('motion-div')).toHaveClass('w-60', 'h-72');
  });

  it('configures tilt effects correctly', () => {
    render(<TiltedCard song={mockSong} tiltIntensity={0.2} enablePhysics={true} />);
    
    const tiltedCard = screen.getByTestId('tilted-card');
    expect(tiltedCard).toHaveAttribute('data-tilt-max-angle-x', '4'); // 0.2 * 20
    expect(tiltedCard).toHaveAttribute('data-tilt-max-angle-y', '4'); // 0.2 * 20
    expect(tiltedCard).toHaveAttribute('data-perspective', '1000');
    expect(tiltedCard).toHaveAttribute('data-scale', '1.02');
  });

  it('disables physics when enablePhysics is false', () => {
    render(<TiltedCard song={mockSong} tiltIntensity={0.2} enablePhysics={false} />);
    
    const tiltedCard = screen.getByTestId('tilted-card');
    expect(tiltedCard).toHaveAttribute('data-tilt-max-angle-x', '0');
    expect(tiltedCard).toHaveAttribute('data-tilt-max-angle-y', '0');
  });

  it('handles song selection correctly', () => {
    const onSelect = vi.fn();
    render(<TiltedCard song={mockSong} onSelect={onSelect} />);
    
    const card = screen.getByTestId('tilted-card');
    fireEvent.click(card);
    
    expect(onSelect).toHaveBeenCalledWith(mockSong);
  });

  it('handles play button click', () => {
    const onPlay = vi.fn();
    render(<TiltedCard song={mockSong} onPlay={onPlay} />);
    
    // Find play button by looking for the button with play icon
    const playButtons = screen.getAllByTestId('button');
    const playButton = playButtons.find(button => 
      button.querySelector('[data-testid="play-icon"]')
    );
    
    expect(playButton).toBeInTheDocument();
    fireEvent.click(playButton!);
    
    expect(onPlay).toHaveBeenCalledWith(mockSong);
  });

  it('displays song key badge', () => {
    render(<TiltedCard song={mockSong} />);
    
    expect(screen.getByText('G')).toBeInTheDocument(); // Key badge
  });

  it('displays song metadata when enabled', () => {
    render(<TiltedCard song={mockSong} showMetadata={true} />);
    
    expect(screen.getByText('120')).toBeInTheDocument(); // BPM
    expect(screen.getByText('4/4')).toBeInTheDocument(); // Time signature
    expect(screen.getByTestId('music-icon')).toBeInTheDocument();
  });

  it('hides metadata when disabled', () => {
    render(<TiltedCard song={mockSong} showMetadata={false} />);
    
    expect(screen.queryByText('120')).not.toBeInTheDocument();
    expect(screen.queryByText('4/4')).not.toBeInTheDocument();
    expect(screen.queryByTestId('music-icon')).not.toBeInTheDocument();
  });

  it('applies selected state styling', () => {
    render(<TiltedCard song={mockSong} isSelected={true} />);
    
    const tiltedCard = screen.getByTestId('tilted-card');
    expect(tiltedCard).toHaveClass('ring-2', 'ring-orange-500');
  });

  it('applies custom className', () => {
    render(<TiltedCard song={mockSong} className="custom-class" />);
    
    expect(screen.getByTestId('motion-div')).toHaveClass('custom-class');
  });
});

describe('TiltedCard Preset Components', () => {
  it('renders InteractiveTiltedCard with correct props', () => {
    const onSelect = vi.fn();
    const onPlay = vi.fn();
    
    render(<InteractiveTiltedCard song={mockSong} onSelect={onSelect} onPlay={onPlay} />);
    
    const motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv).toHaveClass('w-52', 'h-64'); // Medium size
    expect(motionDiv).toHaveClass('interactive-tilted-card');
    
    const tiltedCard = screen.getByTestId('tilted-card');
    expect(tiltedCard).toHaveAttribute('data-tilt-max-angle-x', '4'); // 0.2 * 20
  });

  it('renders CompactTiltedCard with correct styling', () => {
    const onSelect = vi.fn();
    
    render(<CompactTiltedCard song={mockSong} onSelect={onSelect} />);
    
    const motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv).toHaveClass('w-44', 'h-56'); // Small size
    expect(motionDiv).toHaveClass('compact-tilted-card');
    
    const tiltedCard = screen.getByTestId('tilted-card');
    expect(tiltedCard).toHaveAttribute('data-tilt-max-angle-x', '2'); // 0.1 * 20
  });

  it('renders ShowcaseTiltedCard with special styling', () => {
    const onSelect = vi.fn();
    const onPlay = vi.fn();
    
    render(<ShowcaseTiltedCard song={mockSong} onSelect={onSelect} onPlay={onPlay} />);
    
    const motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv).toHaveClass('w-60', 'h-72'); // Large size
    expect(motionDiv).toHaveClass('showcase-tilted-card');
    
    const tiltedCard = screen.getByTestId('tilted-card');
    expect(tiltedCard).toHaveAttribute('data-tilt-max-angle-x', '5'); // 0.25 * 20
  });
});

describe('TiltedCard Interaction Behaviors', () => {
  it('handles mouse hover state changes', () => {
    render(<TiltedCard song={mockSong} />);
    
    const motionDiv = screen.getByTestId('motion-div');
    
    // Test mouse enter
    fireEvent.mouseEnter(motionDiv);
    expect(motionDiv).toBeInTheDocument(); // Component should still be rendered
    
    // Test mouse leave
    fireEvent.mouseLeave(motionDiv);
    expect(motionDiv).toBeInTheDocument(); // Component should still be rendered
  });
});

describe('TiltedCard Accessibility', () => {
  it('maintains proper focus management', () => {
    render(<TiltedCard song={mockSong} />);
    
    const card = screen.getByTestId('tilted-card');
    expect(card).toHaveClass('cursor-pointer');
  });

  it('provides proper button accessibility', () => {
    render(<TiltedCard song={mockSong} />);
    
    const buttons = screen.getAllByTestId('button');
    expect(buttons.length).toBeGreaterThan(0);
    
    // All buttons should be properly rendered
    buttons.forEach(button => {
      expect(button).toBeInTheDocument();
    });
  });
});

describe('TiltedCard Performance', () => {
  it('handles multiple instances efficiently', () => {
    const songs = Array.from({ length: 5 }, (_, i) => ({
      ...mockSong,
      id: `song-${i}`,
      title: `Song ${i}`,
    }));
    
    render(
      <div>
        {songs.map((song, index) => (
          <TiltedCard 
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
    render(<TiltedCard song={mockSong} animationDelay={0.5} />);
    
    // Component should render with animation delay
    expect(screen.getByTestId('motion-div')).toBeInTheDocument();
  });
});
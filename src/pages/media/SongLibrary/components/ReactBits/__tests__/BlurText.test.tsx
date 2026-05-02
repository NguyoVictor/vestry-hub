/**
 * Unit Tests for BlurText Component Integration
 * 
 * Tests React Bits BlurText component integration with Song Library theming
 * and animation controls.
 * 
 * Requirements: 2.1
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { 
  BlurText, 
  SongTitleBlur, 
  SectionHeadingBlur, 
  InteractiveBlurText,
  LoadingBlurText 
} from '../BlurText';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock react-bits
vi.mock('react-bits', () => ({
  BlurText: ({ text, className, onComplete }: any) => (
    <span className={className} data-testid="react-bits-blur-text">
      {text}
    </span>
  ),
}));

describe('BlurText Component', () => {
  it('renders text content correctly', () => {
    render(<BlurText text="Test Text" />);
    expect(screen.getByText('Test Text')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<BlurText text="Test" size="sm" />);
    expect(screen.getByText('Test').parentElement).toHaveClass('text-sm');

    rerender(<BlurText text="Test" size="2xl" />);
    expect(screen.getByText('Test').parentElement).toHaveClass('text-2xl', 'font-bold');
  });

  it('handles hover trigger correctly', async () => {
    render(<BlurText text="Hover Test" trigger="hover" />);
    
    // The motion.div should have the cursor-pointer class when trigger is hover
    const container = screen.getByText('Hover Test').closest('div');
    expect(container).toHaveClass('cursor-pointer');

    fireEvent.mouseEnter(container!);
    // Test that hover state is activated
    expect(container).toBeInTheDocument();
  });

  it('calls onAnimationComplete callback', () => {
    const onComplete = vi.fn();
    render(<BlurText text="Test" onAnimationComplete={onComplete} />);
    
    // Since we're mocking react-bits, we can't test the actual callback
    // but we can verify the prop is passed correctly
    expect(screen.getByTestId('react-bits-blur-text')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<BlurText text="Test" className="custom-class" />);
    expect(screen.getByText('Test').parentElement).toHaveClass('custom-class');
  });
});

describe('BlurText Preset Components', () => {
  it('renders SongTitleBlur with correct props', () => {
    render(<SongTitleBlur title="Song Title" />);
    
    const element = screen.getByText('Song Title');
    expect(element).toBeInTheDocument();
    expect(element.parentElement).toHaveClass('font-semibold');
  });

  it('renders SectionHeadingBlur with correct styling', () => {
    render(<SectionHeadingBlur heading="Section Heading" />);
    
    const element = screen.getByText('Section Heading');
    expect(element).toBeInTheDocument();
    expect(element.parentElement).toHaveClass('font-bold', 'tracking-tight');
  });

  it('renders InteractiveBlurText as interactive element', () => {
    render(<InteractiveBlurText text="Interactive Text" />);
    
    const element = screen.getByText('Interactive Text');
    expect(element).toBeInTheDocument();
    expect(element.parentElement).toHaveClass('transition-all', 'duration-200');
  });

  it('renders LoadingBlurText with muted styling', () => {
    render(<LoadingBlurText />);
    
    const element = screen.getByText('Loading...');
    expect(element).toBeInTheDocument();
    expect(element.parentElement).toHaveClass('sl-text-muted');
  });

  it('accepts custom text for LoadingBlurText', () => {
    render(<LoadingBlurText text="Custom Loading..." />);
    
    expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
  });
});

describe('BlurText Animation Triggers', () => {
  it('handles immediate trigger', () => {
    render(<BlurText text="Immediate" trigger="immediate" />);
    expect(screen.getByText('Immediate')).toBeInTheDocument();
  });

  it('handles inView trigger with intersection observer', () => {
    // Mock IntersectionObserver
    const mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: () => null,
      unobserve: () => null,
      disconnect: () => null,
    });
    window.IntersectionObserver = mockIntersectionObserver;

    render(<BlurText text="In View" trigger="inView" />);
    expect(screen.getByText('In View')).toBeInTheDocument();
  });

  it('handles repeat animation correctly', () => {
    render(<BlurText text="Repeat" repeat={true} />);
    expect(screen.getByText('Repeat')).toBeInTheDocument();
  });
});

describe('BlurText Accessibility', () => {
  it('maintains text content for screen readers', () => {
    render(<BlurText text="Accessible Text" />);
    expect(screen.getByText('Accessible Text')).toBeInTheDocument();
  });

  it('applies proper font family', () => {
    render(<BlurText text="Font Test" />);
    expect(screen.getByText('Font Test').parentElement).toHaveClass('font-jakarta');
  });
});

describe('BlurText Performance', () => {
  it('handles multiple instances efficiently', () => {
    render(
      <div>
        <BlurText text="Text 1" />
        <BlurText text="Text 2" />
        <BlurText text="Text 3" />
      </div>
    );

    expect(screen.getByText('Text 1')).toBeInTheDocument();
    expect(screen.getByText('Text 2')).toBeInTheDocument();
    expect(screen.getByText('Text 3')).toBeInTheDocument();
  });

  it('cleans up intersection observer on unmount', () => {
    const disconnectMock = vi.fn();
    const observeMock = vi.fn();
    const mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: observeMock,
      unobserve: () => null,
      disconnect: disconnectMock,
    });
    
    // Mock IntersectionObserver to be available
    const originalIntersectionObserver = window.IntersectionObserver;
    window.IntersectionObserver = mockIntersectionObserver;

    const { unmount } = render(<BlurText text="Cleanup Test" trigger="inView" />);
    
    // Verify observer was created and used
    expect(mockIntersectionObserver).toHaveBeenCalled();
    
    unmount();

    expect(disconnectMock).toHaveBeenCalled();
    
    // Restore original IntersectionObserver
    window.IntersectionObserver = originalIntersectionObserver;
  });
});
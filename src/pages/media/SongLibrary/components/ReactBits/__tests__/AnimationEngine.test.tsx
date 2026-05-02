/**
 * Unit Tests for Animation Engine
 * 
 * Tests premium animation system including stagger animations,
 * micro-animations, and performance optimizations.
 * 
 * Requirements: 2.7, 2.8
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { 
  StaggerContainer,
  AnimatedItem,
  AnimatedCard,
  AnimatedButton,
  PageTransition,
  PulseLoader,
  ShimmerLoader,
  useMicroAnimations,
  OptimizedMotion,
  animationVariants,
  ANIMATION_CONFIG
} from '../../AnimationEngine';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, variants, initial, animate, ...props }: any) => (
      <div 
        data-testid="motion-div" 
        data-variants={variants ? 'true' : 'false'}
        data-initial={initial}
        data-animate={animate}
        {...props}
      >
        {children}
      </div>
    ),
    button: ({ children, ...props }: any) => (
      <button data-testid="motion-button" {...props}>
        {children}
      </button>
    ),
  },
  useAnimation: () => ({
    start: vi.fn(),
  }),
  useInView: () => true,
}));

describe('Animation Configuration', () => {
  it('exports correct animation durations', () => {
    expect(ANIMATION_CONFIG.FAST).toBe(0.2);
    expect(ANIMATION_CONFIG.NORMAL).toBe(0.3);
    expect(ANIMATION_CONFIG.SLOW).toBe(0.5);
    expect(ANIMATION_CONFIG.EXTRA_SLOW).toBe(0.8);
  });

  it('exports correct stagger delays', () => {
    expect(ANIMATION_CONFIG.STAGGER_FAST).toBe(0.03);
    expect(ANIMATION_CONFIG.STAGGER_NORMAL).toBe(0.05);
    expect(ANIMATION_CONFIG.STAGGER_SLOW).toBe(0.1);
  });

  it('exports correct transform values', () => {
    expect(ANIMATION_CONFIG.LIFT_SMALL).toBe(-2);
    expect(ANIMATION_CONFIG.SCALE_SMALL).toBe(1.02);
  });
});

describe('Animation Variants', () => {
  it('defines stagger container variants', () => {
    expect(animationVariants.staggerContainer).toBeDefined();
    expect(animationVariants.staggerContainer.hidden).toEqual({ opacity: 0 });
    expect(animationVariants.staggerContainer.show).toBeDefined();
  });

  it('defines item animation variants', () => {
    expect(animationVariants.staggerItem).toBeDefined();
    expect(animationVariants.fadeUpItem).toBeDefined();
    expect(animationVariants.scaleItem).toBeDefined();
  });

  it('defines card hover variants', () => {
    expect(animationVariants.cardHover).toBeDefined();
    expect(animationVariants.premiumCardHover).toBeDefined();
  });

  it('defines button animation variants', () => {
    expect(animationVariants.buttonPress).toBeDefined();
    expect(animationVariants.magneticButton).toBeDefined();
  });
});

describe('StaggerContainer Component', () => {
  it('renders children correctly', () => {
    render(
      <StaggerContainer>
        <div>Child 1</div>
        <div>Child 2</div>
      </StaggerContainer>
    );

    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });

  it('applies correct variant based on prop', () => {
    const { rerender } = render(
      <StaggerContainer variant="fast">
        <div>Test</div>
      </StaggerContainer>
    );

    let motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv).toHaveAttribute('data-variants', 'true');

    rerender(
      <StaggerContainer variant="slow">
        <div>Test</div>
      </StaggerContainer>
    );

    motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv).toHaveAttribute('data-variants', 'true');
  });

  it('applies custom className', () => {
    render(
      <StaggerContainer className="custom-class">
        <div>Test</div>
      </StaggerContainer>
    );

    expect(screen.getByTestId('motion-div')).toHaveClass('custom-class');
  });
});

describe('AnimatedItem Component', () => {
  it('renders with correct variant', () => {
    render(
      <AnimatedItem variant="fadeUp">
        <div>Animated Item</div>
      </AnimatedItem>
    );

    expect(screen.getByText('Animated Item')).toBeInTheDocument();
    expect(screen.getByTestId('motion-div')).toHaveAttribute('data-variants', 'true');
  });

  it('applies delay correctly', () => {
    render(
      <AnimatedItem delay={0.5}>
        <div>Delayed Item</div>
      </AnimatedItem>
    );

    const motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv.style.transitionDelay).toBe('0.5s');
  });
});

describe('AnimatedCard Component', () => {
  it('renders as clickable element', () => {
    const onClick = vi.fn();
    render(
      <AnimatedCard onClick={onClick}>
        <div>Card Content</div>
      </AnimatedCard>
    );

    const card = screen.getByTestId('motion-div');
    expect(card).toHaveClass('cursor-pointer');
    
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalled();
  });

  it('applies premium variant styling', () => {
    render(
      <AnimatedCard variant="premium">
        <div>Premium Card</div>
      </AnimatedCard>
    );

    const card = screen.getByTestId('motion-div');
    expect(card.style.transformStyle).toBe('preserve-3d');
    expect(card.style.perspective).toBe('1000px');
  });
});

describe('AnimatedButton Component', () => {
  it('renders as button element', () => {
    const onClick = vi.fn();
    render(
      <AnimatedButton onClick={onClick}>
        Click Me
      </AnimatedButton>
    );

    const button = screen.getByTestId('motion-button');
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });

  it('applies magnetic variant', () => {
    render(
      <AnimatedButton variant="magnetic">
        Magnetic Button
      </AnimatedButton>
    );

    expect(screen.getByTestId('motion-button')).toBeInTheDocument();
  });
});

describe('PageTransition Component', () => {
  it('wraps content with page transition animation', () => {
    render(
      <PageTransition>
        <div>Page Content</div>
      </PageTransition>
    );

    expect(screen.getByText('Page Content')).toBeInTheDocument();
    expect(screen.getByTestId('motion-div')).toHaveAttribute('data-variants', 'true');
  });

  it('applies custom className', () => {
    render(
      <PageTransition className="page-class">
        <div>Content</div>
      </PageTransition>
    );

    expect(screen.getByTestId('motion-div')).toHaveClass('page-class');
  });
});

describe('Loading Components', () => {
  it('renders PulseLoader with correct styling', () => {
    render(<PulseLoader />);
    
    const loader = screen.getByTestId('motion-div');
    expect(loader).toHaveClass('w-4', 'h-4', 'bg-orange-500', 'rounded-full');
  });

  it('renders PulseLoader with custom className', () => {
    render(<PulseLoader className="custom-loader" />);
    
    expect(screen.getByTestId('motion-div')).toHaveClass('custom-loader');
  });

  it('renders ShimmerLoader with shimmer effect', () => {
    render(<ShimmerLoader />);
    
    const container = screen.getByTestId('motion-div').parentElement;
    expect(container).toHaveClass('relative', 'overflow-hidden');
  });
});

describe('OptimizedMotion Component', () => {
  it('applies performance optimizations', () => {
    render(
      <OptimizedMotion>
        <div>Optimized Content</div>
      </OptimizedMotion>
    );

    const motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv.style.willChange).toBe('transform, opacity');
    expect(motionDiv.style.backfaceVisibility).toBe('hidden');
  });

  it('merges custom styles with optimizations', () => {
    render(
      <OptimizedMotion style={{ color: 'red' }}>
        <div>Styled Content</div>
      </OptimizedMotion>
    );

    const motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv.style.color).toBe('red');
    expect(motionDiv.style.willChange).toBe('transform, opacity');
  });
});

describe('Micro Animations Hook', () => {
  function TestComponent() {
    const { controls, triggerSuccess, triggerError, triggerAttention } = useMicroAnimations();
    
    return (
      <div>
        <button onClick={triggerSuccess} data-testid="success-btn">Success</button>
        <button onClick={triggerError} data-testid="error-btn">Error</button>
        <button onClick={triggerAttention} data-testid="attention-btn">Attention</button>
      </div>
    );
  }

  it('provides animation control functions', () => {
    render(<TestComponent />);
    
    expect(screen.getByTestId('success-btn')).toBeInTheDocument();
    expect(screen.getByTestId('error-btn')).toBeInTheDocument();
    expect(screen.getByTestId('attention-btn')).toBeInTheDocument();
  });

  it('triggers animations without errors', () => {
    render(<TestComponent />);
    
    fireEvent.click(screen.getByTestId('success-btn'));
    fireEvent.click(screen.getByTestId('error-btn'));
    fireEvent.click(screen.getByTestId('attention-btn'));
    
    // No errors should be thrown
    expect(screen.getByTestId('success-btn')).toBeInTheDocument();
  });
});

describe('Animation Performance', () => {
  it('handles multiple animated components efficiently', () => {
    render(
      <StaggerContainer>
        {Array.from({ length: 10 }, (_, i) => (
          <AnimatedItem key={i}>
            <div>Item {i}</div>
          </AnimatedItem>
        ))}
      </StaggerContainer>
    );

    // All items should render without performance issues
    for (let i = 0; i < 10; i++) {
      expect(screen.getByText(`Item ${i}`)).toBeInTheDocument();
    }
  });

  it('applies proper transform optimizations', () => {
    render(
      <OptimizedMotion>
        <AnimatedCard>
          <div>Performance Test</div>
        </AnimatedCard>
      </OptimizedMotion>
    );

    const optimizedDiv = screen.getAllByTestId('motion-div')[0];
    expect(optimizedDiv.style.willChange).toBe('transform, opacity');
  });
});
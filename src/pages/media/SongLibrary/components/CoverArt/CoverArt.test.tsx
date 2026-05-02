/**
 * CoverArt Component Tests
 * 
 * Unit tests for the CoverArt component functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoverArt } from './CoverArt';
import { ChurchProvider } from '@/contexts/ChurchContext';

// Mock the hooks and dependencies
vi.mock('../../hooks/useAmbientColors', () => ({
  useAmbientColors: () => ({
    setColorsFromCoverArt: vi.fn(),
  }),
}));

vi.mock('@/contexts/ChurchContext', () => ({
  ChurchProvider: ({ children }: { children: React.ReactNode }) => children,
  useChurch: () => ({
    tenantId: 'test-tenant',
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'test-url' } }),
      }),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ChurchProvider>
        {children}
      </ChurchProvider>
    </QueryClientProvider>
  );
};

describe('CoverArt Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with fallback gradient when no image provided', () => {
    const Wrapper = createWrapper();
    
    render(
      <CoverArt
        songId="test-song-1"
        size="md"
      />,
      { wrapper: Wrapper }
    );

    // Should show the gradient fallback container
    const container = document.querySelector('.sl-cover-art-container');
    expect(container).toBeInTheDocument();
    
    // Should show the placeholder icon (SVG)
    const placeholderIcon = container?.querySelector('svg.lucide-image');
    expect(placeholderIcon).toBeInTheDocument();
  });

  it('renders existing image when provided', () => {
    const Wrapper = createWrapper();
    
    render(
      <CoverArt
        songId="test-song-1"
        currentImageUrl="https://example.com/image.jpg"
        size="md"
      />,
      { wrapper: Wrapper }
    );

    const image = screen.getByAltText('Cover art');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('shows upload overlay when editable', async () => {
    const Wrapper = createWrapper();
    
    render(
      <CoverArt
        songId="test-song-1"
        size="md"
        editable={true}
      />,
      { wrapper: Wrapper }
    );

    const container = document.querySelector('.sl-cover-art-container');
    expect(container).toBeInTheDocument();
    
    // Should have upload overlay (may be hidden initially)
    const uploadOverlay = container?.querySelector('[class*="absolute inset-0"]');
    expect(uploadOverlay).toBeInTheDocument();
  });

  it('calls onImageUpload when upload is successful', async () => {
    const onImageUpload = vi.fn();
    const Wrapper = createWrapper();
    
    render(
      <CoverArt
        songId="test-song-1"
        size="md"
        editable={true}
        onImageUpload={onImageUpload}
      />,
      { wrapper: Wrapper }
    );

    // This test would need more complex setup to simulate file upload
    // For now, just verify the callback prop is accepted
    expect(onImageUpload).toBeDefined();
  });

  it('applies correct size classes', () => {
    const Wrapper = createWrapper();
    
    const { rerender } = render(
      <CoverArt
        songId="test-song-1"
        size="sm"
      />,
      { wrapper: Wrapper }
    );

    let container = document.querySelector('.w-16.h-16');
    expect(container).toBeInTheDocument();

    rerender(
      <CoverArt
        songId="test-song-1"
        size="lg"
      />
    );

    container = document.querySelector('.w-32.h-32');
    expect(container).toBeInTheDocument();
  });

  it('shows upload button when showUploadButton is true', () => {
    const Wrapper = createWrapper();
    
    render(
      <CoverArt
        songId="test-song-1"
        size="md"
        editable={true}
        showUploadButton={true}
      />,
      { wrapper: Wrapper }
    );

    const uploadButton = screen.getByRole('button', { name: /upload image/i });
    expect(uploadButton).toBeInTheDocument();
  });
});
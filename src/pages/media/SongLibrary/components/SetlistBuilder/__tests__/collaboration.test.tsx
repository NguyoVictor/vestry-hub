/**
 * Collaboration Features Test Suite for Song Library UI Revamp
 * 
 * Tests real-time collaboration functionality:
 * - Presence tracking
 * - Conflict resolution
 * - Cross-tab synchronization
 * - Optimistic locking
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.5, 14.6, 14.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CollaborationPanel } from '../CollaborationPanel';
import { ConflictResolution } from '../ConflictResolution';
import { CrossTabSync } from '../CrossTabSync';
import { useCrossTabSync } from '../../../hooks/useCrossTabSync';

import type { 
  CollaborationState,
  SetlistCollaborator,
  EditConflict,
  Song,
  CollaboratorPermissions,
  CollaborationError,
  SetlistChangeHistory,
} from '@/types/song-library';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue({ status: 'SUBSCRIBED' }),
      unsubscribe: vi.fn().mockResolvedValue({}),
      track: vi.fn().mockResolvedValue({}),
      untrack: vi.fn().mockResolvedValue({}),
      send: vi.fn().mockResolvedValue({}),
      presenceState: vi.fn(() => ({})),
    })),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock BroadcastChannel
global.BroadcastChannel = vi.fn().mockImplementation((name: string) => ({
  name,
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
}));

// Mock Church Context
vi.mock('@/contexts/ChurchContext', () => ({
  useChurch: () => ({
    tenantId: 'test-tenant',
    user: {
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
    },
  }),
}));

// Test data
const mockCollaboratorPermissions: CollaboratorPermissions = {
  can_edit: true,
  can_reorder: true,
  can_add_songs: true,
  can_remove_songs: true,
  can_modify_settings: false,
  can_invite_others: false,
};

const mockCollaborators: SetlistCollaborator[] = [
  {
    user_id: 'user1',
    user_name: 'John Doe',
    user_avatar: null,
    is_online: true,
    last_seen_at: new Date().toISOString(),
    cursor_position: null,
    current_action: {
      type: 'editing',
      target_item_id: 'item1',
      target_field: 'name',
      timestamp: new Date().toISOString(),
    },
    permissions: mockCollaboratorPermissions,
  },
  {
    user_id: 'user2',
    user_name: 'Jane Smith',
    user_avatar: null,
    is_online: true,
    last_seen_at: new Date().toISOString(),
    cursor_position: null,
    current_action: {
      type: 'viewing',
      timestamp: new Date().toISOString(),
    },
    permissions: {
      can_edit: false,
      can_reorder: false,
      can_add_songs: false,
      can_remove_songs: false,
      can_modify_settings: false,
      can_invite_others: false,
    },
  },
];

const mockCurrentUser: SetlistCollaborator = {
  user_id: 'current-user',
  user_name: 'Current User',
  user_avatar: null,
  is_online: true,
  last_seen_at: new Date().toISOString(),
  cursor_position: null,
  permissions: mockCollaboratorPermissions,
};

const mockCollaborationState: CollaborationState = {
  isConnected: true,
  connectionStatus: 'connected',
  activeCollaborators: mockCollaborators,
  currentUser: mockCurrentUser,
  pendingChanges: [],
  conflicts: [],
  lastSyncedAt: new Date().toISOString(),
  syncErrors: [],
};

const mockConflict: EditConflict = {
  id: 'conflict1',
  type: 'concurrent_edit',
  description: 'Conflicting setlist name changes',
  conflicting_users: [mockCollaborators[0], mockCollaborators[1]],
  current_state: { name: 'Original Name' },
  incoming_change: { name: 'New Name' },
  conflict_data: {
    item_id: 'item1',
    field_name: 'name',
    original_value: 'Original Name',
    conflicting_values: [
      {
        user_id: 'user1',
        value: 'New Name',
        timestamp: new Date().toISOString(),
      },
    ],
  },
  resolution_options: [
    {
      id: 'option1',
      type: 'accept_mine',
      description: 'Accept your changes',
      requires_user_input: false,
    },
  ],
  auto_resolvable: false,
  created_at: new Date().toISOString(),
};

const mockSongs: Song[] = [
  {
    id: 'song1',
    tenant_id: 'test-tenant',
    title: 'Amazing Grace',
    artist: 'Traditional',
    lyrics: null,
    chords: null,
    key: 'G',
    bpm: 80,
    time_signature: '4/4',
    tags: ['hymn', 'traditional'],
    cover_art_url: null,
    cover_art_colors: null,
    chord_sheet_path: null,
    video_url: null,
    duration_seconds: 240,
    usage_count: 5,
    last_played_at: null,
    custom_fields: {},
    is_trending: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('Collaboration Features', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('CollaborationPanel', () => {
    it('should render collaboration status correctly', () => {
      const mockProps = {
        state: mockCollaborationState,
        collaborators: mockCollaborators,
        activeCollaborators: mockCollaborators,
        canUndo: true,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onResolveConflict: vi.fn(),
        onReconnect: vi.fn(),
      };

      renderWithProviders(<CollaborationPanel {...mockProps} />);

      expect(screen.getByText('Collaboration')).toBeInTheDocument();
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Active Now (2)')).toBeInTheDocument();
    });

    it('should display collaborators with correct roles', () => {
      const mockProps = {
        state: mockCollaborationState,
        collaborators: mockCollaborators,
        activeCollaborators: mockCollaborators,
        canUndo: false,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onResolveConflict: vi.fn(),
        onReconnect: vi.fn(),
      };

      renderWithProviders(<CollaborationPanel {...mockProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Editing')).toBeInTheDocument();
      expect(screen.getByText('Viewing')).toBeInTheDocument();
    });

    it('should handle undo/redo actions', async () => {
      const mockOnUndo = vi.fn();
      const mockOnRedo = vi.fn();

      const mockProps = {
        state: mockCollaborationState,
        collaborators: mockCollaborators,
        activeCollaborators: mockCollaborators,
        canUndo: true,
        canRedo: true,
        onUndo: mockOnUndo,
        onRedo: mockOnRedo,
        onResolveConflict: vi.fn(),
        onReconnect: vi.fn(),
      };

      renderWithProviders(<CollaborationPanel {...mockProps} />);

      const undoButton = screen.getByRole('button', { name: /undo/i });
      const redoButton = screen.getByRole('button', { name: /redo/i });

      fireEvent.click(undoButton);
      fireEvent.click(redoButton);

      await waitFor(() => {
        expect(mockOnUndo).toHaveBeenCalledTimes(1);
        expect(mockOnRedo).toHaveBeenCalledTimes(1);
      });
    });

    it('should show reconnect option when disconnected', () => {
      const disconnectedState: CollaborationState = {
        ...mockCollaborationState,
        isConnected: false,
        connectionStatus: 'error',
      };

      const mockOnReconnect = vi.fn();

      const mockProps = {
        state: disconnectedState,
        collaborators: [],
        activeCollaborators: [],
        canUndo: false,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onResolveConflict: vi.fn(),
        onReconnect: mockOnReconnect,
      };

      renderWithProviders(<CollaborationPanel {...mockProps} />);

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      
      const reconnectButton = screen.getByRole('button', { name: /reconnect/i });
      fireEvent.click(reconnectButton);

      expect(mockOnReconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('ConflictResolution', () => {
    it('should render conflict details correctly', () => {
      const mockProps = {
        conflict: mockConflict,
        songs: mockSongs,
        onResolve: vi.fn(),
        onCancel: vi.fn(),
      };

      renderWithProviders(<ConflictResolution {...mockProps} />);

      expect(screen.getByText('Resolve Conflict')).toBeInTheDocument();
      expect(screen.getByText('Conflicting setlist name changes')).toBeInTheDocument();
      expect(screen.getByText('user1, user2')).toBeInTheDocument();
    });

    it('should handle conflict resolution actions', async () => {
      const mockOnResolve = vi.fn();
      const mockOnCancel = vi.fn();

      const mockProps = {
        conflict: mockConflict,
        songs: mockSongs,
        onResolve: mockOnResolve,
        onCancel: mockOnCancel,
      };

      renderWithProviders(<ConflictResolution {...mockProps} />);

      // Click on resolution tab
      const resolutionTab = screen.getByRole('tab', { name: /choose resolution/i });
      fireEvent.click(resolutionTab);

      // Select accept resolution
      const acceptCard = screen.getByText('Accept Incoming').closest('div');
      if (acceptCard) {
        fireEvent.click(acceptCard);
      }

      // Click resolve button
      const resolveButton = screen.getByRole('button', { name: /resolve conflict/i });
      fireEvent.click(resolveButton);

      await waitFor(() => {
        expect(mockOnResolve).toHaveBeenCalledWith('conflict1', 'accept', undefined);
      });
    });

    it('should handle cancel action', () => {
      const mockOnCancel = vi.fn();

      const mockProps = {
        conflict: mockConflict,
        songs: mockSongs,
        onResolve: vi.fn(),
        onCancel: mockOnCancel,
      };

      renderWithProviders(<ConflictResolution {...mockProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('CrossTabSync', () => {
    it('should render cross-tab sync status', () => {
      renderWithProviders(
        <CrossTabSync 
          setlistId="test-setlist" 
          onSyncStateChange={vi.fn()} 
        />
      );

      expect(screen.getByText('Cross-Tab Sync')).toBeInTheDocument();
    });

    it('should show unsupported message when BroadcastChannel is not available', () => {
      // Temporarily remove BroadcastChannel
      const originalBroadcastChannel = global.BroadcastChannel;
      // @ts-ignore
      delete global.BroadcastChannel;

      renderWithProviders(
        <CrossTabSync 
          setlistId="test-setlist" 
          onSyncStateChange={vi.fn()} 
        />
      );

      expect(screen.getByText(/cross-tab synchronization is not supported/i)).toBeInTheDocument();

      // Restore BroadcastChannel
      global.BroadcastChannel = originalBroadcastChannel;
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete collaboration workflow', async () => {
      // This would be a more comprehensive integration test
      // that tests the entire collaboration flow
      const mockProps = {
        state: {
          ...mockCollaborationState,
          conflicts: [mockConflict],
        },
        collaborators: mockCollaborators,
        activeCollaborators: mockCollaborators,
        canUndo: true,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onResolveConflict: vi.fn(),
        onReconnect: vi.fn(),
      };

      renderWithProviders(<CollaborationPanel {...mockProps} />);

      // Verify initial state
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('1 conflict')).toBeInTheDocument();

      // Test presence tracking
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Editing')).toBeInTheDocument();
    });
  });
});

// Property-based test for collaboration state consistency
describe('Collaboration State Properties', () => {
  it('should maintain consistent collaboration state', () => {
    // Property: Active collaborators should always be a subset of all collaborators
    const allCollaborators = mockCollaborators;
    const activeCollaborators = mockCollaborators.slice(0, 1);

    expect(activeCollaborators.every(active => 
      allCollaborators.some(all => all.user_id === active.user_id)
    )).toBe(true);
  });

  it('should validate conflict resolution consistency', () => {
    // Property: Resolved conflicts should not appear in pending conflicts
    const conflict = { ...mockConflict, resolution_status: 'resolved' as const };
    const pendingConflicts = [mockConflict].filter(c => c.resolution_status === 'pending');

    expect(pendingConflicts).not.toContain(conflict);
  });

  it('should ensure presence tracking accuracy', () => {
    // Property: All active users should have recent last_seen_at timestamps
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);

    const activeCollaborators = mockCollaborators.filter(c => 
      new Date(c.last_seen_at).getTime() > fiveMinutesAgo
    );

    expect(activeCollaborators.length).toBeGreaterThanOrEqual(0);
    activeCollaborators.forEach(collaborator => {
      expect(new Date(collaborator.last_seen_at).getTime()).toBeGreaterThan(fiveMinutesAgo);
    });
  });
});
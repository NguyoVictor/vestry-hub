/**
 * Song Library UI Revamp - TypeScript Interfaces
 * Enhanced data models for premium music application features
 */

import React from 'react';

// =====================================================
// Enhanced Song Interface
// =====================================================

export interface Song {
  id: string;
  tenant_id: string;
  title: string;
  artist?: string;
  lyrics?: string;
  chords?: string;
  key?: string;
  tempo?: number; // Legacy field, use bpm instead
  tags: string[];
  
  // Enhanced metadata fields (Song Library UI Revamp)
  bpm?: number;
  time_signature?: string;
  cover_art_url?: string;
  cover_art_colors?: CoverArtColors;
  duration_seconds?: number;
  usage_count: number;
  last_played_at?: string;
  custom_fields: Record<string, any>;
  is_trending: boolean;
  
  // Existing fields
  video_url?: string;
  chord_sheet_path?: string;
  created_at: string;
  updated_at: string;
}

export interface CoverArtColors {
  primary: string;
  secondary: string;
  accent: string;
  dominant: string[];
}

// =====================================================
// User Preferences Interface
// =====================================================

export interface UserSongPreferences {
  id: string;
  user_id: string;
  tenant_id: string;
  theme: 'light' | 'dark';
  view_mode: 'grid' | 'list';
  transposition_preferences: Record<string, number>; // songId -> semitones
  filter_presets: FilterPreset[];
  recent_searches: string[];
  created_at: string;
  updated_at: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: SearchFilters;
}

export interface SearchFilters {
  keys?: string[];
  bpmRange?: [number, number];
  timeSignatures?: string[];
  tags?: string[];
  hasLyrics?: boolean;
  hasChords?: boolean;
  hasCoverArt?: boolean;
}

// =====================================================
// Usage Analytics Interface
// =====================================================

export interface SongUsageAnalytics {
  id: string;
  tenant_id: string;
  song_id: string;
  service_type?: string;
  used_at: string;
  setlist_id?: string;
  key_used?: string;
  duration_played?: number;
  user_id?: string;
  created_at: string;
}

export interface UsageAnalyticsResponse {
  totalUsage: number;
  trendingPeriod: 'week' | 'month' | 'year';
  topSongs: Array<{
    song: Song;
    usageCount: number;
    lastUsed: string;
    trend: 'up' | 'down' | 'stable';
  }>;
  unusedSongs: Song[];
  usageByServiceType: Record<string, number>;
}

// =====================================================
// Collaboration Interfaces (Enhanced)
// =====================================================

export interface SetlistCollaboration {
  id: string;
  setlist_id: string;
  user_id: string;
  is_active: boolean;
  last_seen_at: string;
  cursor_position?: CursorPosition;
  current_permissions: CollaboratorPermissions;
  session_start_time: string;
  created_at: string;
}

export interface CursorPosition {
  songIndex?: number;
  fieldName?: string;
  caretPosition?: number;
  selection?: {
    start: number;
    end: number;
  };
  viewport?: {
    scrollTop: number;
    scrollLeft: number;
  };
}

export interface SetlistChangeHistory {
  id: string;
  setlist_id: string;
  user_id: string;
  change_type: 'add' | 'remove' | 'reorder' | 'update' | 'bulk_update';
  change_data: {
    item_id?: string;
    field_name?: string;
    old_value?: any;
    new_value?: any;
    position_changes?: Array<{
      item_id: string;
      old_position: number;
      new_position: number;
    }>;
    bulk_changes?: Array<{
      item_id: string;
      change_type: string;
      data: any;
    }>;
  };
  previous_state?: any;
  metadata?: {
    user_agent?: string;
    ip_address?: string;
    session_id?: string;
  };
  created_at: string;
}

// =====================================================
// Enhanced Setlist Interfaces
// =====================================================

export interface Setlist {
  id: string;
  tenant_id: string;
  name: string;
  service_date?: string;
  service_type?: ServiceType;
  notes?: string;
  items: SetlistItem[];
  total_duration?: number;
  collaborators: string[];
  
  // Enhanced collaboration features
  is_collaborative: boolean;
  active_collaborators: SetlistCollaborator[];
  last_modified_by?: string;
  last_modified_at?: string;
  version: number;
  
  // Service planning features
  key_transitions?: KeyTransition[];
  tempo_flow?: TempoFlow[];
  estimated_duration?: number;
  actual_duration?: number;
  
  // Metadata
  tags?: string[];
  status: 'draft' | 'ready' | 'in_progress' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface SetlistItem {
  id: string;
  setlist_id: string;
  song_id: string;
  position: number;
  
  // Enhanced drag-and-drop properties
  is_dragging?: boolean;
  drag_preview_offset?: { x: number; y: number };
  drop_zone_id?: string;
  
  // Performance customization
  key_override?: string;
  tempo_override?: number;
  notes?: string;
  duration_override?: number;
  intro_notes?: string;
  outro_notes?: string;
  
  // Collaboration tracking
  added_by?: string;
  added_at?: string;
  last_modified_by?: string;
  last_modified_at?: string;
  
  // Visual and interaction states
  is_selected?: boolean;
  is_highlighted?: boolean;
  has_conflicts?: boolean;
  
  // Populated from join
  song?: Song;
}

// =====================================================
// Collaboration Interfaces (Enhanced)
// =====================================================

export interface SetlistCollaborator {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  is_online: boolean;
  last_seen_at: string;
  cursor_position?: CursorPosition;
  current_action?: CollaboratorAction;
  permissions: CollaboratorPermissions;
}

export interface CollaboratorAction {
  type: 'viewing' | 'editing' | 'dragging' | 'selecting' | 'typing';
  target_item_id?: string;
  target_field?: string;
  timestamp: string;
}

export interface CollaboratorPermissions {
  can_edit: boolean;
  can_reorder: boolean;
  can_add_songs: boolean;
  can_remove_songs: boolean;
  can_modify_settings: boolean;
  can_invite_others: boolean;
}

// =====================================================
// Drag and Drop Enhanced Interfaces
// =====================================================

export interface DragState {
  item: SetlistItem;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  dragOffset: { x: number; y: number };
  ghostElement?: HTMLElement;
}

export interface DropZoneProps {
  id: string;
  onDrop: (item: SetlistItem, targetIndex: number) => void;
  onDragOver?: (item: SetlistItem, targetIndex: number) => void;
  onDragLeave?: () => void;
  isActive: boolean;
  isValidDropTarget: boolean;
  acceptedTypes: string[];
  children: React.ReactNode;
  className?: string;
}

export interface DragItemProps {
  item: SetlistItem;
  index: number;
  onDragStart: (item: SetlistItem, index: number) => void;
  onDragEnd: () => void;
  onDragMove?: (x: number, y: number) => void;
  isDragging: boolean;
  isPreview?: boolean;
  dragHandle?: React.RefObject<HTMLElement>;
  children: React.ReactNode;
}

export interface DragPreviewProps {
  item: SetlistItem;
  position: { x: number; y: number };
  isDragging: boolean;
  opacity?: number;
}

// =====================================================
// Service Planning Interfaces
// =====================================================

export interface KeyTransition {
  from_song_id: string;
  to_song_id: string;
  from_key: string;
  to_key: string;
  semitone_difference: number;
  transition_type: 'smooth' | 'moderate' | 'difficult';
  suggested_modulation?: string;
}

export interface TempoFlow {
  song_id: string;
  bpm: number;
  position: number;
  flow_rating: 'excellent' | 'good' | 'moderate' | 'challenging';
  suggestions?: string[];
}

export interface ServicePlanningAnalytics {
  total_duration: number;
  average_tempo: number;
  key_distribution: Record<string, number>;
  tempo_variance: number;
  difficult_transitions: KeyTransition[];
  flow_score: number;
  recommendations: string[];
}

// =====================================================
// Real-time Collaboration Events (Enhanced)
// =====================================================

export interface CollaborationEvents {
  'setlist:join': { 
    setlistId: string; 
    user: SetlistCollaborator;
    timestamp: string;
  };
  'setlist:leave': { 
    setlistId: string; 
    userId: string;
    timestamp: string;
  };
  'setlist:change': { 
    setlistId: string; 
    change: SetlistChangeHistory; 
    user: SetlistCollaborator;
    timestamp: string;
  };
  'setlist:cursor': { 
    setlistId: string; 
    userId: string; 
    position: CursorPosition;
    timestamp: string;
  };
  'setlist:conflict': { 
    setlistId: string; 
    conflict: EditConflict;
    timestamp: string;
  };
  'setlist:drag_start': {
    setlistId: string;
    userId: string;
    itemId: string;
    timestamp: string;
  };
  'setlist:drag_move': {
    setlistId: string;
    userId: string;
    itemId: string;
    position: { x: number; y: number };
    timestamp: string;
  };
  'setlist:drag_end': {
    setlistId: string;
    userId: string;
    itemId: string;
    newPosition?: number;
    timestamp: string;
  };
  'setlist:selection_change': {
    setlistId: string;
    userId: string;
    selectedItems: string[];
    timestamp: string;
  };
}

export interface EditConflict {
  id: string;
  type: 'concurrent_edit' | 'version_mismatch' | 'drag_conflict' | 'permission_denied';
  description: string;
  conflicting_users: SetlistCollaborator[];
  current_state: any;
  incoming_change: any;
  conflict_data: {
    item_id?: string;
    field_name?: string;
    original_value?: any;
    conflicting_values: Array<{
      user_id: string;
      value: any;
      timestamp: string;
    }>;
  };
  resolution_options: ConflictResolutionOption[];
  auto_resolvable: boolean;
  created_at: string;
}

export interface ConflictResolutionOption {
  id: string;
  type: 'accept_mine' | 'accept_theirs' | 'merge' | 'manual';
  description: string;
  preview_result?: any;
  requires_user_input: boolean;
}

// =====================================================
// Collaboration State Management
// =====================================================

export interface CollaborationState {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  activeCollaborators: SetlistCollaborator[];
  currentUser: SetlistCollaborator;
  pendingChanges: SetlistChangeHistory[];
  conflicts: EditConflict[];
  lastSyncedAt?: string;
  syncErrors: CollaborationError[];
}

export interface CollaborationConfig {
  enableRealTime: boolean;
  enablePresence: boolean;
  enableCursors: boolean;
  enableConflictResolution: boolean;
  autoSaveInterval: number;
  maxCollaborators: number;
  permissions: CollaboratorPermissions;
}

// =====================================================
// Optimistic Updates and Conflict Resolution
// =====================================================

export interface OptimisticUpdate {
  id: string;
  type: 'add' | 'remove' | 'reorder' | 'update';
  target_id: string;
  original_state: any;
  new_state: any;
  user_id: string;
  timestamp: string;
  is_confirmed: boolean;
  retry_count: number;
}

export interface ConflictResolution {
  conflict_id: string;
  resolution_type: 'accept_mine' | 'accept_theirs' | 'merge' | 'manual';
  resolved_value: any;
  resolved_by: string;
  resolved_at: string;
  notes?: string;
}

// =====================================================
// Search and Command Palette Interfaces
// =====================================================

export interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResult[];
  recentSearches: string[];
  popularSongs: Song[];
}

export interface SearchResult {
  song: Song;
  relevanceScore: number;
  matchedFields: string[];
  highlightedText?: string;
}

export interface CommandPaletteState {
  isOpen: boolean;
  searchQuery: string;
  selectedIndex: number;
  results: SearchResult[];
  mode: 'search' | 'filter' | 'action';
}

// =====================================================
// Theme and UI State Interfaces
// =====================================================

export interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  ambientColors: AmbientColorState;
  setAmbientColors: (colors: AmbientColorState) => void;
}

export interface AmbientColorState {
  primary: string;
  secondary: string;
  accent: string;
}

export interface SongLibraryState {
  viewMode: 'grid' | 'list';
  searchQuery: string;
  filters: SearchFilters;
  selectedSongs: string[];
  activeSetlist: string | null;
  isCommandPaletteOpen: boolean;
}

// =====================================================
// Chord Transposition Interfaces
// =====================================================

export interface TranspositionState {
  semitones: number; // -6 to +6
  transposedChords: string;
  transposedKey: string;
}

export interface TranspositionPreferences {
  [songId: string]: number; // semitones
}

// =====================================================
// Cover Art and Visual Interfaces
// =====================================================

export interface CoverArtUploadResponse {
  coverArtUrl: string;
  colors: CoverArtColors;
  optimizedSizes: {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
  };
}

export interface GradientConfig {
  type: 'linear' | 'radial' | 'conic';
  colors: string[];
  direction?: string;
  stops?: number[];
}

// =====================================================
// API Request/Response Interfaces
// =====================================================

export interface GetSongsRequest {
  tenant_id: string;
  search?: string;
  filters?: SearchFilters;
  sort?: {
    field: 'title' | 'artist' | 'usage_count' | 'last_played_at' | 'created_at';
    direction: 'asc' | 'desc';
  };
  pagination?: {
    offset: number;
    limit: number;
  };
}

export interface GetSongsResponse {
  songs: Song[];
  total: number;
  trending: Song[];
  recent: Song[];
}

export interface TrackUsageRequest {
  song_id: string;
  service_type?: string;
  setlist_id?: string;
  key_used?: string;
  duration_played?: number;
}

// =====================================================
// Real-time Collaboration Events
// =====================================================

export interface CollaborationEvents {
  'setlist:join': { setlistId: string; user: any };
  'setlist:leave': { setlistId: string; userId: string };
  'setlist:change': { setlistId: string; change: SetlistChangeHistory; user: any };
  'setlist:cursor': { setlistId: string; userId: string; position: CursorPosition };
  'setlist:conflict': { setlistId: string; conflict: EditConflict };
}

export interface EditConflict {
  type: 'concurrent_edit' | 'version_mismatch';
  conflictingUsers: string[];
  conflictData: any;
  resolutionOptions: string[];
}

// =====================================================
// Component Props Interfaces
// =====================================================

export interface SongCardProps {
  song: Song;
  isSelected: boolean;
  onSelect: (song: Song) => void;
  onEdit: (song: Song) => void;
  onAddToSetlist: (song: Song) => void;
  variant: 'spotlight' | 'tilted' | 'standard';
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  songs: Song[];
  onSongSelect: (song: Song) => void;
}

export interface ChordTranspositionProps {
  originalChords: string;
  originalKey: string;
  onTranspose: (semitones: number) => void;
  userPreferences: TranspositionPreferences;
}

export interface SetlistBuilderProps {
  setlist: Setlist;
  availableSongs: Song[];
  onUpdateSetlist: (setlist: Setlist) => void;
  collaborators: SetlistCollaborator[];
  isRealTimeEnabled: boolean;
  
  // Enhanced collaboration props
  collaborationConfig: CollaborationConfig;
  onCollaboratorJoin?: (collaborator: SetlistCollaborator) => void;
  onCollaboratorLeave?: (userId: string) => void;
  onConflictDetected?: (conflict: EditConflict) => void;
  onConflictResolved?: (resolution: ConflictResolution) => void;
  
  // Drag and drop configuration
  dragAndDropConfig?: {
    enableMultiSelect: boolean;
    enableCrossSetlistDrag: boolean;
    enableSongLibraryDrag: boolean;
    animationDuration: number;
    snapToGrid: boolean;
  };
  
  // Service planning features
  showKeyTransitions?: boolean;
  showTempoFlow?: boolean;
  showDurationAnalysis?: boolean;
  enableServiceAnalytics?: boolean;
  
  // UI customization
  viewMode?: 'compact' | 'detailed' | 'cards';
  showCollaboratorCursors?: boolean;
  enableOptimisticUpdates?: boolean;
  
  // Event handlers
  onItemSelect?: (items: SetlistItem[]) => void;
  onItemReorder?: (fromIndex: number, toIndex: number) => void;
  onBulkUpdate?: (updates: OptimisticUpdate[]) => void;
}

// =====================================================
// Utility Types (Enhanced)
// =====================================================

export type SortField = 'title' | 'artist' | 'key' | 'bpm' | 'usage_count' | 'last_played_at' | 'created_at';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';
export type Theme = 'light' | 'dark';
export type ServiceType = 'worship' | 'pre-service' | 'special' | 'rehearsal' | 'other';

// Enhanced setlist-specific types
export type SetlistStatus = 'draft' | 'ready' | 'in_progress' | 'completed' | 'archived';
export type CollaboratorRole = 'owner' | 'editor' | 'viewer' | 'guest';
export type ConflictType = 'concurrent_edit' | 'version_mismatch' | 'drag_conflict' | 'permission_denied';
export type ChangeType = 'add' | 'remove' | 'reorder' | 'update' | 'bulk_update';
export type DragType = 'song' | 'setlist_item' | 'bulk_selection';
export type DropPosition = 'before' | 'after' | 'inside';
export type TransitionDifficulty = 'smooth' | 'moderate' | 'difficult';
export type FlowRating = 'excellent' | 'good' | 'moderate' | 'challenging';

// Collaboration event types
export type CollaborationEventType = 
  | 'setlist:join' 
  | 'setlist:leave' 
  | 'setlist:change' 
  | 'setlist:cursor' 
  | 'setlist:conflict'
  | 'setlist:drag_start'
  | 'setlist:drag_move' 
  | 'setlist:drag_end'
  | 'setlist:selection_change';

// Permission types
export type PermissionType = 
  | 'can_edit' 
  | 'can_reorder' 
  | 'can_add_songs' 
  | 'can_remove_songs' 
  | 'can_modify_settings' 
  | 'can_invite_others';

// Animation and interaction types
export type AnimationState = 'idle' | 'hover' | 'active' | 'dragging' | 'dropping';
export type InteractionMode = 'mouse' | 'touch' | 'keyboard';
export type SelectionMode = 'single' | 'multiple' | 'range';

// =====================================================
// Enhanced Setlist Management Interfaces
// =====================================================

export interface SetlistTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  category: 'worship' | 'special' | 'seasonal' | 'custom';
  template_items: SetlistTemplateItem[];
  usage_count: number;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SetlistTemplateItem {
  id: string;
  position: number;
  song_id?: string;
  placeholder_name?: string;
  placeholder_type: 'song' | 'prayer' | 'reading' | 'announcement' | 'break';
  suggested_duration?: number;
  notes?: string;
}

export interface SetlistSection {
  id: string;
  name: string;
  description?: string;
  start_position: number;
  end_position: number;
  color?: string;
  is_collapsible: boolean;
  is_collapsed: boolean;
}

export interface SetlistMetrics {
  total_songs: number;
  total_duration: number;
  average_tempo: number;
  key_distribution: Record<string, number>;
  tempo_variance: number;
  flow_score: number;
  difficulty_score: number;
  last_calculated_at: string;
}

// =====================================================
// Multi-Setlist Management
// =====================================================

export interface ServicePlan {
  id: string;
  tenant_id: string;
  name: string;
  service_date: string;
  service_type: ServiceType;
  setlists: Setlist[];
  notes?: string;
  status: SetlistStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SetlistGroup {
  id: string;
  name: string;
  description?: string;
  setlist_ids: string[];
  display_order: number;
  is_parallel: boolean; // Can be performed simultaneously
}

// =====================================================
// Advanced Collaboration Features
// =====================================================

export interface CollaborationSession {
  id: string;
  setlist_id: string;
  host_user_id: string;
  participants: SetlistCollaborator[];
  session_type: 'planning' | 'rehearsal' | 'live_editing';
  started_at: string;
  ended_at?: string;
  is_active: boolean;
  settings: CollaborationSessionSettings;
}

export interface CollaborationSessionSettings {
  allow_anonymous_viewers: boolean;
  require_approval_for_changes: boolean;
  enable_voice_chat: boolean;
  enable_video_chat: boolean;
  auto_save_interval: number;
  max_participants: number;
  lock_after_inactivity: number; // minutes
}

export interface CollaborationNotification {
  id: string;
  type: 'user_joined' | 'user_left' | 'change_made' | 'conflict_detected' | 'conflict_resolved';
  message: string;
  user_id?: string;
  user_name?: string;
  timestamp: string;
  is_read: boolean;
  metadata?: Record<string, any>;
}

// =====================================================
// Real-time Synchronization Interfaces
// =====================================================

export interface SyncState {
  last_sync_timestamp: string;
  pending_changes: OptimisticUpdate[];
  failed_changes: OptimisticUpdate[];
  sync_in_progress: boolean;
  connection_quality: 'excellent' | 'good' | 'poor' | 'offline';
}

export interface ConflictResolutionStrategy {
  type: 'last_write_wins' | 'first_write_wins' | 'merge' | 'manual';
  auto_resolve: boolean;
  merge_strategy?: 'union' | 'intersection' | 'custom';
  custom_resolver?: (conflicts: EditConflict[]) => ConflictResolution[];
}

export interface PresenceIndicator {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  color: string;
  position: CursorPosition;
  is_typing: boolean;
  last_activity: string;
}

// =====================================================
// Drag and Drop Context Interfaces
// =====================================================

export interface DragContext {
  isDragging: boolean;
  draggedItem: SetlistItem | Song | null;
  draggedItems: (SetlistItem | Song)[];
  dragSource: 'library' | 'setlist' | 'external';
  dropTargets: DropTarget[];
  activeDropZone: string | null;
  dragPreview: DragPreviewState;
}

export interface DropTarget {
  id: string;
  type: 'setlist' | 'section' | 'position';
  accepts: DragType[];
  isActive: boolean;
  isValid: boolean;
  position?: number;
  bounds?: DOMRect;
}

export interface DragPreviewState {
  element: HTMLElement | null;
  offset: { x: number; y: number };
  scale: number;
  opacity: number;
  rotation: number;
}

// =====================================================
// Touch and Mobile Interfaces
// =====================================================

export interface TouchDragState extends DragState {
  touchId: number;
  initialTouch: Touch;
  currentTouch: Touch;
  velocity: { x: number; y: number };
  momentum: { x: number; y: number };
}

export interface GestureState {
  isActive: boolean;
  type: 'tap' | 'long_press' | 'swipe' | 'pinch' | 'rotate';
  startTime: number;
  duration: number;
  distance: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  scale?: number;
  rotation?: number;
}

export interface HapticFeedback {
  type: 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification';
  pattern?: number[];
  duration?: number;
}

export interface DragState {
  item: SetlistItem;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  dragOffset: { x: number; y: number };
  ghostElement?: HTMLElement;
  dragType: 'song' | 'setlist_item' | 'bulk_selection';
  dragSource: 'library' | 'setlist' | 'external';
}

export interface DropZoneProps {
  id: string;
  onDrop: (item: SetlistItem | Song, targetIndex: number) => void;
  onDragOver?: (item: SetlistItem | Song, targetIndex: number) => void;
  onDragLeave?: () => void;
  isActive: boolean;
  isValidDropTarget: boolean;
  acceptedTypes: ('song' | 'setlist_item')[];
  dropIndicatorPosition?: 'before' | 'after' | 'inside';
  children: React.ReactNode;
  className?: string;
}

export interface DragItemProps {
  item: SetlistItem | Song;
  index: number;
  onDragStart: (item: SetlistItem | Song, index: number) => void;
  onDragEnd: () => void;
  onDragMove?: (x: number, y: number) => void;
  isDragging: boolean;
  isPreview?: boolean;
  dragHandle?: React.RefObject<HTMLElement>;
  dragConstraints?: {
    horizontal?: boolean;
    vertical?: boolean;
    bounds?: DOMRect;
  };
  children: React.ReactNode;
}

export interface DragPreviewProps {
  item: SetlistItem | Song;
  position: { x: number; y: number };
  isDragging: boolean;
  opacity?: number;
  scale?: number;
  rotation?: number;
}

// Multi-select drag and drop
export interface BulkDragState extends DragState {
  selectedItems: (SetlistItem | Song)[];
  dragCount: number;
}

export interface DropIndicatorProps {
  position: 'before' | 'after' | 'inside';
  isVisible: boolean;
  targetIndex: number;
  className?: string;
}

// =====================================================
// Virtual Scrolling Interfaces
// =====================================================

export interface VirtualScrollProps {
  items: Song[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: Song, index: number) => React.ReactNode;
  overscan?: number;
}

export interface VirtualGridProps extends VirtualScrollProps {
  itemWidth: number;
  containerWidth: number;
  gap?: number;
}

export interface VisibleRange {
  start: number;
  end: number;
}

// =====================================================
// Animation and Motion Interfaces
// =====================================================

export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

export interface StaggerConfig extends AnimationConfig {
  staggerChildren: number;
  delayChildren?: number;
}

export interface CardAnimationProps {
  whileHover?: any;
  whileTap?: any;
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: AnimationConfig;
}

// =====================================================
// React Bits Component Interfaces
// =====================================================

export interface BlurTextProps {
  text: string;
  className?: string;
  animateOnMount?: boolean;
  delay?: number;
}

export interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  size?: number;
}

export interface TiltedCardProps {
  children: React.ReactNode;
  className?: string;
  tiltMaxAngleX?: number;
  tiltMaxAngleY?: number;
  perspective?: number;
}

export interface ShinyTextProps {
  text: string;
  className?: string;
  shimmerWidth?: number;
  animationDuration?: number;
}

export interface MagnetProps {
  children: React.ReactNode;
  className?: string;
  magnetStrength?: number;
  magnetRadius?: number;
}

export interface FadeContentProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  duration?: number;
}

// =====================================================
// Performance and Loading Interfaces
// =====================================================

export interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export interface LoadingSkeletonProps {
  variant: 'card' | 'list' | 'text' | 'avatar' | 'image';
  count?: number;
  className?: string;
}

export interface InfiniteScrollProps {
  hasNextPage: boolean;
  isLoading: boolean;
  loadMore: () => void;
  threshold?: number;
  children: React.ReactNode;
}

// =====================================================
// Accessibility Interfaces
// =====================================================

export interface KeyboardNavigationProps {
  onKeyDown: (event: React.KeyboardEvent) => void;
  focusIndex: number;
  itemCount: number;
  orientation?: 'horizontal' | 'vertical' | 'grid';
}

export interface AriaProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  role?: string;
}

export interface FocusManagementProps {
  autoFocus?: boolean;
  restoreFocus?: boolean;
  trapFocus?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  finalFocusRef?: React.RefObject<HTMLElement>;
}

// =====================================================
// Import/Export Interfaces
// =====================================================

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: ImportError[];
  songs: Song[];
}

export interface ImportError {
  row: number;
  field: string;
  value: any;
  message: string;
}

export interface ExportOptions {
  format: 'csv' | 'pdf' | 'json';
  includeFields: string[];
  filters?: SearchFilters;
  sort?: {
    field: SortField;
    direction: SortDirection;
  };
}

export interface CSVImportConfig {
  delimiter: string;
  hasHeader: boolean;
  fieldMapping: Record<string, string>;
  validation: {
    required: string[];
    optional: string[];
  };
}

export interface ChordProImportConfig {
  preserveFormatting: boolean;
  extractMetadata: boolean;
  defaultKey?: string;
  defaultBpm?: number;
}

// =====================================================
// Error Types
// =====================================================

export interface SongLibraryError {
  code: string;
  message: string;
  details?: any;
}

export interface ValidationError extends SongLibraryError {
  field: string;
  value: any;
}

export interface NetworkError extends SongLibraryError {
  status: number;
  retryable: boolean;
}

export interface ImportValidationError extends SongLibraryError {
  row: number;
  field: string;
  value: any;
}

export interface CollaborationError extends SongLibraryError {
  conflictType: 'version' | 'concurrent' | 'permission';
  conflictingUsers: string[];
}
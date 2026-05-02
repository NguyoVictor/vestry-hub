# Setlist Builder Components

This directory contains the complete implementation of the drag-and-drop setlist builder for the Song Library UI Revamp. The components provide a premium music application experience comparable to Spotify and Apple Music for worship service planning.

## Components Overview

### Core Components

#### `index.tsx` - Main SetlistBuilder Component
The primary container component that orchestrates all setlist functionality:
- **Setlist Management**: Create, edit, delete, and duplicate setlists
- **Drag & Drop Integration**: Full @dnd-kit integration for song reordering
- **Auto-Save**: Real-time saving with conflict detection and rollback
- **Service Analytics**: Duration calculation and key transition analysis
- **Multi-View Support**: Tabbed interface for setlist editing and analytics

#### `DragDropProvider.tsx` - Drag & Drop Context
Provides @dnd-kit context and configuration:
- **Sensor Configuration**: Mouse, touch, and keyboard interaction support
- **Collision Detection**: Smart drop zone targeting with visual feedback
- **Drag State Management**: Tracks active items and drag sources
- **Cross-Component Dragging**: Supports dragging from song library to setlists

#### `SortableSetlistItem.tsx` - Individual Setlist Items
Draggable and sortable setlist items with rich metadata:
- **@dnd-kit Integration**: Sortable behavior with visual feedback
- **Key Override Support**: Display transposed keys with visual indicators
- **Metadata Display**: BPM, duration, key transitions, and notes
- **Action Menu**: Edit, remove, and preview functionality
- **Selection Support**: Multi-select for bulk operations

### Visual Feedback Components

#### `DragPreview.tsx` - Drag Visual Feedback
Renders the visual preview during drag operations:
- **Dynamic Styling**: Different styles for songs vs setlist items
- **Metadata Display**: Shows key information during drag
- **Animation Effects**: Smooth scaling and rotation effects
- **Type Indicators**: Visual cues for drag operation type

#### `DropZone.tsx` - Drop Target Areas
Provides visual drop zones with feedback:
- **Multiple Zone Types**: Empty setlist, insertion points, and reorder zones
- **Visual States**: Active, hover, and valid drop target indicators
- **Animated Feedback**: Smooth transitions and visual cues
- **Type Validation**: Accepts specific drag item types

### Management Components

#### `SetlistManager.tsx` - Setlist CRUD Operations
Comprehensive setlist management interface:
- **Grid Layout**: Responsive card-based setlist overview
- **Inline Editing**: Quick edit functionality with form validation
- **Service Types**: Support for different service categories
- **Collaboration Indicators**: Shows active collaborators and status
- **Bulk Operations**: Duplicate, delete, and batch management

#### `ServiceAnalytics.tsx` - Service Planning Analytics
Advanced analytics for service planning:
- **Duration Analysis**: Total service time with breakdown
- **Key Transitions**: Difficulty analysis and recommendations
- **Tempo Flow**: BPM variance and flow scoring
- **Flow Score**: Overall service quality rating (0-100)
- **Recommendations**: AI-powered suggestions for improvement

### Utility Components

#### `AutoSave.tsx` - Real-time Persistence
Auto-save functionality with conflict resolution:
- **Debounced Saving**: Intelligent save timing to reduce server load
- **Offline Support**: Queue changes when offline, sync when reconnected
- **Conflict Detection**: Optimistic updates with rollback capability
- **Visual Indicators**: Save status with user feedback
- **Manual Override**: Force save option for error recovery

## Features Implemented

### ✅ Drag & Drop Foundation (Task 12.1)
- **@dnd-kit Integration**: Complete setup with sensors and collision detection
- **Visual Feedback**: Drag previews, drop zones, and insertion indicators
- **Touch Support**: Mobile-friendly drag interactions
- **Keyboard Navigation**: Accessibility-compliant keyboard controls
- **Multi-Source Dragging**: Support for library-to-setlist and within-setlist dragging

### ✅ Setlist Management System (Task 12.2)
- **CRUD Operations**: Create, read, update, delete setlists
- **Multiple Setlists**: Support for multiple setlists per service
- **Service Types**: Categorization (worship, pre-service, special, etc.)
- **Inline Editing**: Quick edit without modal dialogs
- **Responsive Design**: Mobile-first responsive layout

### ✅ Service Analytics (Task 12.3)
- **Duration Calculation**: Accurate total service time
- **Key Transition Analysis**: Musical difficulty assessment
- **Flow Scoring**: Algorithmic service quality rating
- **Visual Analytics**: Charts and progress indicators
- **Recommendations Engine**: Smart suggestions for improvement

### ✅ Auto-Save Functionality (Task 12.7)
- **Real-time Saving**: Automatic persistence with 2-second debounce
- **Conflict Resolution**: Optimistic updates with rollback
- **Offline Queue**: Changes saved when connection restored
- **Visual Feedback**: Save status indicators and error handling
- **Manual Override**: Force save for error recovery

## Technical Implementation

### Dependencies
- **@dnd-kit/core**: Core drag and drop functionality
- **@dnd-kit/sortable**: Sortable list behavior
- **@dnd-kit/utilities**: Utility functions and CSS transforms
- **framer-motion**: Smooth animations and transitions
- **date-fns**: Date formatting and manipulation
- **sonner**: Toast notifications for user feedback

### Data Flow
1. **Setlist Selection**: User selects setlist from manager
2. **Drag Operations**: Items dragged within or between containers
3. **Optimistic Updates**: UI updates immediately for responsiveness
4. **Auto-Save**: Changes debounced and saved automatically
5. **Conflict Resolution**: Server conflicts detected and resolved
6. **Analytics Update**: Service metrics recalculated in real-time

### Performance Optimizations
- **Memoized Calculations**: Analytics and duration calculations cached
- **Debounced Auto-Save**: Reduces server load with intelligent timing
- **Virtual Scrolling**: Large setlists handled efficiently (future enhancement)
- **Lazy Loading**: Components loaded on-demand
- **Optimistic Updates**: Immediate UI feedback without server round-trips

## Integration Points

### Parent Component Requirements
The SetlistBuilder expects these props from the parent:
```typescript
interface SetlistBuilderProps {
  setlists: Setlist[];
  songs: Song[];
  loading: boolean;
  activeSetlist: string | null;
  onSetlistActivate: (setlistId: string | null) => void;
  onSetlistCreate: (setlist: Omit<Setlist, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onSetlistUpdate: (setlistId: string, updates: Partial<Setlist>) => Promise<void>;
  onSetlistDelete: (setlistId: string) => Promise<void>;
  onSetlistDuplicate: (setlistId: string) => Promise<void>;
  onAddSongToSetlist: (songId: string, setlistId: string, position?: number) => Promise<void>;
  onRemoveSongFromSetlist: (itemId: string, setlistId: string) => Promise<void>;
  onReorderSetlistItems: (setlistId: string, fromIndex: number, toIndex: number) => Promise<void>;
  enableAutoSave?: boolean;
  showAnalytics?: boolean;
}
```

### Database Integration
The components work with the enhanced setlist schema:
- **set_lists**: Main setlist table with collaboration fields
- **set_list_songs**: Setlist items with position and overrides
- **setlist_collaborations**: Real-time collaboration tracking
- **setlist_change_history**: Change history for undo/redo

### Real-time Features (Future Enhancement)
The architecture supports real-time collaboration:
- **Supabase Realtime**: WebSocket connections for live updates
- **Presence Tracking**: Show active collaborators
- **Conflict Resolution**: Merge conflicting changes
- **Change History**: Undo/redo functionality

## Usage Example

```tsx
import { SetlistBuilder } from './components/SetlistBuilder';

function SongLibraryPage() {
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [activeSetlist, setActiveSetlist] = useState<string | null>(null);

  return (
    <SetlistBuilder
      setlists={setlists}
      songs={songs}
      loading={false}
      activeSetlist={activeSetlist}
      onSetlistActivate={setActiveSetlist}
      onSetlistCreate={handleCreateSetlist}
      onSetlistUpdate={handleUpdateSetlist}
      onSetlistDelete={handleDeleteSetlist}
      onSetlistDuplicate={handleDuplicateSetlist}
      onAddSongToSetlist={handleAddSong}
      onRemoveSongFromSetlist={handleRemoveSong}
      onReorderSetlistItems={handleReorderItems}
      enableAutoSave={true}
      showAnalytics={true}
    />
  );
}
```

## Future Enhancements

### Real-time Collaboration (Task 13)
- **Live Cursors**: Show collaborator positions
- **Presence Indicators**: Active user display
- **Conflict Resolution UI**: Visual merge interface
- **Change Broadcasting**: Real-time updates via WebSocket

### Advanced Analytics
- **Tempo Flow Visualization**: Interactive tempo charts
- **Key Circle Display**: Visual key relationship mapping
- **Historical Analytics**: Usage patterns over time
- **Recommendation Engine**: ML-powered song suggestions

### Mobile Enhancements
- **Touch Gestures**: Swipe actions for mobile
- **Haptic Feedback**: Touch response on supported devices
- **Offline Mode**: Full offline functionality with sync
- **Progressive Web App**: Install as native app

## Testing Strategy

### Unit Tests
- Component rendering and prop handling
- Drag and drop state management
- Auto-save debouncing and error handling
- Analytics calculations and edge cases

### Integration Tests
- End-to-end drag and drop workflows
- Setlist CRUD operations
- Auto-save with network conditions
- Multi-user collaboration scenarios

### Property-Based Tests
- **Property 23**: Drag-and-drop data integrity
- **Property 24**: Service duration calculation accuracy
- **Property 25**: Key transition analysis correctness
- **Property 27**: Auto-save functionality reliability

The SetlistBuilder components provide a comprehensive, production-ready solution for worship service planning with a premium user experience that matches modern music applications.
# Requirements Document

## Introduction

The Song Library UI Revamp transforms the existing basic church administration song library into a premium music product comparable to Spotify and Apple Music. This comprehensive redesign introduces dual-mode theming (Vercel-inspired light mode and Spotify-inspired dark mode), advanced search capabilities, premium UI components, chord transposition tools, service planning features, and enhanced data models with rich metadata support.

## Glossary

- **Song_Library_System**: The complete song management and display system within Vestry
- **Dual_Theme_Engine**: The theming system supporting both light (Vercel aesthetic) and dark (Spotify aesthetic) modes
- **Command_Palette**: The ⌘K search interface using cmdk for advanced song discovery
- **Cover_Art_System**: The system for managing song cover art including auto-generated gradients and ambient color extraction
- **Chord_Transposition_Tool**: The real-time chord key transposition interface with slider control
- **Service_Planning_Interface**: The drag-and-drop setlist builder for worship services
- **Premium_Animation_Engine**: The Framer Motion-based animation system with React Bits components
- **Grid_View_Mode**: Card-based song display with cover art and metadata
- **List_View_Mode**: Compact tabular song display with AnimatedList component
- **Ambient_Color_Bleeding**: Visual effect where cover art colors influence surrounding UI elements
- **React_Bits_Components**: Premium animation components (BlurText, SpotlightCard, TiltedCard, ShinyText, Magnet, FadeContent)
- **Song_Metadata**: Extended song information including BPM, time signature, tags, usage tracking, and cover art
- **Setlist_Builder**: Drag-and-drop interface for creating worship service song sequences
- **Usage_Analytics**: System for tracking song usage patterns and popularity metrics

## Requirements

### Requirement 1: Dual Theme System Implementation

**User Story:** As a worship leader, I want to switch between light and dark themes, so that I can use the song library in different lighting conditions and match my personal preference.

#### Acceptance Criteria

1. THE Dual_Theme_Engine SHALL support light mode with Vercel aesthetic (white surfaces, sharp typography, ultra-thin borders, generous whitespace)
2. THE Dual_Theme_Engine SHALL support dark mode with Spotify aesthetic (deep #0a0a0a background, #111111 cards, #7F77DD purple accents)
3. WHEN dark mode is active, THE Dual_Theme_Engine SHALL implement ambient color bleeding from cover art to surrounding UI elements
4. THE Dual_Theme_Engine SHALL persist theme selection across browser sessions
5. THE Dual_Theme_Engine SHALL provide smooth transitions between theme modes using Framer Motion

### Requirement 2: Premium UI Components Integration

**User Story:** As a user, I want visually stunning interface components, so that the song library feels like a premium music application.

#### Acceptance Criteria

1. THE Song_Library_System SHALL integrate React Bits BlurText component for dynamic text effects
2. THE Song_Library_System SHALL integrate React Bits SpotlightCard component for featured songs
3. THE Song_Library_System SHALL integrate React Bits TiltedCard component for interactive song cards
4. THE Song_Library_System SHALL integrate React Bits ShinyText component for headings and labels
5. THE Song_Library_System SHALL integrate React Bits Magnet component for hover interactions
6. THE Song_Library_System SHALL integrate React Bits FadeContent component for content transitions
7. THE Premium_Animation_Engine SHALL implement stagger animations for card grids and lists
8. THE Premium_Animation_Engine SHALL provide micro-animations for every user interaction

### Requirement 3: Advanced Search and Command Palette

**User Story:** As a worship leader, I want powerful search capabilities with keyboard shortcuts, so that I can quickly find songs during service preparation.

#### Acceptance Criteria

1. THE Command_Palette SHALL activate with ⌘K keyboard shortcut on macOS and Ctrl+K on Windows/Linux
2. THE Command_Palette SHALL implement fuzzy search across song titles, artists, lyrics, and tags
3. THE Command_Palette SHALL provide real-time search results with highlighted matching text
4. THE Command_Palette SHALL support search filters by key, BPM range, time signature, and tags
5. THE Command_Palette SHALL display recent searches and popular songs when empty
6. THE Command_Palette SHALL allow direct navigation to song details from search results

### Requirement 4: Dual View Mode System

**User Story:** As a user, I want to view songs in both grid and list formats, so that I can choose the most appropriate display for my current task.

#### Acceptance Criteria

1. THE Song_Library_System SHALL provide Grid_View_Mode displaying songs as cards with cover art
2. THE Song_Library_System SHALL provide List_View_Mode displaying songs in compact tabular format
3. THE Grid_View_Mode SHALL show cover art, title, artist, key, and BPM on each card
4. THE List_View_Mode SHALL use AnimatedList component for smooth item transitions
5. THE Song_Library_System SHALL persist view mode selection per user
6. WHEN switching view modes, THE Song_Library_System SHALL animate the transition using Framer Motion
7. THE Song_Library_System SHALL maintain scroll position when switching between view modes

### Requirement 5: Cover Art and Visual Enhancement System

**User Story:** As a worship leader, I want visually appealing cover art for songs, so that the library is more engaging and songs are easier to identify.

#### Acceptance Criteria

1. THE Cover_Art_System SHALL support manual cover art upload for songs
2. THE Cover_Art_System SHALL auto-generate gradient-based cover art when no image is provided
3. THE Cover_Art_System SHALL extract dominant colors from uploaded cover art images
4. WHEN in dark mode, THE Cover_Art_System SHALL implement ambient color bleeding effects around song cards
5. THE Cover_Art_System SHALL generate unique gradient patterns based on song title and artist
6. THE Cover_Art_System SHALL optimize cover art images for web display (WebP format, multiple sizes)
7. THE Cover_Art_System SHALL provide fallback gradients when image loading fails

### Requirement 6: Chord Transposition Tool

**User Story:** As a musician, I want to transpose song chords to different keys, so that I can match the vocal range of our singers.

#### Acceptance Criteria

1. THE Chord_Transposition_Tool SHALL provide a slider interface for key changes from -6 to +6 semitones
2. THE Chord_Transposition_Tool SHALL update chord displays in real-time as the slider moves
3. THE Chord_Transposition_Tool SHALL preserve original chord formatting and spacing
4. THE Chord_Transposition_Tool SHALL handle complex chord notations (sus, add, maj7, etc.)
5. THE Chord_Transposition_Tool SHALL display both original and transposed keys prominently
6. THE Chord_Transposition_Tool SHALL reset to original key with double-click on slider center
7. THE Chord_Transposition_Tool SHALL save transposition preferences per song per user

### Requirement 7: Service Planning and Setlist Builder

**User Story:** As a worship leader, I want to create service setlists by dragging songs, so that I can plan worship services efficiently.

#### Acceptance Criteria

1. THE Service_Planning_Interface SHALL provide drag-and-drop functionality using @dnd-kit library
2. THE Setlist_Builder SHALL allow dragging songs from the library into service setlists
3. THE Setlist_Builder SHALL support reordering songs within setlists via drag-and-drop
4. THE Service_Planning_Interface SHALL display total service duration based on song lengths
5. THE Setlist_Builder SHALL show key transitions between consecutive songs
6. THE Service_Planning_Interface SHALL support multiple setlists per service (pre-service, worship, etc.)
7. THE Setlist_Builder SHALL provide visual feedback during drag operations with ghost elements
8. THE Service_Planning_Interface SHALL auto-save setlist changes in real-time

### Requirement 8: Enhanced Song Data Model

**User Story:** As a worship administrator, I want comprehensive song metadata, so that I can better organize and analyze our song library.

#### Acceptance Criteria

1. THE Song_Library_System SHALL store BPM (beats per minute) for each song
2. THE Song_Library_System SHALL store time signature information for each song
3. THE Song_Library_System SHALL support multiple tags per song for categorization
4. THE Song_Library_System SHALL track usage frequency and last played dates
5. THE Song_Library_System SHALL store cover art URLs and dominant color information
6. THE Song_Library_System SHALL maintain song duration in minutes and seconds
7. THE Song_Library_System SHALL support custom fields for church-specific metadata
8. THE Song_Library_System SHALL track creation and modification timestamps for all songs

### Requirement 9: Usage Analytics and Smart Organization

**User Story:** As a worship leader, I want to see song usage patterns, so that I can make informed decisions about repertoire planning.

#### Acceptance Criteria

1. THE Usage_Analytics SHALL track how many times each song has been used in services
2. THE Usage_Analytics SHALL record the last date each song was performed
3. THE Song_Library_System SHALL display "trending" songs based on recent usage patterns
4. THE Song_Library_System SHALL suggest songs based on usage history and patterns
5. THE Usage_Analytics SHALL provide monthly and yearly usage reports
6. THE Song_Library_System SHALL highlight songs that haven't been used recently
7. THE Usage_Analytics SHALL track which songs are most popular across different service types

### Requirement 10: Responsive Design and Mobile Optimization

**User Story:** As a musician, I want to access the song library on mobile devices, so that I can reference songs during rehearsals and services.

#### Acceptance Criteria

1. THE Song_Library_System SHALL provide fully responsive design for mobile, tablet, and desktop
2. THE Song_Library_System SHALL adapt Grid_View_Mode to single column on mobile devices
3. THE Command_Palette SHALL work with touch interfaces and virtual keyboards
4. THE Chord_Transposition_Tool SHALL provide touch-friendly slider controls on mobile
5. THE Setlist_Builder SHALL support touch-based drag-and-drop on mobile devices
6. THE Song_Library_System SHALL optimize image loading for mobile bandwidth constraints
7. THE Song_Library_System SHALL provide swipe gestures for navigation on mobile

### Requirement 11: Performance and Loading Optimization

**User Story:** As a user, I want fast loading times and smooth interactions, so that I can work efficiently without delays.

#### Acceptance Criteria

1. THE Song_Library_System SHALL implement virtual scrolling for large song collections
2. THE Song_Library_System SHALL lazy-load cover art images as they come into viewport
3. THE Song_Library_System SHALL cache frequently accessed songs in browser storage
4. THE Song_Library_System SHALL preload critical UI components and animations
5. THE Song_Library_System SHALL implement progressive loading for song metadata
6. THE Song_Library_System SHALL provide loading skeletons during data fetching
7. THE Song_Library_System SHALL optimize bundle size through code splitting

### Requirement 12: Accessibility and Keyboard Navigation

**User Story:** As a user with accessibility needs, I want full keyboard navigation and screen reader support, so that I can use the song library effectively.

#### Acceptance Criteria

1. THE Song_Library_System SHALL provide full keyboard navigation for all interactive elements
2. THE Song_Library_System SHALL implement proper ARIA labels and roles for screen readers
3. THE Command_Palette SHALL be fully accessible via keyboard shortcuts and navigation
4. THE Chord_Transposition_Tool SHALL support keyboard input for precise key changes
5. THE Song_Library_System SHALL maintain focus management during view transitions
6. THE Song_Library_System SHALL provide high contrast mode support
7. THE Song_Library_System SHALL announce dynamic content changes to screen readers

### Requirement 13: Data Import and Export Capabilities

**User Story:** As a worship administrator, I want to import existing song data and export setlists, so that I can migrate from other systems and share planning information.

#### Acceptance Criteria

1. THE Song_Library_System SHALL support CSV import for bulk song data
2. THE Song_Library_System SHALL support ChordPro format import for chord charts
3. THE Song_Library_System SHALL export setlists in PDF format for printing
4. THE Song_Library_System SHALL export song data in CSV format for backup
5. THE Song_Library_System SHALL validate imported data and report errors clearly
6. THE Song_Library_System SHALL support batch operations for imported songs
7. THE Song_Library_System SHALL maintain data integrity during import/export operations

### Requirement 14: Real-time Collaboration Features

**User Story:** As a worship team member, I want to see live updates when others modify setlists, so that we stay synchronized during planning.

#### Acceptance Criteria

1. THE Service_Planning_Interface SHALL broadcast setlist changes to all connected users in real-time
2. THE Song_Library_System SHALL show which users are currently viewing or editing setlists
3. THE Song_Library_System SHALL prevent conflicting edits with optimistic locking
4. THE Song_Library_System SHALL display user cursors and selections during collaborative editing
5. THE Song_Library_System SHALL maintain change history for setlists with undo/redo capability
6. THE Song_Library_System SHALL notify users of conflicts and provide resolution options
7. THE Song_Library_System SHALL sync changes across multiple browser tabs for the same user

### Requirement 15: Advanced Filtering and Sorting

**User Story:** As a worship leader, I want sophisticated filtering options, so that I can find the right songs for specific service themes or musical requirements.

#### Acceptance Criteria

1. THE Song_Library_System SHALL provide filtering by multiple criteria simultaneously (key, BPM, tags, usage)
2. THE Song_Library_System SHALL support custom filter combinations with AND/OR logic
3. THE Song_Library_System SHALL provide sorting by title, artist, key, BPM, usage frequency, and date added
4. THE Song_Library_System SHALL save frequently used filter combinations as presets
5. THE Song_Library_System SHALL provide quick filter buttons for common criteria (fast songs, slow songs, etc.)
6. THE Song_Library_System SHALL show filter result counts and allow filter refinement
7. THE Song_Library_System SHALL clear filters with a single action while preserving search terms
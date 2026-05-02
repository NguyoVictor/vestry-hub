# Song Library UI Revamp

This directory contains the enhanced Song Library implementation that transforms Vestry's basic song management into a premium music application comparable to Spotify and Apple Music.

## 🎯 Overview

The Song Library UI Revamp introduces:

- **Dual Theme System**: Vercel-inspired light mode and Spotify-inspired dark mode
- **Premium UI Components**: React Bits integration for stunning animations
- **Advanced Search**: ⌘K command palette with fuzzy search
- **Chord Transposition**: Real-time chord key changes with slider control
- **Drag & Drop Setlists**: Intuitive service planning with @dnd-kit
- **Real-time Collaboration**: Multi-user setlist editing
- **Usage Analytics**: Smart song organization and recommendations
- **Performance Optimization**: Virtual scrolling, lazy loading, caching

## 📁 Directory Structure

```
src/pages/media/SongLibrary/
├── index.tsx                    # Main container component
├── components/                  # UI components
│   ├── ThemeProvider/          # Dual theme system
│   ├── CommandPalette/         # ⌘K search interface
│   ├── ViewModeToggle/         # Grid/List view switcher
│   ├── SongGrid/              # Card-based song display
│   ├── SongList/              # Tabular song display
│   └── SetlistBuilder/        # Drag-and-drop setlist management
├── hooks/                      # Custom React hooks
│   ├── useSongs.ts            # Enhanced song data fetching
│   ├── useSetlists.ts         # Setlist management
│   ├── useCommandPalette.ts   # Command palette state
│   └── useUserPreferences.ts  # User settings persistence
├── utils/                      # Utility functions
│   ├── searchEngine.ts        # Fuzzy search with Fuse.js
│   └── gradientGeneration.ts  # Cover art fallback gradients
├── types/                      # TypeScript type exports
├── config/                     # Configuration and constants
└── README.md                   # This file
```

## 🚀 Key Features

### 1. Dual Theme System
- **Light Mode**: Vercel aesthetic with white surfaces, sharp typography, ultra-thin borders
- **Dark Mode**: Spotify aesthetic with deep #0a0a0a background, #111111 cards, #7F77DD purple accents
- **Ambient Colors**: Cover art colors bleed into surrounding UI in dark mode
- **Smooth Transitions**: Framer Motion animations between theme switches

### 2. Command Palette (⌘K)
- **Keyboard Shortcuts**: ⌘K (macOS) or Ctrl+K (Windows/Linux) activation
- **Fuzzy Search**: Powered by Fuse.js across titles, artists, lyrics, tags
- **Real-time Results**: Sub-100ms search result updates
- **Advanced Filters**: Key, BPM range, time signature, tags
- **Smart Suggestions**: Recent searches and popular songs

### 3. Premium UI Components
- **React Bits Integration**: BlurText, SpotlightCard, TiltedCard, ShinyText, Magnet, FadeContent
- **Stagger Animations**: Card grids and lists with sequential reveals
- **Micro-animations**: Every interaction feels polished and responsive
- **Hover Effects**: Subtle elevation and glow effects

### 4. View Modes
- **Grid View**: Card-based display with cover art, metadata, and hover interactions
- **List View**: Compact tabular format with sortable columns and AnimatedList
- **Virtual Scrolling**: Smooth performance with large song collections (1000+ songs)
- **Responsive Design**: Adapts to mobile, tablet, and desktop screens

### 5. Cover Art System
- **Upload Support**: Secure file upload with validation and optimization
- **Auto-generation**: Consistent gradient patterns based on song title/artist
- **Color Extraction**: Dominant colors for ambient theming effects
- **WebP Optimization**: Multiple sizes for responsive display
- **Fallback Gradients**: Beautiful defaults when images fail to load

## 🛠 Technology Stack

### Core Dependencies
- **React 18.3.1**: Component framework with concurrent features
- **Framer Motion 12.38.0**: Animation engine for premium interactions
- **@dnd-kit**: Drag-and-drop functionality for setlist building
- **cmdk 1.1.1**: Command palette implementation
- **TanStack Query 5.83.0**: State management and caching
- **Supabase 2.99.3**: Backend services and real-time features

### New Dependencies (Task 2)
- **react-bits 1.0.5**: Premium animation components
- **react-window 2.2.7**: Virtual scrolling for performance
- **react-window-infinite-loader 2.0.1**: Infinite scroll support
- **colorthief 3.3.1**: Color extraction from images
- **tonal 6.4.3**: Music theory library for chord transposition
- **fuse.js 7.3.0**: Fuzzy search functionality

## 📋 Implementation Tasks

This implementation follows the task breakdown in `tasks.md`:

- [x] **Task 1**: Database Schema Enhancement and Migration
- [x] **Task 2**: Install Dependencies and Project Structure Setup ← **Current**
- [ ] **Task 3**: Enhanced Data Models and TypeScript Interfaces
- [ ] **Task 4**: Dual Theme System Implementation
- [ ] **Task 5**: Cover Art System and Visual Enhancement
- [ ] **Task 6**: Premium UI Components Integration (React Bits)
- [ ] **Task 7**: Advanced Search and Command Palette
- [ ] **Task 8**: Dual View Mode System (Grid and List)
- [ ] **Task 9**: Chord Transposition Tool
- [ ] **Task 10**: Service Planning and Setlist Builder
- [ ] **Task 11**: Real-time Collaboration Features
- [ ] **Task 12**: Usage Analytics and Smart Organization
- [ ] **Task 13**: Performance Optimization Implementation
- [ ] **Task 14**: Mobile Responsiveness and Touch Interactions
- [ ] **Task 15**: Accessibility and Keyboard Navigation
- [ ] **Task 16**: Data Import and Export Capabilities
- [ ] **Task 17**: Integration and Main Song Library Page
- [ ] **Task 18**: End-to-End Testing and Quality Assurance

## 🎨 Design Principles

### 1. Premium User Experience
Every interaction should feel polished and responsive, matching the quality of leading music applications like Spotify and Apple Music.

### 2. Performance First
Large song collections (1000+ songs) must load and scroll smoothly with virtual scrolling, lazy loading, and intelligent caching.

### 3. Accessibility
Full keyboard navigation, screen reader support, and WCAG 2.1 AA compliance ensure the library is usable by everyone.

### 4. Real-time Collaboration
Multiple users can work on setlists simultaneously with conflict resolution and presence indicators.

### 5. Mobile-First Responsive
Touch-friendly interactions and optimized layouts for all device sizes, from mobile to desktop.

## 🔧 Configuration

The `config/index.ts` file contains all configuration options:

- **Performance Settings**: Virtual scrolling, lazy loading, caching
- **Feature Flags**: Enable/disable specific features
- **Theme Configuration**: Light and dark mode color schemes
- **Build Optimization**: Code splitting, asset optimization
- **API Configuration**: Endpoints, timeouts, retry logic
- **Validation Rules**: Input limits, file upload restrictions

## 🧪 Testing Strategy

The implementation includes both unit tests and property-based tests:

### Unit Tests
- Component integration with React Bits
- Theme switching functionality
- Drag-and-drop interactions
- Command palette keyboard shortcuts
- Accessibility compliance

### Property-Based Tests
- Theme persistence across sessions
- Keyboard shortcut activation
- Fuzzy search accuracy
- Real-time collaboration sync
- Performance with large datasets

## 🚀 Getting Started

1. **Install Dependencies** (Already completed in Task 2)
   ```bash
   npm install react-bits react-window colorthief tonal fuse.js
   ```

2. **Import the Enhanced Library**
   ```typescript
   import SongLibrary from '@/pages/media/SongLibrary';
   ```

3. **Use in Your App**
   ```tsx
   <SongLibrary />
   ```

The enhanced Song Library will automatically detect the current tenant and provide all premium features out of the box.

## 📚 Documentation

- **Requirements**: See `requirements.md` for detailed feature specifications
- **Design**: See `design.md` for technical architecture and implementation details
- **Tasks**: See `tasks.md` for the complete implementation roadmap
- **Types**: See `@/types/song-library.ts` for TypeScript interfaces

## 🤝 Contributing

When working on the Song Library UI Revamp:

1. Follow the existing component structure and naming conventions
2. Use TypeScript interfaces from `@/types/song-library.ts`
3. Implement proper error handling and loading states
4. Add appropriate animations with Framer Motion
5. Ensure accessibility compliance
6. Write both unit and property-based tests
7. Update this README when adding new features

## 🎵 The Vision

Transform Vestry's song library from a basic CRUD interface into a premium music application that worship leaders and musicians love to use. Every interaction should feel smooth, every feature should be intuitive, and every design decision should prioritize the user experience.

Welcome to the future of church music management! 🎶
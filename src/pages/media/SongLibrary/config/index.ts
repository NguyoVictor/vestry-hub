/**
 * Configuration for Song Library UI Revamp
 * 
 * Central configuration for:
 * - Performance settings
 * - Feature flags
 * - Default values
 * - Build optimization settings
 */

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  // Virtual scrolling settings
  VIRTUAL_SCROLL_ITEM_HEIGHT: 280, // Grid item height
  VIRTUAL_SCROLL_BUFFER_SIZE: 5, // Items to render outside viewport
  
  // Lazy loading settings
  LAZY_LOAD_THRESHOLD: '50px', // Intersection observer root margin
  IMAGE_LOADING_TIMEOUT: 5000, // Max time to wait for image load
  
  // Search debounce
  SEARCH_DEBOUNCE_MS: 300,
  
  // Cache settings
  QUERY_STALE_TIME: 5 * 60 * 1000, // 5 minutes
  QUERY_CACHE_TIME: 30 * 60 * 1000, // 30 minutes
  
  // Animation settings
  STAGGER_DELAY: 0.05, // Seconds between staggered animations
  TRANSITION_DURATION: 0.2, // Default transition duration
};

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_REACT_BITS: true,
  ENABLE_VIRTUAL_SCROLLING: true,
  ENABLE_REAL_TIME_COLLABORATION: true,
  ENABLE_USAGE_ANALYTICS: true,
  ENABLE_CHORD_TRANSPOSITION: true,
  ENABLE_COVER_ART_UPLOAD: true,
  ENABLE_AMBIENT_COLORS: true,
  ENABLE_COMMAND_PALETTE: true,
};

// Default Values
export const DEFAULTS = {
  VIEW_MODE: 'grid' as const,
  THEME: 'light' as const,
  SONGS_PER_PAGE: 20,
  MAX_RECENT_SEARCHES: 5,
  MAX_FILTER_PRESETS: 10,
  DEFAULT_SONG_DURATION: 180, // 3 minutes in seconds
  
  // Gradient colors for songs without cover art
  FALLBACK_GRADIENT: ['#f97316', '#ea580c'], // Orange gradient
  
  // Musical keys
  MUSICAL_KEYS: [
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 
    'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'
  ],
  
  // Time signatures
  TIME_SIGNATURES: ['4/4', '3/4', '2/4', '6/8', '12/8', '5/4', '7/8'],
  
  // BPM ranges
  BPM_RANGES: {
    SLOW: [60, 90],
    MEDIUM: [90, 120],
    FAST: [120, 180],
    VERY_FAST: [180, 220],
  },
};

// Theme Configuration
export const THEME_CONFIG = {
  LIGHT: {
    name: 'light',
    colors: {
      background: '#fafafa',
      surface: '#ffffff',
      subtle: '#f4f4f5',
      primary: '#f97316',
      secondary: '#fb923c',
      accent: '#ea580c',
      text: {
        primary: '#0a0a0a',
        secondary: '#525252',
        muted: '#a1a1aa',
      },
      border: '#e4e4e7',
    },
  },
  DARK: {
    name: 'dark',
    colors: {
      background: '#0a0a0a',
      surface: '#111111',
      subtle: '#1a1a1a',
      primary: '#7F77DD',
      secondary: '#9c88ff',
      accent: '#6b5cff',
      text: {
        primary: '#ffffff',
        secondary: '#b3b3b3',
        muted: '#737373',
      },
      border: '#262626',
    },
  },
};

// Build Configuration
export const BUILD_CONFIG = {
  // Code splitting points
  LAZY_ROUTES: [
    'SongLibrary',
    'CommandPalette',
    'ChordTransposition',
    'SetlistBuilder',
  ],
  
  // Bundle optimization
  CHUNK_SIZE_WARNING_LIMIT: 1000, // KB
  
  // Asset optimization
  IMAGE_FORMATS: ['webp', 'jpg', 'png'],
  IMAGE_SIZES: [150, 300, 600, 1200], // Responsive image sizes
  
  // Service worker configuration
  CACHE_STRATEGIES: {
    SONGS: 'stale-while-revalidate',
    IMAGES: 'cache-first',
    API: 'network-first',
  },
};

// API Configuration
export const API_CONFIG = {
  // Endpoints
  ENDPOINTS: {
    SONGS: '/api/songs',
    SETLISTS: '/api/setlists',
    UPLOAD_COVER_ART: '/api/songs/upload-cover-art',
    ANALYTICS: '/api/analytics/songs',
    COLLABORATION: '/api/collaboration',
  },
  
  // Request settings
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second base delay
  
  // Real-time settings
  WEBSOCKET_RECONNECT_INTERVAL: 5000, // 5 seconds
  PRESENCE_UPDATE_INTERVAL: 30000, // 30 seconds
};

// Validation Rules
export const VALIDATION = {
  SONG: {
    TITLE_MAX_LENGTH: 200,
    ARTIST_MAX_LENGTH: 100,
    LYRICS_MAX_LENGTH: 10000,
    CHORDS_MAX_LENGTH: 5000,
    TAGS_MAX_COUNT: 10,
    TAG_MAX_LENGTH: 50,
  },
  
  SETLIST: {
    NAME_MAX_LENGTH: 100,
    NOTES_MAX_LENGTH: 1000,
    MAX_SONGS: 50,
  },
  
  SEARCH: {
    QUERY_MIN_LENGTH: 2,
    QUERY_MAX_LENGTH: 100,
  },
  
  FILE_UPLOAD: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
  },
};

export default {
  PERFORMANCE_CONFIG,
  FEATURE_FLAGS,
  DEFAULTS,
  THEME_CONFIG,
  BUILD_CONFIG,
  API_CONFIG,
  VALIDATION,
};
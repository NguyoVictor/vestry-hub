/**
 * Song Library UI Revamp - Main Container Component
 * 
 * This is the main entry point for the enhanced Song Library that transforms
 * Vestry's basic song management into a premium music application comparable
 * to Spotify and Apple Music.
 * 
 * Features:
 * - Dual theme system (Vercel light + Spotify dark)
 * - Premium UI components with React Bits integration
 * - Advanced search with ⌘K command palette
 * - Chord transposition tools
 * - Drag-and-drop setlist building
 * - Real-time collaboration
 * - Usage analytics and smart organization
 * - Performance optimizations (lazy loading, caching, code splitting)
 * - Comprehensive error handling and retry mechanisms
 * - Offline support
 */

import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from "react";
import React from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Music, CalendarDays, Plus, Command, Search } from "lucide-react";

// Error handling
import { SongLibraryErrorBoundary } from "./components/ErrorBoundary";

// Performance optimization imports
import { 
  useCachedSongs, 
  useCacheWarming, 
  usePreloader,
  useCacheRefresh 
} from "./hooks/useCaching";
import { 
  useProgressiveLoading, 
  useLoadingSkeletons 
} from "./hooks/useLazyLoading";
import { 
  initializeBundleOptimization, 
  preloadingStrategies,
  networkAwareLoading 
} from "./utils/bundleOptimization";
import { LazyWrapper, LazyCardWrapper, LazyPanelWrapper } from "./components/LazyWrapper";
import { 
  SongGridSkeleton, 
  SongListSkeleton, 
  SetlistSkeleton,
  ProgressiveSkeleton 
} from "./components/LoadingSkeletons";
import { PerformanceMonitor } from "./components/PerformanceMonitor";

// Import theme styles
import "./styles/theme.css";

// Lazy imports for code splitting
import { 
  LazyChordTransposition,
  LazySetlistBuilder,
  LazyCommandPalette,
  LazyAdvancedFiltering,
  LazyUsageAnalytics,
  LazyCollaborationPanel
} from "./utils/lazyImports";

// Import enhanced components with React Bits integration
import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeToggle } from "./components/ThemeProvider/ThemeToggle";
import { SongGrid } from "./components/SongGrid";
import { SongList } from "./components/SongList";
import { ViewModeToggle } from "./components/ViewModeToggle";

// Import accessibility components
import { 
  AccessibilityProvider,
  AccessibleSongGrid,
  AccessibleCommandPalette,
  KeyboardShortcutsHelp,
  useAccessibility,
  useAccessibleAnnouncements,
  useKeyboardOnly
} from "./components/Accessibility";

// Import React Bits components
import { 
  ShinyPageTitle, 
  MagneticButton, 
  FadeContent
} from "./components/ReactBits";

// Import Animation Engine
import { 
  StaggerContainer, 
  StaggerItem, 
  PageTransition,
  AnimatedCard 
} from "./components/AnimationEngine";

// Import mobile navigation
import { SwipeNavigation, commonSwipeActions } from "./components/Navigation/SwipeNavigation";
import { HapticButton, HapticPrimaryButton } from "./components/Feedback/HapticButton";
import { MobilePerformanceMonitor } from "./components/Performance/MobilePerformanceMonitor";

// Import hooks (to be implemented)
import { useSongs } from "./hooks/useSongs";
import { useSetlists } from "./hooks/useSetlists";
import { useCommandPalette } from "./hooks/useCommandPalette";
import { useUserPreferences } from "./hooks/useUserPreferences";
import { useMobileResponsive, useMobileCommandPalette } from "./hooks/useMobileResponsive";

// Import types
import type { Song, Setlist, ViewMode, SongLibraryState } from "@/types/song-library";

/**
 * Inner component that uses accessibility hooks
 * Must be wrapped by AccessibilityProvider
 */
function SongLibraryInner() {
  const { tenantId } = useChurch();
  
  // Accessibility hooks (now safe to use inside AccessibilityProvider)
  const { 
    isHighContrast, 
    prefersReducedMotion, 
    showKeyboardHelp, 
    setShowKeyboardHelp 
  } = useAccessibility();
  const { announceNavigation, announceStateChange } = useAccessibleAnnouncements();
  const { isKeyboardOnly, shouldShowFocusRing } = useKeyboardOnly();
  
  // Performance optimization hooks
  const { getCachedSong, setCachedSong } = useCachedSongs();
  const { preloadPopularSongs, preloadCoverArt, preloadComponents } = usePreloader();
  const { refreshAllCaches } = useCacheRefresh();
  const { 
    isLoadingEssential, 
    isLoadingSupplementary, 
    essentialLoaded,
    loadEssential,
    loadSupplementary 
  } = useProgressiveLoading();
  const { showSkeletons, hideSkeletons, skeletonItems } = useLoadingSkeletons();
  
  // Main state management
  const [state, setState] = useState<SongLibraryState>({
    viewMode: 'grid',
    searchQuery: '',
    filters: {},
    selectedSongs: [],
    activeSetlist: null,
    isCommandPaletteOpen: false,
  });

  // Add Song modal state
  const [isAddSongModalOpen, setIsAddSongModalOpen] = useState(false);

  // Performance tracking
  const [performanceMetrics, setPerformanceMetrics] = useState({
    initialLoadTime: 0,
    componentsLoaded: 0,
    cacheHitRatio: 0,
  });

  // Mobile responsive hooks
  const mobileResponsive = useMobileResponsive({
    enableTouchGestures: true,
    enableHapticFeedback: true,
    adaptiveImageLoading: true,
    autoSwitchToListOnMobile: true,
    touchOptimizedAnimations: true,
  });

  const mobileCommandPalette = useMobileCommandPalette();

  // Scroll position tracking for view mode switching
  const [scrollPosition, setScrollPosition] = useState(0);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Data fetching hooks with caching
  const { data: songs = [], isLoading: loadingSongs } = useSongs(tenantId);
  const { data: setlists = [], isLoading: loadingSetlists } = useSetlists(tenantId);
  
  // Feature hooks
  const { preferences, updatePreferences } = useUserPreferences();
  const { 
    isOpen: isCommandPaletteOpen, 
    toggle: toggleCommandPalette,
    close: closeCommandPalette 
  } = useCommandPalette();

  // Initialize performance optimizations
  useEffect(() => {
    const startTime = Date.now();
    
    // Initialize bundle optimization
    initializeBundleOptimization();
    
    // Adjust loading strategy based on network
    networkAwareLoading.adjustStrategy();
    
    // Preload critical components
    preloadComponents().then(() => {
      setPerformanceMetrics(prev => ({
        ...prev,
        componentsLoaded: prev.componentsLoaded + 1,
        initialLoadTime: Date.now() - startTime,
      }));
    });

    // Trigger route-based preloading
    preloadingStrategies.onRouteEnter('/media/song-library');
    
    return () => {
      // Cleanup performance monitoring
    };
  }, [preloadComponents]);

  // Cache warming for popular songs
  useCacheWarming(
    songs.filter(s => s.is_trending).map(s => s.id).slice(0, 10),
    [], // Recent searches would come from user preferences
    async (id) => songs.find(s => s.id === id)!,
    async (query) => ({ results: [], query })
  );

  // Progressive loading of song data
  useEffect(() => {
    if (songs.length > 0 && !essentialLoaded) {
      loadEssential(async () => {
        // Load essential song metadata first
        hideSkeletons();
        
        // Preload cover art for visible songs
        const visibleSongs = songs.slice(0, 12);
        const coverArtUrls = visibleSongs
          .map(s => s.cover_art_url)
          .filter(Boolean) as string[];
        
        if (coverArtUrls.length > 0) {
          await preloadCoverArt(coverArtUrls);
        }
      });

      // Load supplementary data after essential data
      setTimeout(() => {
        loadSupplementary(async () => {
          // Load usage analytics, trending data, etc.
          const popularSongIds = songs
            .filter(s => s.usage_count > 0)
            .sort((a, b) => b.usage_count - a.usage_count)
            .slice(0, 20)
            .map(s => s.id);
          
          await preloadPopularSongs(popularSongIds, async (id) => 
            songs.find(s => s.id === id)!
          );
        });
      }, 1000);
    }
  }, [songs, essentialLoaded, loadEssential, loadSupplementary, hideSkeletons, preloadCoverArt, preloadPopularSongs]);

  // Initialize view mode from preferences
  useEffect(() => {
    if (preferences.view_mode && preferences.view_mode !== state.viewMode) {
      setState(prev => ({ ...prev, viewMode: preferences.view_mode }));
    }
  }, [preferences.view_mode]);

  // Save scroll position when switching views
  const saveScrollPosition = useCallback(() => {
    const container = state.viewMode === 'grid' 
      ? gridContainerRef.current 
      : listContainerRef.current;
    
    if (container) {
      setScrollPosition(container.scrollTop);
    }
  }, [state.viewMode]);

  // Restore scroll position after view switch
  const restoreScrollPosition = useCallback(() => {
    // Use a small delay to ensure the new view has rendered
    setTimeout(() => {
      const container = state.viewMode === 'grid' 
        ? gridContainerRef.current 
        : listContainerRef.current;
      
      if (container) {
        container.scrollTop = scrollPosition;
      }
    }, 100);
  }, [state.viewMode, scrollPosition]);

  // Keyboard shortcuts with performance optimizations
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ⌘K or Ctrl+K to open command palette (desktop only)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k' && !mobileResponsive.isMobile) {
        event.preventDefault();
        
        // Preload command palette if not already loaded
        preloadingStrategies.onUserInteraction('hover-search-button');
        
        toggleCommandPalette();
      }
      
      // Escape to close command palette
      if (event.key === 'Escape') {
        if (mobileResponsive.isMobile && mobileCommandPalette.isMobileSearchOpen) {
          mobileCommandPalette.closeMobileSearch();
        } else if (isCommandPaletteOpen) {
          closeCommandPalette();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    isCommandPaletteOpen, 
    toggleCommandPalette, 
    closeCommandPalette, 
    mobileResponsive.isMobile,
    mobileCommandPalette.isMobileSearchOpen,
    mobileCommandPalette.closeMobileSearch
  ]);

  // Interaction-based preloading
  const handleInteractionPreload = useCallback((interaction: string) => {
    preloadingStrategies.onUserInteraction(interaction);
  }, []);

  // Update view mode with smooth transitions and persistence
  const handleViewModeChange = useCallback((viewMode: ViewMode) => {
    // Save current scroll position
    saveScrollPosition();
    
    // Use mobile-optimized view mode if on mobile
    const finalViewMode = mobileResponsive.isMobile && mobileResponsive.optimalViewMode 
      ? mobileResponsive.optimalViewMode 
      : viewMode;
    
    // Update state
    setState(prev => ({ ...prev, viewMode: finalViewMode }));
    
    // Persist to preferences
    updatePreferences({ view_mode: finalViewMode });
    
    // Restore scroll position after transition
    restoreScrollPosition();
    
    // Trigger haptic feedback on mobile
    mobileResponsive.triggerHaptic('light');
    
    // Announce view mode change
    announceStateChange(`Switched to ${finalViewMode} view`);
  }, [saveScrollPosition, updatePreferences, restoreScrollPosition, mobileResponsive, announceStateChange]);

  // Handle song selection
  const handleSongSelect = (song: Song) => {
    setState(prev => ({
      ...prev,
      selectedSongs: prev.selectedSongs.includes(song.id)
        ? prev.selectedSongs.filter(id => id !== song.id)
        : [...prev.selectedSongs, song.id]
    }));
    
    // Announce selection change
    const isSelected = state.selectedSongs.includes(song.id);
    announceStateChange(
      isSelected 
        ? `Deselected ${song.title}` 
        : `Selected ${song.title}`
    );
  };

  // Handle swipe gestures for mobile navigation
  const handleSwipeLeft = useCallback(() => {
    if (mobileResponsive.isMobile) {
      // Switch to list view
      if (state.viewMode === 'grid') {
        handleViewModeChange('list');
      }
    }
  }, [mobileResponsive.isMobile, state.viewMode, handleViewModeChange]);

  const handleSwipeRight = useCallback(() => {
    if (mobileResponsive.isMobile) {
      // Switch to grid view
      if (state.viewMode === 'list') {
        handleViewModeChange('grid');
      }
    }
  }, [mobileResponsive.isMobile, state.viewMode, handleViewModeChange]);

  const handleSwipeUp = useCallback(() => {
    if (mobileResponsive.isMobile) {
      // Open search
      mobileCommandPalette.openMobileSearch();
    }
  }, [mobileResponsive.isMobile, mobileCommandPalette.openMobileSearch]);

  const handleSwipeDown = useCallback(() => {
    if (mobileResponsive.isMobile) {
      // Refresh or close modals
      if (mobileCommandPalette.isMobileSearchOpen) {
        mobileCommandPalette.closeMobileSearch();
      }
    }
  }, [mobileResponsive.isMobile, mobileCommandPalette.isMobileSearchOpen, mobileCommandPalette.closeMobileSearch]);

  // Handle setlist activation
  const handleSetlistActivate = useCallback((setlistId: string | null) => {
    setState(prev => ({ ...prev, activeSetlist: setlistId }));
  }, []);

  // Create swipe actions for mobile
  const leftSwipeActions = useMemo(() => [
    {
      ...commonSwipeActions.search,
      action: mobileCommandPalette.openMobileSearch,
    }
  ], [mobileCommandPalette.openMobileSearch]);

  const rightSwipeActions = useMemo(() => [
    {
      ...commonSwipeActions.gridView,
      action: () => handleViewModeChange('grid'),
    },
    {
      ...commonSwipeActions.listView,
      action: () => handleViewModeChange('list'),
    }
  ], [handleViewModeChange]);

  // Page transition animation
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <ThemeProvider>
      <PageTransition className={`min-h-screen sl-theme-transition ${mobileResponsive.mobileClasses}`}>
        <div
          className="min-h-screen transition-all duration-500 ease-out"
          style={{
            backgroundColor: 'var(--sl-bg-app)',
            color: 'var(--sl-text-primary)'
          }}
          {...(mobileResponsive.touchInteractionEnabled ? mobileResponsive.touchGestures : {})}
        >
          <Helmet>
            <title>Song Library — Vestry</title>
            <meta name="description" content="Premium song library with advanced search, chord transposition, and setlist building" />
          </Helmet>

          {/* Command Palette - Lazy Loaded */}
          <LazyWrapper
            componentName="CommandPalette"
            fallback={<div className="hidden" />}
          >
            <Suspense fallback={null}>
              {mobileResponsive.isMobile ? (
                // Mobile-optimized fullscreen command palette
                <LazyWrapper
                  componentName="MobileCommandPalette"
                  fallback={<div className="hidden" />}
                >
                  <Suspense fallback={null}>
                    {React.createElement(
                      React.lazy(() => import('./components/CommandPalette/MobileCommandPalette')),
                      {
                        isOpen: mobileCommandPalette.isMobileSearchOpen,
                        onClose: mobileCommandPalette.closeMobileSearch,
                        songs: songs,
                        onSongSelect: (song: Song) => {
                          handleSongSelect(song);
                          mobileCommandPalette.closeMobileSearch();
                        }
                      }
                    )}
                  </Suspense>
                </LazyWrapper>
              ) : (
                // Desktop accessible command palette
                <AccessibleCommandPalette
                  isOpen={isCommandPaletteOpen}
                  onClose={closeCommandPalette}
                  songs={songs}
                  onSongSelect={(song) => {
                    handleSongSelect(song);
                    closeCommandPalette();
                  }}
                  accessibilityOptions={{
                    announceResults: true,
                    announceNavigation: true,
                    enableTypeAhead: true
                  }}
                />
              )}
            </Suspense>
          </LazyWrapper>

          {/* Keyboard Shortcuts Help */}
          <KeyboardShortcutsHelp
            isOpen={showKeyboardHelp}
            onClose={() => setShowKeyboardHelp(false)}
          />

          {/* Main Content with Swipe Navigation */}
          <SwipeNavigation
            leftActions={mobileResponsive.isMobile ? leftSwipeActions : []}
            rightActions={mobileResponsive.isMobile ? rightSwipeActions : []}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onSwipeUp={handleSwipeUp}
            onSwipeDown={handleSwipeDown}
            isEnabled={mobileResponsive.isMobile}
            className="flex-1"
          >
            <FadeContent show={true} direction="up" duration={0.6}>
              <div className={`sl-container space-y-6 ${mobileResponsive.isMobile ? 'px-4 py-4' : 'px-6 py-6'}`}>
              {/* Page Header with React Bits */}
              <div className={`flex items-start justify-between gap-4 mb-6 ${mobileResponsive.isMobile ? 'flex-col' : ''}`}>
                <div className={mobileResponsive.isMobile ? 'w-full' : ''}>
                  <ShinyPageTitle 
                    title="Song Library" 
                    className={`mb-2 ${mobileResponsive.isMobile ? 'text-2xl' : ''}`}
                  />
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`sl-text-secondary ${mobileResponsive.isMobile ? 'text-sm' : 'text-sm'}`}
                  >
                    {mobileResponsive.isMobile 
                      ? "Premium music management" 
                      : "Premium music management with advanced search, chord tools, and collaboration"
                    }
                  </motion.p>
                </div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`flex items-center gap-3 ${mobileResponsive.isMobile ? 'w-full justify-between' : ''}`}
                >
                  <ThemeToggle size="sm" />
                  
                  {/* Mobile Search Button */}
                  {mobileResponsive.isMobile ? (
                    <MagneticButton
                      onClick={mobileCommandPalette.openMobileSearch}
                      className="sl-button-secondary flex-1 min-h-[44px]"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Search Songs
                    </MagneticButton>
                  ) : (
                    <MagneticButton
                      onClick={toggleCommandPalette}
                      onMouseEnter={() => handleInteractionPreload('hover-search-button')}
                      className="hidden sm:flex sl-button-secondary"
                    >
                      <Command className="h-4 w-4 mr-2" />
                      Search
                      <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 rounded">
                        ⌘K
                      </kbd>
                    </MagneticButton>
                  )}
                  
                  <ViewModeToggle
                    viewMode={mobileResponsive.optimalViewMode || state.viewMode}
                    onChange={handleViewModeChange}
                    isMobile={mobileResponsive.isMobile}
                  />
                  
                  <HapticPrimaryButton 
                    className={`sl-button-primary ${mobileResponsive.isMobile ? 'min-h-[44px] px-4' : ''}`}
                    touchOptimized={mobileResponsive.isMobile}
                    onClick={() => setIsAddSongModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {mobileResponsive.isMobile ? 'Add' : 'Add Song'}
                  </HapticPrimaryButton>
                </motion.div>
              </div>

              {/* Stats Cards with Stagger Animation */}
              <StaggerContainer 
                variant={mobileResponsive.isMobile ? "fast" : "normal"} 
                className={`grid gap-4 ${
                  mobileResponsive.isMobile 
                    ? 'grid-cols-2' 
                    : 'grid-cols-2 lg:grid-cols-4'
                }`}
              >
                {[
                  { 
                    label: "Total Songs", 
                    value: songs.length, 
                    icon: Music, 
                    color: "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400" 
                  },
                  { 
                    label: "Trending", 
                    value: songs.filter(s => s.is_trending).length, 
                    icon: Music, 
                    color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" 
                  },
                  { 
                    label: "With Chords", 
                    value: songs.filter(s => s.chords || s.chord_sheet_path).length, 
                    icon: Music, 
                    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" 
                  },
                  { 
                    label: "Setlists", 
                    value: setlists.length, 
                    icon: CalendarDays, 
                    color: "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" 
                  },
                ].map(({ label, value, icon: Icon, color }, index) => (
                  <StaggerItem key={label} variant="stagger">
                    <AnimatedCard
                      variant="normal"
                      className="sl-card p-5"
                      style={{
                        boxShadow: 'var(--sl-shadow-sm)',
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs sl-text-muted font-medium uppercase tracking-wide">
                            {label}
                          </p>
                          <motion.p 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ 
                              delay: index * 0.1 + 0.5,
                              type: "spring",
                              stiffness: 200 
                            }}
                            className="text-2xl font-bold sl-text-primary"
                          >
                            {value}
                          </motion.p>
                        </div>
                      </div>
                    </AnimatedCard>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              {/* Main Tabs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Tabs defaultValue="library" className="space-y-6">
                  <TabsList className="sl-card">
                    <TabsTrigger value="library" className="flex items-center gap-2 sl-text-primary">
                      <Music className="h-4 w-4" />
                      Song Library
                    </TabsTrigger>
                    <TabsTrigger value="setlists" className="flex items-center gap-2 sl-text-primary">
                      <CalendarDays className="h-4 w-4" />
                      Setlists
                    </TabsTrigger>
                  </TabsList>

                  {/* Song Library Tab with Progressive Loading */}
                  <TabsContent value="library" className="space-y-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={state.viewMode}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <FadeContent 
                          show={true} 
                          direction="up" 
                          duration={0.4}
                        >
                          {/* Show progressive loading skeleton during initial load */}
                          {isLoadingEssential && showSkeletons ? (
                            <ProgressiveSkeleton 
                              stage={essentialLoaded ? 'essential' : 'initial'}
                              className="space-y-6"
                            />
                          ) : (
                            <>
                              {state.viewMode === 'grid' ? (
                                <div ref={gridContainerRef} className="overflow-auto">
                                  {loadingSongs && showSkeletons ? (
                                    <SongGridSkeleton count={12} />
                                  ) : (
                                    <AccessibleSongGrid
                                      songs={songs}
                                      loading={loadingSongs}
                                      selectedSongs={state.selectedSongs}
                                      onSongSelect={handleSongSelect}
                                      onAddSong={() => setIsAddSongModalOpen(true)}
                                      onSongPlay={(song) => {
                                        console.log('Playing song:', song.title);
                                        announceStateChange(`Playing ${song.title}`, true);
                                      }}
                                      onSongFavorite={(song) => {
                                        console.log('Favoriting song:', song.title);
                                        announceStateChange(`Added ${song.title} to favorites`);
                                      }}
                                      onSongMoreOptions={(song) => {
                                        console.log('More options for song:', song.title);
                                        announceStateChange(`Opened options for ${song.title}`);
                                      }}
                                      searchQuery={state.searchQuery}
                                      filters={state.filters}
                                      variant="mixed"
                                      cardSize="md"
                                      isMobile={mobileResponsive.isMobile}
                                      className={shouldShowFocusRing ? 'keyboard-navigation-active' : ''}
                                    />
                                  )}
                                </div>
                              ) : (
                                <div ref={listContainerRef} className="overflow-auto">
                                  {loadingSongs && showSkeletons ? (
                                    <SongListSkeleton count={10} />
                                  ) : (
                                    <SongList
                                      songs={songs}
                                      loading={loadingSongs}
                                      selectedSongs={state.selectedSongs}
                                      onSongSelect={handleSongSelect}
                                      searchQuery={state.searchQuery}
                                      filters={state.filters}
                                      containerHeight={600}
                                      enableVirtualScrolling={true}
                                      enableLazyLoading={true}
                                      isMobile={mobileResponsive.isMobile}
                                      isTouch={mobileResponsive.isTouch}
                                      onScroll={(position) => {
                                        if (position > 0.8) {
                                          handleInteractionPreload('scroll-near-bottom');
                                        }
                                      }}
                                    />
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </FadeContent>
                      </motion.div>
                    </AnimatePresence>
                  </TabsContent>

                  {/* Setlists Tab - Lazy Loaded */}
                  <TabsContent value="setlists" className="space-y-6">
                    <FadeContent show={true} direction="up" duration={0.4}>
                      <LazyPanelWrapper componentName="SetlistBuilder">
                        <Suspense fallback={<SetlistSkeleton />}>
                          {loadingSetlists ? (
                            <SetlistSkeleton />
                          ) : (
                            <LazySetlistBuilder
                              setlists={setlists}
                              songs={songs}
                              loading={loadingSetlists}
                              activeSetlist={state.activeSetlist}
                              onSetlistActivate={handleSetlistActivate}
                              onSetlistCreate={async (setlist) => {
                                // Implementation needed
                                console.log('Create setlist:', setlist);
                              }}
                              onSetlistUpdate={async (setlistId, updates) => {
                                // Implementation needed
                                console.log('Update setlist:', setlistId, updates);
                              }}
                              onSetlistDelete={async (setlistId) => {
                                // Implementation needed
                                console.log('Delete setlist:', setlistId);
                              }}
                              onSetlistDuplicate={async (setlistId) => {
                                // Implementation needed
                                console.log('Duplicate setlist:', setlistId);
                              }}
                              onAddSongToSetlist={async (songId, setlistId, position) => {
                                // Implementation needed
                                console.log('Add song to setlist:', songId, setlistId, position);
                              }}
                              onRemoveSongFromSetlist={async (itemId, setlistId) => {
                                // Implementation needed
                                console.log('Remove song from setlist:', itemId, setlistId);
                              }}
                              onReorderSetlistItems={async (setlistId, fromIndex, toIndex) => {
                                // Implementation needed
                                console.log('Reorder setlist items:', setlistId, fromIndex, toIndex);
                              }}
                              enableCollaboration={true}
                              collaborationConfig={{
                                enableRealTime: true,
                                enablePresence: true,
                                enableConflictResolution: true,
                                enableCrossTabSync: true,
                              }}
                            />
                          )}
                        </Suspense>
                      </LazyPanelWrapper>
                    </FadeContent>
                  </TabsContent>
                </Tabs>
              </motion.div>
            </div>
          </FadeContent>
        </SwipeNavigation>
        </div>

        {/* Performance Monitor */}
        {mobileResponsive.isMobile ? (
          <MobilePerformanceMonitor 
            enabled={process.env.NODE_ENV === 'development'}
            autoOptimize={true}
            onSettingsChange={(settings) => {
              console.log('Performance settings changed:', settings);
              // Could update global performance settings here
            }}
          />
        ) : (
          <PerformanceMonitor 
            enabled={process.env.NODE_ENV === 'development'}
            position="bottom-right"
            compact={false}
          />
        )}

        {/* Add Song Modal */}
        <Dialog open={isAddSongModalOpen} onOpenChange={setIsAddSongModalOpen}>
          <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <DialogHeader>
              <DialogTitle className="font-jakarta text-slate-900 dark:text-slate-100">Add New Song</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="song-title" className="font-jakarta">Song Title</Label>
                <Input
                  id="song-title"
                  placeholder="Amazing Grace"
                  className="font-jakarta"
                />
              </div>
              <div>
                <Label htmlFor="song-artist" className="font-jakarta">Artist</Label>
                <Input
                  id="song-artist"
                  placeholder="John Newton"
                  className="font-jakarta"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="song-key" className="font-jakarta">Key</Label>
                  <Input
                    id="song-key"
                    placeholder="G"
                    className="font-jakarta"
                  />
                </div>
                <div>
                  <Label htmlFor="song-bpm" className="font-jakarta">BPM</Label>
                  <Input
                    id="song-bpm"
                    type="number"
                    placeholder="120"
                    className="font-jakarta"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="song-lyrics" className="font-jakarta">Lyrics (Optional)</Label>
                <Textarea
                  id="song-lyrics"
                  placeholder="Enter song lyrics..."
                  rows={6}
                  className="font-jakarta"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddSongModalOpen(false)}
                  className="font-jakarta"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta"
                  onClick={() => {
                    // TODO: Implement song creation
                    toast.success('Song creation will be implemented soon');
                    setIsAddSongModalOpen(false);
                  }}
                >
                  Add Song
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PageTransition>
    </ThemeProvider>
  );
}

/**
 * Content wrapper with AccessibilityProvider
 */
function SongLibraryContent() {
  return (
    <AccessibilityProvider>
      <SongLibraryInner />
    </AccessibilityProvider>
  );
}

/**
 * Main Song Library Component with Error Boundary
 */
export default function SongLibrary() {
  return (
    <SongLibraryErrorBoundary
      onError={(error, errorInfo) => {
        // Log to monitoring service
        console.error('Song Library Error:', error, errorInfo);
        
        // Could send to Sentry or other monitoring service
        // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
      }}
    >
      <SongLibraryContent />
    </SongLibraryErrorBoundary>
  );
}
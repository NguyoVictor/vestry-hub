/**
 * Enhanced Setlist Builder Component for Song Library UI Revamp
 * 
 * Complete drag-and-drop setlist building with:
 * - @dnd-kit integration for smooth drag operations
 * - Real-time auto-save functionality
 * - Service duration calculation and analytics
 * - Key transition analysis
 * - Multiple setlists per service support
 * - Comprehensive setlist management
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft,
  Plus, 
  Music, 
  Clock, 
  Users, 
  BarChart3,
  Settings,
  Shuffle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Import new components
import { DragDropProvider } from './DragDropProvider';
import { SortableSetlistItem } from './SortableSetlistItem';
import { DropZone, EmptySetlistDropZone, InsertionDropZone } from './DropZone';
import { SetlistManager } from './SetlistManager';
import { ServiceAnalytics } from './ServiceAnalytics';
import { AutoSaveProvider, useAutoSave } from './AutoSave';
import { CollaborationPanel } from './CollaborationPanel';
import { ConflictResolution } from './ConflictResolution';
import { CrossTabSync } from './CrossTabSync';

// Import collaboration hooks
import { useCollaboration } from '../../hooks/useCollaboration';
import { useCrossTabSync } from '../../hooks/useCrossTabSync';

import type { Song, Setlist, SetlistItem } from '@/types/song-library';

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
  enableCollaboration?: boolean;
  collaborationConfig?: {
    enableRealTime?: boolean;
    enablePresence?: boolean;
    enableConflictResolution?: boolean;
    enableCrossTabSync?: boolean;
  };
}

export function SetlistBuilder({ 
  setlists, 
  songs, 
  loading, 
  activeSetlist, 
  onSetlistActivate,
  onSetlistCreate,
  onSetlistUpdate,
  onSetlistDelete,
  onSetlistDuplicate,
  onAddSongToSetlist,
  onRemoveSongFromSetlist,
  onReorderSetlistItems,
  enableAutoSave = true,
  showAnalytics = true,
  enableCollaboration = true,
  collaborationConfig = {},
}: SetlistBuilderProps) {
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [draggedSong, setDraggedSong] = useState<Song | null>(null);
  const [showConflictResolution, setShowConflictResolution] = useState<string | null>(null);

  // Get the currently active setlist data
  const currentSetlist = useMemo(() => {
    return selectedSetlist || setlists.find(s => s.id === activeSetlist) || null;
  }, [selectedSetlist, setlists, activeSetlist]);

  // Collaboration hooks
  const collaboration = useCollaboration({
    setlistId: currentSetlist?.id || '',
    config: {
      enableRealTime: collaborationConfig.enableRealTime ?? true,
      enablePresence: collaborationConfig.enablePresence ?? true,
      enableConflictResolution: collaborationConfig.enableConflictResolution ?? true,
    },
    onCollaboratorJoin: (collaborator) => {
      console.log('Collaborator joined:', collaborator);
    },
    onCollaboratorLeave: (userId) => {
      console.log('Collaborator left:', userId);
    },
    onSetlistChange: (change) => {
      console.log('Setlist changed:', change);
      // Handle incoming changes from other collaborators
    },
    onConflictDetected: (conflict) => {
      console.log('Conflict detected:', conflict);
      setShowConflictResolution(conflict.id);
    },
  });

  // Cross-tab synchronization
  const crossTabSync = useCrossTabSync({
    channelName: `setlist-${currentSetlist?.id || 'none'}`,
    enableLogging: process.env.NODE_ENV === 'development',
    onMessage: (message) => {
      console.log('Cross-tab message:', message);
    },
  });

  // Handle setlist selection
  const handleSetlistSelect = useCallback((setlist: Setlist) => {
    setSelectedSetlist(setlist);
    onSetlistActivate(setlist.id);
  }, [onSetlistActivate]);

  // Handle going back to setlist overview
  const handleBackToOverview = useCallback(() => {
    setSelectedSetlist(null);
    onSetlistActivate(null);
    setSelectedItems([]);
  }, [onSetlistActivate]);

  // Handle adding song to setlist
  const handleAddSongToSetlist = useCallback(async (song: Song, position?: number) => {
    if (!currentSetlist) return;
    
    try {
      await onAddSongToSetlist(song.id, currentSetlist.id, position);
      
      // Broadcast change to collaborators
      if (enableCollaboration && collaboration.state.isConnected) {
        await collaboration.broadcastChange({
          id: Date.now().toString(),
          type: 'song_add',
          user_id: 'current-user', // This should come from auth context
          user_name: 'Current User', // This should come from auth context
          timestamp: new Date().toISOString(),
          data: { song, position },
          previous_state: currentSetlist,
        });
      }
      
      toast.success(`Added "${song.title}" to setlist`);
    } catch (error) {
      toast.error('Failed to add song to setlist');
      console.error('Error adding song to setlist:', error);
    }
  }, [currentSetlist, onAddSongToSetlist, enableCollaboration, collaboration]);

  // Handle reordering items within setlist
  const handleReorderItems = useCallback(async (fromIndex: number, toIndex: number) => {
    if (!currentSetlist) return;
    
    try {
      await onReorderSetlistItems(currentSetlist.id, fromIndex, toIndex);
      
      // Broadcast change to collaborators
      if (enableCollaboration && collaboration.state.isConnected) {
        await collaboration.broadcastChange({
          id: Date.now().toString(),
          type: 'setlist_reorder',
          user_id: 'current-user', // This should come from auth context
          user_name: 'Current User', // This should come from auth context
          timestamp: new Date().toISOString(),
          data: { fromIndex, toIndex },
          previous_state: currentSetlist,
        });
      }
    } catch (error) {
      toast.error('Failed to reorder songs');
      console.error('Error reordering setlist items:', error);
    }
  }, [currentSetlist, onReorderSetlistItems, enableCollaboration, collaboration]);

  // Handle removing item from setlist
  const handleRemoveItem = useCallback(async (item: SetlistItem) => {
    if (!currentSetlist) return;
    
    try {
      await onRemoveSongFromSetlist(item.id, currentSetlist.id);
      
      // Broadcast change to collaborators
      if (enableCollaboration && collaboration.state.isConnected) {
        await collaboration.broadcastChange({
          id: Date.now().toString(),
          type: 'song_remove',
          user_id: 'current-user', // This should come from auth context
          user_name: 'Current User', // This should come from auth context
          timestamp: new Date().toISOString(),
          data: { item },
          previous_state: currentSetlist,
        });
      }
      
      toast.success('Song removed from setlist');
    } catch (error) {
      toast.error('Failed to remove song');
      console.error('Error removing song from setlist:', error);
    }
  }, [currentSetlist, onRemoveSongFromSetlist, enableCollaboration, collaboration]);

  // Handle item selection
  const handleItemSelect = useCallback((item: SetlistItem) => {
    setSelectedItems(prev => {
      const isSelected = prev.includes(item.id);
      if (isSelected) {
        return prev.filter(id => id !== item.id);
      } else {
        return [...prev, item.id];
      }
    });
  }, []);

  // Calculate total duration for a setlist
  const calculateDuration = useCallback((setlist: Setlist) => {
    const totalSeconds = setlist.items.reduce((total, item) => {
      const song = songs.find(s => s.id === item.song_id);
      const duration = item.duration_override || song?.duration_seconds || 180; // Default 3 minutes
      return total + duration;
    }, 0);
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds > 0 ? `${seconds}s` : ''}`;
  }, [songs]);

  // Auto-save handler
  const handleAutoSave = useCallback(async (setlist: Setlist) => {
    if (!setlist) return;
    
    try {
      await onSetlistUpdate(setlist.id, {
        items: setlist.items,
        total_duration: setlist.items.reduce((total, item) => {
          const song = songs.find(s => s.id === item.song_id);
          return total + (item.duration_override || song?.duration_seconds || 180);
        }, 0),
        last_modified_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
      throw error;
    }
  }, [onSetlistUpdate, songs]);

  // Handle conflict resolution
  const handleResolveConflict = useCallback(async (
    conflictId: string, 
    resolution: 'accept' | 'reject' | 'merge', 
    mergedData?: any
  ) => {
    try {
      await collaboration.resolveConflict(conflictId, resolution);
      setShowConflictResolution(null);
      toast.success('Conflict resolved successfully');
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      toast.error('Failed to resolve conflict');
    }
  }, [collaboration]);

  // Handle collaboration reconnection
  const handleReconnect = useCallback(async () => {
    try {
      await collaboration.joinCollaboration();
      toast.success('Reconnected to collaboration');
    } catch (error) {
      console.error('Failed to reconnect:', error);
      toast.error('Failed to reconnect');
    }
  }, [collaboration]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If a setlist is selected, show the detailed view
  if (currentSetlist) {
    return (
      <AutoSaveProvider
        setlist={currentSetlist}
        onSave={handleAutoSave}
        enabled={enableAutoSave}
        showIndicator={true}
      >
        <DragDropProvider
          setlistItems={currentSetlist.items}
          onReorderItems={handleReorderItems}
          onAddSongToSetlist={handleAddSongToSetlist}
        >
          <div className="space-y-6">
            {/* Setlist Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToOverview}
                  className="font-jakarta"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Setlists
                </Button>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-jakarta">
                    {currentSetlist.name}
                  </h2>
                  {currentSetlist.service_date && (
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-jakarta">
                      {format(new Date(currentSetlist.service_date), 'EEEE, MMMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-jakarta">Duration</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 font-jakarta">
                    {calculateDuration(currentSetlist)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-jakarta">Songs</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 font-jakarta">
                    {currentSetlist.items.length}
                  </p>
                </div>
                
                {/* Collaboration Status */}
                {enableCollaboration && (
                  <CollaborationPanel
                    state={collaboration.state}
                    collaborators={collaboration.collaborators}
                    activeCollaborators={collaboration.activeCollaborators}
                    canUndo={collaboration.canUndo}
                    canRedo={collaboration.canRedo}
                    onUndo={collaboration.undo}
                    onRedo={collaboration.redo}
                    onResolveConflict={handleResolveConflict}
                    onReconnect={handleReconnect}
                    compact={true}
                  />
                )}
                
                <Button 
                  size="sm" 
                  className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Song
                </Button>
              </div>
            </div>

            {/* Tabs for different views */}
            <Tabs defaultValue="setlist" className="w-full">
              <TabsList className={`grid w-full ${enableCollaboration ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <TabsTrigger value="setlist" className="font-jakarta">
                  <Music className="h-4 w-4 mr-2" />
                  Setlist
                </TabsTrigger>
                {showAnalytics && (
                  <TabsTrigger value="analytics" className="font-jakarta">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </TabsTrigger>
                )}
                {enableCollaboration && (
                  <TabsTrigger value="collaboration" className="font-jakarta">
                    <Users className="h-4 w-4 mr-2" />
                    Collaboration
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="setlist" className="space-y-4">
                {/* Setlist Items */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-jakarta">
                      Songs in Setlist
                    </h3>
                    
                    {selectedItems.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-jakarta">
                          {selectedItems.length} selected
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-jakarta"
                        >
                          <Shuffle className="h-4 w-4 mr-2" />
                          Reorder
                        </Button>
                      </div>
                    )}
                  </div>

                  {currentSetlist.items.length === 0 ? (
                    <EmptySetlistDropZone isOver={false} />
                  ) : (
                    <div className="space-y-2">
                      {currentSetlist.items.map((item, index) => {
                        const song = songs.find(s => s.id === item.song_id);
                        if (!song) return null;

                        return (
                          <React.Fragment key={item.id}>
                            {/* Insertion drop zone before first item */}
                            {index === 0 && (
                              <InsertionDropZone
                                position={0}
                                isVisible={false} // Will be controlled by drag state
                                isOver={false}
                              />
                            )}
                            
                            <SortableSetlistItem
                              item={item}
                              song={song}
                              index={index}
                              isSelected={selectedItems.includes(item.id)}
                              onSelect={handleItemSelect}
                              onRemove={handleRemoveItem}
                              showKeyTransitions={showAnalytics}
                            />
                            
                            {/* Insertion drop zone after each item */}
                            <InsertionDropZone
                              position={index + 1}
                              isVisible={false} // Will be controlled by drag state
                              isOver={false}
                            />
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              {showAnalytics && (
                <TabsContent value="analytics">
                  <ServiceAnalytics
                    setlist={currentSetlist}
                    songs={songs}
                    showKeyTransitions={true}
                    showTempoFlow={true}
                    showDurationAnalysis={true}
                  />
                </TabsContent>
              )}

              {enableCollaboration && (
                <TabsContent value="collaboration">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CollaborationPanel
                      state={collaboration.state}
                      collaborators={collaboration.collaborators}
                      activeCollaborators={collaboration.activeCollaborators}
                      canUndo={collaboration.canUndo}
                      canRedo={collaboration.canRedo}
                      onUndo={collaboration.undo}
                      onRedo={collaboration.redo}
                      onResolveConflict={handleResolveConflict}
                      onReconnect={handleReconnect}
                      compact={false}
                      showHistory={true}
                      showConflicts={true}
                    />
                    
                    <CrossTabSync
                      setlistId={currentSetlist.id}
                      onSyncStateChange={(isConnected, tabCount) => {
                        console.log('Cross-tab sync status:', isConnected, tabCount);
                      }}
                    />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </DragDropProvider>
      </AutoSaveProvider>
    );
  }

  // Show setlist management overview
  return (
    <>
      <SetlistManager
        setlists={setlists}
        activeSetlist={activeSetlist}
        onSetlistCreate={onSetlistCreate}
        onSetlistUpdate={onSetlistUpdate}
        onSetlistDelete={onSetlistDelete}
        onSetlistDuplicate={onSetlistDuplicate}
        onSetlistActivate={handleSetlistSelect}
      />
      
      {/* Conflict Resolution Modal */}
      <AnimatePresence>
        {showConflictResolution && collaboration.state.conflicts.length > 0 && (
          <ConflictResolution
            conflict={collaboration.state.conflicts.find(c => c.id === showConflictResolution)!}
            songs={songs}
            onResolve={handleResolveConflict}
            onCancel={() => setShowConflictResolution(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default SetlistBuilder;
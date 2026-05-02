/**
 * Cross-Tab Synchronization Hook for Song Library UI Revamp
 * 
 * Provides seamless synchronization across multiple browser tabs:
 * - BroadcastChannel API for tab communication
 * - State synchronization across tabs
 * - Event broadcasting and listening
 * - Unified user experience across tabs
 * 
 * Requirements: 14.7
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface CrossTabSyncOptions {
  channelName: string;
  enableLogging?: boolean;
  onMessage?: (message: CrossTabMessage) => void;
  onTabConnect?: (tabId: string) => void;
  onTabDisconnect?: (tabId: string) => void;
}

interface CrossTabMessage {
  type: string;
  data: any;
  timestamp: number;
  tabId: string;
  userId?: string;
}

interface TabInfo {
  id: string;
  connected: boolean;
  lastSeen: number;
  userId?: string;
}

interface UseCrossTabSyncReturn {
  // Tab management
  currentTabId: string;
  connectedTabs: TabInfo[];
  isSupported: boolean;
  
  // Communication
  broadcast: (type: string, data: any) => void;
  sendToTab: (tabId: string, type: string, data: any) => void;
  
  // State sync
  syncState: (key: string, value: any) => void;
  getSharedState: (key: string) => any;
  
  // Events
  addEventListener: (type: string, handler: (data: any) => void) => () => void;
  removeEventListener: (type: string, handler: (data: any) => void) => void;
}

/**
 * Generate unique tab ID
 */
function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Cross-Tab Synchronization Hook
 * 
 * Manages communication and state synchronization across multiple browser tabs
 * for the same user session, providing a unified collaboration experience.
 */
export function useCrossTabSync({
  channelName,
  enableLogging = false,
  onMessage,
  onTabConnect,
  onTabDisconnect,
}: CrossTabSyncOptions): UseCrossTabSyncReturn {
  const [currentTabId] = useState(() => generateTabId());
  const [connectedTabs, setConnectedTabs] = useState<TabInfo[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const [sharedState, setSharedState] = useState<Record<string, any>>({});
  
  const channelRef = useRef<BroadcastChannel | null>(null);
  const eventListenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Log debug messages if logging is enabled
   */
  const log = useCallback((...args: any[]) => {
    if (enableLogging) {
      console.log(`[CrossTabSync:${currentTabId}]`, ...args);
    }
  }, [enableLogging, currentTabId]);

  /**
   * Initialize BroadcastChannel
   */
  const initializeChannel = useCallback(() => {
    if (typeof BroadcastChannel === 'undefined') {
      log('BroadcastChannel not supported');
      setIsSupported(false);
      return;
    }
    
    try {
      const channel = new BroadcastChannel(channelName);
      channelRef.current = channel;
      setIsSupported(true);
      
      log('Channel initialized:', channelName);
      
      // Listen for messages
      channel.addEventListener('message', (event) => {
        const message: CrossTabMessage = event.data;
        
        // Ignore messages from this tab
        if (message.tabId === currentTabId) return;
        
        log('Received message:', message);
        
        // Handle system messages
        switch (message.type) {
          case 'tab-heartbeat':
            handleTabHeartbeat(message);
            break;
            
          case 'tab-disconnect':
            handleTabDisconnect(message);
            break;
            
          case 'state-sync':
            handleStateSync(message);
            break;
            
          case 'state-request':
            handleStateRequest(message);
            break;
            
          default:
            // Custom message handling
            onMessage?.(message);
            
            // Trigger event listeners
            const listeners = eventListenersRef.current.get(message.type);
            if (listeners) {
              listeners.forEach(handler => {
                try {
                  handler(message.data);
                } catch (error) {
                  console.error('Error in event listener:', error);
                }
              });
            }
            break;
        }
      });
      
      // Announce this tab's presence
      broadcast('tab-heartbeat', {
        tabId: currentTabId,
        timestamp: Date.now(),
      });
      
      // Request current state from other tabs
      broadcast('state-request', {
        tabId: currentTabId,
        timestamp: Date.now(),
      });
      
    } catch (error) {
      console.error('Failed to initialize BroadcastChannel:', error);
      setIsSupported(false);
    }
  }, [channelName, currentTabId, log, onMessage]);

  /**
   * Handle tab heartbeat messages
   */
  const handleTabHeartbeat = useCallback((message: CrossTabMessage) => {
    const { tabId, userId } = message.data;
    
    setConnectedTabs(prev => {
      const existing = prev.find(tab => tab.id === tabId);
      if (existing) {
        return prev.map(tab => 
          tab.id === tabId 
            ? { ...tab, lastSeen: Date.now(), userId }
            : tab
        );
      } else {
        // New tab connected
        onTabConnect?.(tabId);
        return [...prev, {
          id: tabId,
          connected: true,
          lastSeen: Date.now(),
          userId,
        }];
      }
    });
  }, [onTabConnect]);

  /**
   * Handle tab disconnect messages
   */
  const handleTabDisconnect = useCallback((message: CrossTabMessage) => {
    const { tabId } = message.data;
    
    setConnectedTabs(prev => prev.filter(tab => tab.id !== tabId));
    onTabDisconnect?.(tabId);
    
    log('Tab disconnected:', tabId);
  }, [onTabDisconnect, log]);

  /**
   * Handle state synchronization messages
   */
  const handleStateSync = useCallback((message: CrossTabMessage) => {
    const { key, value } = message.data;
    
    setSharedState(prev => ({
      ...prev,
      [key]: value,
    }));
    
    log('State synced:', key, value);
  }, [log]);

  /**
   * Handle state request messages
   */
  const handleStateRequest = useCallback((message: CrossTabMessage) => {
    const { tabId } = message.data;
    
    // Send current state to requesting tab
    if (Object.keys(sharedState).length > 0) {
      sendToTab(tabId, 'state-sync-bulk', {
        state: sharedState,
        timestamp: Date.now(),
      });
    }
  }, [sharedState]);

  /**
   * Broadcast message to all tabs
   */
  const broadcast = useCallback((type: string, data: any) => {
    if (!channelRef.current || !isSupported) return;
    
    const message: CrossTabMessage = {
      type,
      data,
      timestamp: Date.now(),
      tabId: currentTabId,
    };
    
    try {
      channelRef.current.postMessage(message);
      log('Broadcasted:', type, data);
    } catch (error) {
      console.error('Failed to broadcast message:', error);
    }
  }, [isSupported, currentTabId, log]);

  /**
   * Send message to specific tab
   */
  const sendToTab = useCallback((tabId: string, type: string, data: any) => {
    broadcast(type, {
      ...data,
      targetTabId: tabId,
    });
  }, [broadcast]);

  /**
   * Synchronize state across tabs
   */
  const syncState = useCallback((key: string, value: any) => {
    // Update local state
    setSharedState(prev => ({
      ...prev,
      [key]: value,
    }));
    
    // Broadcast to other tabs
    broadcast('state-sync', {
      key,
      value,
      timestamp: Date.now(),
    });
  }, [broadcast]);

  /**
   * Get shared state value
   */
  const getSharedState = useCallback((key: string) => {
    return sharedState[key];
  }, [sharedState]);

  /**
   * Add event listener for custom messages
   */
  const addEventListener = useCallback((type: string, handler: (data: any) => void) => {
    const listeners = eventListenersRef.current.get(type) || new Set();
    listeners.add(handler);
    eventListenersRef.current.set(type, listeners);
    
    // Return cleanup function
    return () => {
      const currentListeners = eventListenersRef.current.get(type);
      if (currentListeners) {
        currentListeners.delete(handler);
        if (currentListeners.size === 0) {
          eventListenersRef.current.delete(type);
        }
      }
    };
  }, []);

  /**
   * Remove event listener
   */
  const removeEventListener = useCallback((type: string, handler: (data: any) => void) => {
    const listeners = eventListenersRef.current.get(type);
    if (listeners) {
      listeners.delete(handler);
      if (listeners.size === 0) {
        eventListenersRef.current.delete(type);
      }
    }
  }, []);

  /**
   * Clean up disconnected tabs
   */
  const cleanupDisconnectedTabs = useCallback(() => {
    const now = Date.now();
    const timeout = 60000; // 1 minute timeout
    
    setConnectedTabs(prev => {
      const active = prev.filter(tab => now - tab.lastSeen < timeout);
      const disconnected = prev.filter(tab => now - tab.lastSeen >= timeout);
      
      // Notify about disconnected tabs
      disconnected.forEach(tab => {
        onTabDisconnect?.(tab.id);
        log('Tab timed out:', tab.id);
      });
      
      return active;
    });
  }, [onTabDisconnect, log]);

  /**
   * Send heartbeat to maintain connection
   */
  const sendHeartbeat = useCallback(() => {
    broadcast('tab-heartbeat', {
      tabId: currentTabId,
      timestamp: Date.now(),
    });
  }, [broadcast, currentTabId]);

  // Initialize on mount
  useEffect(() => {
    initializeChannel();
    
    // Set up heartbeat interval
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000); // 30 seconds
    
    // Set up cleanup interval
    cleanupIntervalRef.current = setInterval(cleanupDisconnectedTabs, 60000); // 1 minute
    
    return () => {
      // Clean up intervals
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
      
      // Announce disconnect
      if (channelRef.current && isSupported) {
        broadcast('tab-disconnect', {
          tabId: currentTabId,
          timestamp: Date.now(),
        });
      }
      
      // Close channel
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, []);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible, send heartbeat
        sendHeartbeat();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sendHeartbeat]);

  // Handle beforeunload to announce disconnect
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (channelRef.current && isSupported) {
        broadcast('tab-disconnect', {
          tabId: currentTabId,
          timestamp: Date.now(),
        });
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [broadcast, currentTabId, isSupported]);

  return {
    // Tab management
    currentTabId,
    connectedTabs,
    isSupported,
    
    // Communication
    broadcast,
    sendToTab,
    
    // State sync
    syncState,
    getSharedState,
    
    // Events
    addEventListener,
    removeEventListener,
  };
}

export default useCrossTabSync;
/**
 * Cross-Tab Synchronization Utilities for Song Library UI Revamp
 * 
 * Provides seamless synchronization across multiple browser tabs:
 * - BroadcastChannel API for tab communication
 * - State synchronization across tabs
 * - Event broadcasting and listening
 * - Unified user experience across tabs
 * - Tab lifecycle management
 * 
 * Requirements: 14.7
 */

import { toast } from 'sonner';

interface CrossTabMessage {
  type: string;
  data: any;
  timestamp: number;
  tabId: string;
  userId?: string;
  sessionId?: string;
}

interface TabInfo {
  id: string;
  connected: boolean;
  lastSeen: number;
  userId?: string;
  sessionId?: string;
  metadata?: {
    userAgent?: string;
    url?: string;
    title?: string;
  };
}

interface CrossTabSyncOptions {
  channelName: string;
  enableLogging?: boolean;
  heartbeatInterval?: number;
  tabTimeout?: number;
  maxRetries?: number;
  onMessage?: (message: CrossTabMessage) => void;
  onTabConnect?: (tabInfo: TabInfo) => void;
  onTabDisconnect?: (tabId: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Cross-Tab Synchronization Manager
 * 
 * Manages communication and state synchronization across multiple browser tabs
 * for the same user session, providing a unified collaboration experience.
 */
export class CrossTabSyncManager {
  private channelName: string;
  private channel: BroadcastChannel | null = null;
  private tabId: string;
  private connectedTabs: Map<string, TabInfo> = new Map();
  private sharedState: Map<string, any> = new Map();
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private options: Required<CrossTabSyncOptions>;
  private isInitialized = false;
  private retryCount = 0;

  constructor(options: CrossTabSyncOptions) {
    this.channelName = options.channelName;
    this.tabId = this.generateTabId();
    
    this.options = {
      enableLogging: false,
      heartbeatInterval: 30000, // 30 seconds
      tabTimeout: 60000, // 1 minute
      maxRetries: 3,
      onMessage: () => {},
      onTabConnect: () => {},
      onTabDisconnect: () => {},
      onError: () => {},
      ...options,
    };
  }

  /**
   * Initialize cross-tab synchronization
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (typeof BroadcastChannel === 'undefined') {
        throw new Error('BroadcastChannel API not supported');
      }

      this.channel = new BroadcastChannel(this.channelName);
      this.setupEventListeners();
      this.startHeartbeat();
      this.startCleanup();
      
      // Announce this tab's presence
      await this.announcePresence();
      
      // Request current state from other tabs
      await this.requestState();
      
      this.isInitialized = true;
      this.retryCount = 0;
      
      this.log('Cross-tab sync initialized');
      
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Destroy cross-tab synchronization
   */
  async destroy(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Announce disconnect
      await this.announceDisconnect();
      
      // Clear intervals
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }
      
      // Close channel
      if (this.channel) {
        this.channel.close();
        this.channel = null;
      }
      
      // Clear state
      this.connectedTabs.clear();
      this.sharedState.clear();
      this.eventListeners.clear();
      
      this.isInitialized = false;
      
      this.log('Cross-tab sync destroyed');
      
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Broadcast message to all tabs
   */
  async broadcast(type: string, data: any): Promise<void> {
    if (!this.channel || !this.isInitialized) {
      throw new Error('Cross-tab sync not initialized');
    }

    const message: CrossTabMessage = {
      type,
      data,
      timestamp: Date.now(),
      tabId: this.tabId,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
    };

    try {
      this.channel.postMessage(message);
      this.log('Broadcasted message:', type, data);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Send message to specific tab
   */
  async sendToTab(tabId: string, type: string, data: any): Promise<void> {
    await this.broadcast(type, {
      ...data,
      targetTabId: tabId,
    });
  }

  /**
   * Synchronize state across tabs
   */
  async syncState(key: string, value: any): Promise<void> {
    // Update local state
    this.sharedState.set(key, value);
    
    // Broadcast to other tabs
    await this.broadcast('state-sync', {
      key,
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * Get shared state value
   */
  getSharedState(key: string): any {
    return this.sharedState.get(key);
  }

  /**
   * Get all shared state
   */
  getAllSharedState(): Record<string, any> {
    return Object.fromEntries(this.sharedState);
  }

  /**
   * Add event listener for custom messages
   */
  addEventListener(type: string, handler: (data: any) => void): () => void {
    const listeners = this.eventListeners.get(type) || new Set();
    listeners.add(handler);
    this.eventListeners.set(type, listeners);
    
    // Return cleanup function
    return () => {
      const currentListeners = this.eventListeners.get(type);
      if (currentListeners) {
        currentListeners.delete(handler);
        if (currentListeners.size === 0) {
          this.eventListeners.delete(type);
        }
      }
    };
  }

  /**
   * Remove event listener
   */
  removeEventListener(type: string, handler: (data: any) => void): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.delete(handler);
      if (listeners.size === 0) {
        this.eventListeners.delete(type);
      }
    }
  }

  /**
   * Get connected tabs
   */
  getConnectedTabs(): TabInfo[] {
    return Array.from(this.connectedTabs.values());
  }

  /**
   * Get current tab ID
   */
  getCurrentTabId(): string {
    return this.tabId;
  }

  /**
   * Check if cross-tab sync is supported
   */
  static isSupported(): boolean {
    return typeof BroadcastChannel !== 'undefined';
  }

  /**
   * Setup event listeners for BroadcastChannel
   */
  private setupEventListeners(): void {
    if (!this.channel) return;

    this.channel.addEventListener('message', (event) => {
      const message: CrossTabMessage = event.data;
      
      // Ignore messages from this tab
      if (message.tabId === this.tabId) return;
      
      this.log('Received message:', message);
      
      // Handle system messages
      switch (message.type) {
        case 'tab-heartbeat':
          this.handleTabHeartbeat(message);
          break;
          
        case 'tab-disconnect':
          this.handleTabDisconnect(message);
          break;
          
        case 'state-sync':
          this.handleStateSync(message);
          break;
          
        case 'state-request':
          this.handleStateRequest(message);
          break;
          
        case 'state-sync-bulk':
          this.handleStateSyncBulk(message);
          break;
          
        default:
          // Custom message handling
          this.options.onMessage(message);
          
          // Trigger event listeners
          const listeners = this.eventListeners.get(message.type);
          if (listeners) {
            listeners.forEach(handler => {
              try {
                handler(message.data);
              } catch (error) {
                this.handleError(error as Error);
              }
            });
          }
          break;
      }
    });
  }

  /**
   * Handle tab heartbeat messages
   */
  private handleTabHeartbeat(message: CrossTabMessage): void {
    const { tabId, userId, sessionId } = message;
    const { metadata } = message.data;
    
    const existingTab = this.connectedTabs.get(tabId);
    const tabInfo: TabInfo = {
      id: tabId,
      connected: true,
      lastSeen: Date.now(),
      userId,
      sessionId,
      metadata,
    };
    
    if (!existingTab) {
      // New tab connected
      this.connectedTabs.set(tabId, tabInfo);
      this.options.onTabConnect(tabInfo);
      this.log('Tab connected:', tabId);
    } else {
      // Update existing tab
      this.connectedTabs.set(tabId, { ...existingTab, ...tabInfo });
    }
  }

  /**
   * Handle tab disconnect messages
   */
  private handleTabDisconnect(message: CrossTabMessage): void {
    const { tabId } = message;
    
    if (this.connectedTabs.has(tabId)) {
      this.connectedTabs.delete(tabId);
      this.options.onTabDisconnect(tabId);
      this.log('Tab disconnected:', tabId);
    }
  }

  /**
   * Handle state synchronization messages
   */
  private handleStateSync(message: CrossTabMessage): void {
    const { key, value } = message.data;
    
    this.sharedState.set(key, value);
    this.log('State synced:', key, value);
  }

  /**
   * Handle state request messages
   */
  private handleStateRequest(message: CrossTabMessage): void {
    const { tabId } = message;
    
    // Send current state to requesting tab
    if (this.sharedState.size > 0) {
      this.sendToTab(tabId, 'state-sync-bulk', {
        state: this.getAllSharedState(),
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle bulk state synchronization
   */
  private handleStateSyncBulk(message: CrossTabMessage): void {
    const { state } = message.data;
    
    // Merge received state with local state
    Object.entries(state).forEach(([key, value]) => {
      this.sharedState.set(key, value);
    });
    
    this.log('Bulk state synced:', Object.keys(state));
  }

  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.options.heartbeatInterval);
  }

  /**
   * Start cleanup interval for disconnected tabs
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupDisconnectedTabs();
    }, this.options.tabTimeout);
  }

  /**
   * Send heartbeat to other tabs
   */
  private async sendHeartbeat(): Promise<void> {
    try {
      await this.broadcast('tab-heartbeat', {
        tabId: this.tabId,
        timestamp: Date.now(),
        metadata: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          title: document.title,
        },
      });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Announce this tab's presence
   */
  private async announcePresence(): Promise<void> {
    await this.sendHeartbeat();
  }

  /**
   * Announce this tab's disconnect
   */
  private async announceDisconnect(): Promise<void> {
    try {
      await this.broadcast('tab-disconnect', {
        tabId: this.tabId,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Request current state from other tabs
   */
  private async requestState(): Promise<void> {
    try {
      await this.broadcast('state-request', {
        tabId: this.tabId,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Clean up disconnected tabs
   */
  private cleanupDisconnectedTabs(): void {
    const now = Date.now();
    const timeout = this.options.tabTimeout;
    
    for (const [tabId, tabInfo] of this.connectedTabs) {
      if (now - tabInfo.lastSeen > timeout) {
        this.connectedTabs.delete(tabId);
        this.options.onTabDisconnect(tabId);
        this.log('Tab timed out:', tabId);
      }
    }
  }

  /**
   * Generate unique tab ID
   */
  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current user ID (implement based on your auth system)
   */
  private getCurrentUserId(): string | undefined {
    // This should be implemented based on your authentication system
    // For now, return undefined
    return undefined;
  }

  /**
   * Get session ID
   */
  private getSessionId(): string {
    // Generate or retrieve session ID
    let sessionId = sessionStorage.getItem('cross-tab-session-id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('cross-tab-session-id', sessionId);
    }
    return sessionId;
  }

  /**
   * Handle errors with retry logic
   */
  private handleError(error: Error): void {
    this.log('Error:', error.message);
    this.options.onError(error);
    
    // Retry initialization if not at max retries
    if (!this.isInitialized && this.retryCount < this.options.maxRetries) {
      this.retryCount++;
      setTimeout(() => {
        this.initialize().catch(() => {
          // Ignore retry errors
        });
      }, 1000 * this.retryCount); // Exponential backoff
    }
  }

  /**
   * Log debug messages if logging is enabled
   */
  private log(...args: any[]): void {
    if (this.options.enableLogging) {
      console.log(`[CrossTabSync:${this.tabId}]`, ...args);
    }
  }
}

/**
 * Create a cross-tab sync manager instance
 */
export function createCrossTabSync(options: CrossTabSyncOptions): CrossTabSyncManager {
  return new CrossTabSyncManager(options);
}

/**
 * Utility function to sync setlist changes across tabs
 */
export async function syncSetlistAcrossTabs(
  setlistId: string,
  change: any,
  options?: Partial<CrossTabSyncOptions>
): Promise<void> {
  if (!CrossTabSyncManager.isSupported()) {
    console.warn('Cross-tab sync not supported');
    return;
  }

  const syncManager = createCrossTabSync({
    channelName: `setlist-sync-${setlistId}`,
    enableLogging: process.env.NODE_ENV === 'development',
    ...options,
  });

  try {
    await syncManager.initialize();
    await syncManager.broadcast('setlist-change', change);
  } catch (error) {
    console.error('Failed to sync setlist across tabs:', error);
  } finally {
    await syncManager.destroy();
  }
}

/**
 * Utility function to sync user presence across tabs
 */
export async function syncPresenceAcrossTabs(
  userId: string,
  presence: any,
  options?: Partial<CrossTabSyncOptions>
): Promise<void> {
  if (!CrossTabSyncManager.isSupported()) {
    console.warn('Cross-tab sync not supported');
    return;
  }

  const syncManager = createCrossTabSync({
    channelName: `presence-sync-${userId}`,
    enableLogging: process.env.NODE_ENV === 'development',
    ...options,
  });

  try {
    await syncManager.initialize();
    await syncManager.broadcast('presence-update', presence);
  } catch (error) {
    console.error('Failed to sync presence across tabs:', error);
  } finally {
    await syncManager.destroy();
  }
}

/**
 * Utility function to handle page visibility changes for cross-tab sync
 */
export function handleVisibilityChange(
  syncManager: CrossTabSyncManager,
  onVisible?: () => void,
  onHidden?: () => void
): () => void {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      onVisible?.();
      // Reinitialize if needed
      if (!syncManager['isInitialized']) {
        syncManager.initialize().catch(console.error);
      }
    } else {
      onHidden?.();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

/**
 * Utility function to handle beforeunload for graceful disconnect
 */
export function handleBeforeUnload(syncManager: CrossTabSyncManager): () => void {
  const handleBeforeUnload = () => {
    syncManager.destroy().catch(console.error);
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  // Return cleanup function
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}
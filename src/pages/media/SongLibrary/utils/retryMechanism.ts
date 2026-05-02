/**
 * Retry Mechanism Utilities
 * 
 * Provides retry strategies for failed operations with exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  shouldRetry: (error: Error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch') ||
      message.includes('5')
    );
  },
  onRetry: () => {},
};

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt);
  return Math.min(delay, options.maxDelay);
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      if (attempt < opts.maxRetries && opts.shouldRetry(lastError, attempt)) {
        // Calculate delay
        const delay = calculateDelay(attempt, opts);

        // Call retry callback
        opts.onRetry(lastError, attempt + 1);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Max retries reached or shouldn't retry
        throw lastError;
      }
    }
  }

  throw lastError!;
}

/**
 * Retry a fetch request with exponential backoff
 */
export async function retryFetch(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(
    async () => {
      const response = await fetch(url, init);
      
      // Throw error for non-ok responses
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    },
    {
      ...options,
      shouldRetry: (error, attempt) => {
        // Retry on network errors and 5xx server errors
        const message = error.message.toLowerCase();
        const is5xx = message.includes('5');
        const isNetworkError = 
          message.includes('network') ||
          message.includes('timeout') ||
          message.includes('fetch');
        
        return (is5xx || isNetworkError) && attempt < (options?.maxRetries || 3);
      },
    }
  );
}

/**
 * Retry a Supabase query with exponential backoff
 */
export async function retrySupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options?: RetryOptions
): Promise<T> {
  return retryWithBackoff(
    async () => {
      const { data, error } = await queryFn();
      
      if (error) {
        throw new Error(error.message || 'Supabase query failed');
      }
      
      if (data === null) {
        throw new Error('No data returned from query');
      }
      
      return data;
    },
    options
  );
}

/**
 * Create a retry wrapper for a function
 */
export function createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: RetryOptions
): T {
  return ((...args: Parameters<T>) => {
    return retryWithBackoff(() => fn(...args), options);
  }) as T;
}

/**
 * Offline queue for operations that fail due to network issues
 */
export class OfflineQueue {
  private queue: Array<{
    id: string;
    operation: () => Promise<any>;
    timestamp: number;
    retries: number;
  }> = [];
  
  private isProcessing = false;
  private maxQueueSize = 100;
  private maxRetries = 3;

  constructor() {
    // Listen for online event to process queue
    window.addEventListener('online', () => this.processQueue());
  }

  /**
   * Add operation to queue
   */
  add(operation: () => Promise<any>): string {
    const id = `${Date.now()}-${Math.random()}`;
    
    // Remove oldest item if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift();
    }
    
    this.queue.push({
      id,
      operation,
      timestamp: Date.now(),
      retries: 0,
    });
    
    // Try to process immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }
    
    return id;
  }

  /**
   * Process queued operations
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const item = this.queue[0];
      
      try {
        await item.operation();
        // Success - remove from queue
        this.queue.shift();
      } catch (error) {
        // Failed - increment retries
        item.retries++;
        
        if (item.retries >= this.maxRetries) {
          // Max retries reached - remove from queue
          console.error('Max retries reached for queued operation:', error);
          this.queue.shift();
        } else {
          // Move to end of queue for retry
          this.queue.push(this.queue.shift()!);
        }
        
        // Stop processing if offline
        if (!navigator.onLine) {
          break;
        }
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
  }
}

// Global offline queue instance
export const offlineQueue = new OfflineQueue();

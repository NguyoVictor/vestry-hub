/**
 * Song Library Error Boundary
 * 
 * Comprehensive error boundary for the Song Library with:
 * - Network error handling
 * - Data validation error handling
 * - Performance error handling
 * - Collaboration conflict handling
 * - Accessibility error handling
 * - Retry mechanisms
 * - Offline support
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: 'network' | 'validation' | 'performance' | 'collaboration' | 'accessibility' | 'unknown';
  retryCount: number;
  isOffline: boolean;
}

export class SongLibraryErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown',
      retryCount: 0,
      isOffline: !navigator.onLine,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Classify error type
    const errorType = SongLibraryErrorBoundary.classifyError(error);
    
    return {
      hasError: true,
      error,
      errorType,
    };
  }

  static classifyError(error: Error): State['errorType'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'network';
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('parse')) {
      return 'validation';
    }
    
    if (message.includes('memory') || message.includes('performance') || message.includes('timeout')) {
      return 'performance';
    }
    
    if (message.includes('conflict') || message.includes('lock') || message.includes('concurrent')) {
      return 'collaboration';
    }
    
    if (message.includes('accessibility') || message.includes('aria') || message.includes('focus')) {
      return 'accessibility';
    }
    
    return 'unknown';
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Song Library Error:', error);
      console.error('Error Info:', errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Log to monitoring service (Sentry, etc.)
    // logErrorToService(error, errorInfo);
  }

  componentDidMount() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  handleOnline = () => {
    this.setState({ isOffline: false });
    
    // Auto-retry if error was network-related
    if (this.state.hasError && this.state.errorType === 'network') {
      this.handleRetry();
    }
  };

  handleOffline = () => {
    this.setState({ isOffline: true });
  };

  handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
      });
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown',
      retryCount: 0,
    });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  getErrorMessage(): { title: string; description: string; canRetry: boolean } {
    const { errorType, isOffline } = this.state;

    if (isOffline) {
      return {
        title: 'You\'re Offline',
        description: 'Please check your internet connection and try again.',
        canRetry: true,
      };
    }

    switch (errorType) {
      case 'network':
        return {
          title: 'Network Error',
          description: 'Unable to connect to the server. Please check your connection and try again.',
          canRetry: true,
        };
      
      case 'validation':
        return {
          title: 'Data Validation Error',
          description: 'There was an issue with the song data. Please refresh the page or contact support.',
          canRetry: true,
        };
      
      case 'performance':
        return {
          title: 'Performance Issue',
          description: 'The application is running slowly. Try refreshing the page or reducing the number of songs displayed.',
          canRetry: true,
        };
      
      case 'collaboration':
        return {
          title: 'Collaboration Conflict',
          description: 'There was a conflict with another user\'s changes. Please refresh to see the latest version.',
          canRetry: true,
        };
      
      case 'accessibility':
        return {
          title: 'Accessibility Error',
          description: 'There was an issue with accessibility features. Please refresh the page.',
          canRetry: true,
        };
      
      default:
        return {
          title: 'Something Went Wrong',
          description: 'An unexpected error occurred. Please try refreshing the page.',
          canRetry: true,
        };
    }
  }

  render() {
    const { hasError, retryCount, isOffline } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const { title, description, canRetry } = this.getErrorMessage();
      const canRetryAgain = retryCount < this.maxRetries;

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full"
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
              {/* Error Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6"
              >
                {isOffline ? (
                  <WifiOff className="h-8 w-8 text-red-600 dark:text-red-400" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                )}
              </motion.div>

              {/* Error Title */}
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                {title}
              </h2>

              {/* Error Description */}
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                {description}
              </p>

              {/* Retry Count */}
              {retryCount > 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Retry attempt {retryCount} of {this.maxRetries}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                {canRetry && canRetryAgain && (
                  <Button
                    onClick={this.handleRetry}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}

                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="ghost"
                  className="w-full"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    Error Details (Dev Only)
                  </summary>
                  <pre className="mt-2 text-xs bg-slate-100 dark:bg-slate-900 p-3 rounded overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo && (
                      <>
                        {'\n\n'}
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </details>
              )}
            </div>
          </motion.div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook for using error boundary programmatically
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}

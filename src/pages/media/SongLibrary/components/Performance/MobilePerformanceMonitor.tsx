/**
 * Mobile Performance Monitor for Song Library
 * 
 * Monitors and optimizes performance on mobile devices:
 * - Memory usage tracking
 * - Frame rate monitoring
 * - Network condition detection
 * - Battery level awareness
 * - Automatic performance adjustments
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Battery, 
  Wifi, 
  WifiOff, 
  Zap, 
  AlertTriangle,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useResponsive, useNetworkSpeed } from '../../utils/mobileUtils';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  batteryLevel: number;
  isCharging: boolean;
  connectionType: string;
  connectionSpeed: 'slow' | 'fast';
  renderTime: number;
  componentCount: number;
}

interface PerformanceSettings {
  enableAnimations: boolean;
  enableVirtualScrolling: boolean;
  enableLazyLoading: boolean;
  imageQuality: 'low' | 'medium' | 'high';
  maxConcurrentImages: number;
}

interface MobilePerformanceMonitorProps {
  enabled?: boolean;
  autoOptimize?: boolean;
  onSettingsChange?: (settings: PerformanceSettings) => void;
  className?: string;
}

export function MobilePerformanceMonitor({
  enabled = true,
  autoOptimize = true,
  onSettingsChange,
  className = ''
}: MobilePerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    batteryLevel: 100,
    isCharging: false,
    connectionType: 'unknown',
    connectionSpeed: 'fast',
    renderTime: 0,
    componentCount: 0
  });

  const [settings, setSettings] = useState<PerformanceSettings>({
    enableAnimations: true,
    enableVirtualScrolling: true,
    enableLazyLoading: true,
    imageQuality: 'medium',
    maxConcurrentImages: 10
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [performanceIssues, setPerformanceIssues] = useState<string[]>([]);

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animationFrameRef = useRef<number>();

  const responsive = useResponsive();
  const connectionSpeed = useNetworkSpeed();

  // FPS monitoring
  const measureFPS = useCallback(() => {
    const now = performance.now();
    frameCountRef.current++;

    if (now - lastTimeRef.current >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current));
      
      setMetrics(prev => ({ ...prev, fps }));
      
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }

    if (enabled) {
      animationFrameRef.current = requestAnimationFrame(measureFPS);
    }
  }, [enabled]);

  // Memory usage monitoring
  const measureMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      setMetrics(prev => ({ ...prev, memoryUsage: usedMB }));
    }
  }, []);

  // Battery monitoring
  const monitorBattery = useCallback(async () => {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        
        const updateBatteryInfo = () => {
          setMetrics(prev => ({
            ...prev,
            batteryLevel: Math.round(battery.level * 100),
            isCharging: battery.charging
          }));
        };

        updateBatteryInfo();
        
        battery.addEventListener('chargingchange', updateBatteryInfo);
        battery.addEventListener('levelchange', updateBatteryInfo);
        
        return () => {
          battery.removeEventListener('chargingchange', updateBatteryInfo);
          battery.removeEventListener('levelchange', updateBatteryInfo);
        };
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }
  }, []);

  // Network monitoring
  const monitorNetwork = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnectionInfo = () => {
        setMetrics(prev => ({
          ...prev,
          connectionType: connection.effectiveType || 'unknown',
          connectionSpeed: connectionSpeed
        }));
      };

      updateConnectionInfo();
      connection.addEventListener('change', updateConnectionInfo);
      
      return () => {
        connection.removeEventListener('change', updateConnectionInfo);
      };
    }
  }, [connectionSpeed]);

  // Performance issue detection
  const detectPerformanceIssues = useCallback(() => {
    const issues: string[] = [];

    if (metrics.fps < 30) {
      issues.push('Low frame rate detected');
    }

    if (metrics.memoryUsage > 100) {
      issues.push('High memory usage');
    }

    if (metrics.batteryLevel < 20 && !metrics.isCharging) {
      issues.push('Low battery level');
    }

    if (metrics.connectionSpeed === 'slow') {
      issues.push('Slow network connection');
    }

    setPerformanceIssues(issues);
  }, [metrics]);

  // Auto-optimization based on performance
  const autoOptimizeSettings = useCallback(() => {
    if (!autoOptimize) return;

    setSettings(prevSettings => {
      const newSettings = { ...prevSettings };
      let changed = false;

      // Disable animations on low-end devices or low battery
      if (metrics.fps < 30 || (metrics.batteryLevel < 20 && !metrics.isCharging)) {
        if (newSettings.enableAnimations) {
          newSettings.enableAnimations = false;
          changed = true;
        }
      }

      // Reduce image quality on slow connections or low battery
      if (metrics.connectionSpeed === 'slow' || (metrics.batteryLevel < 30 && !metrics.isCharging)) {
        if (newSettings.imageQuality !== 'low') {
          newSettings.imageQuality = 'low';
          newSettings.maxConcurrentImages = 5;
          changed = true;
        }
      }

      // Enable virtual scrolling for better performance
      if (metrics.memoryUsage > 80 && !newSettings.enableVirtualScrolling) {
        newSettings.enableVirtualScrolling = true;
        changed = true;
      }

      if (changed) {
        onSettingsChange?.(newSettings);
        return newSettings;
      }
      
      return prevSettings;
    });
  }, [autoOptimize, metrics, onSettingsChange]);

  // Initialize monitoring
  useEffect(() => {
    if (!enabled || !responsive.isMobile) return;

    measureFPS();
    const memoryInterval = setInterval(measureMemoryUsage, 2000);
    
    monitorBattery();
    monitorNetwork();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      clearInterval(memoryInterval);
    };
  }, [enabled, responsive.isMobile, measureFPS, measureMemoryUsage, monitorBattery, monitorNetwork]);

  // Run performance detection and optimization
  useEffect(() => {
    detectPerformanceIssues();
    autoOptimizeSettings();
  }, [metrics, detectPerformanceIssues, autoOptimizeSettings]);

  // Don't render on desktop or when disabled
  if (!enabled || !responsive.isMobile) {
    return null;
  }

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-500';
    if (value >= thresholds.warning) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getBatteryColor = (level: number, isCharging: boolean) => {
    if (isCharging) return 'text-green-500';
    if (level > 50) return 'text-green-500';
    if (level > 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <AnimatePresence>
        {performanceIssues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mb-2 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 max-w-xs"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Performance Issues
                </p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                  {performanceIssues.map((issue, index) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        layout
        className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        {/* Compact View */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-3 justify-between"
        >
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">Performance</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`text-xs ${getPerformanceColor(metrics.fps, { good: 50, warning: 30 })}`}
            >
              {metrics.fps} FPS
            </Badge>
            
            <Battery 
              className={`h-4 w-4 ${getBatteryColor(metrics.batteryLevel, metrics.isCharging)}`}
            />
            
            {metrics.connectionSpeed === 'slow' ? (
              <WifiOff className="h-4 w-4 text-red-500" />
            ) : (
              <Wifi className="h-4 w-4 text-green-500" />
            )}
          </div>
        </Button>

        {/* Expanded View */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-slate-200 dark:border-slate-700"
            >
              <div className="p-4 space-y-3">
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">FPS</span>
                      <span className={getPerformanceColor(metrics.fps, { good: 50, warning: 30 })}>
                        {metrics.fps}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Memory</span>
                      <span className={getPerformanceColor(100 - metrics.memoryUsage, { good: 50, warning: 20 })}>
                        {metrics.memoryUsage}MB
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Battery</span>
                      <span className={getBatteryColor(metrics.batteryLevel, metrics.isCharging)}>
                        {metrics.batteryLevel}%
                        {metrics.isCharging && <Zap className="inline h-3 w-3 ml-1" />}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Network</span>
                      <span className={metrics.connectionSpeed === 'fast' ? 'text-green-500' : 'text-red-500'}>
                        {metrics.connectionType}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Settings */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Animations</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newSettings = { ...settings, enableAnimations: !settings.enableAnimations };
                        setSettings(newSettings);
                        onSettingsChange?.(newSettings);
                      }}
                      className={`h-6 px-2 text-xs ${settings.enableAnimations ? 'bg-green-100 text-green-700' : ''}`}
                    >
                      {settings.enableAnimations ? 'On' : 'Off'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Image Quality</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const qualities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
                        const currentIndex = qualities.indexOf(settings.imageQuality);
                        const nextQuality = qualities[(currentIndex + 1) % qualities.length];
                        const newSettings = { ...settings, imageQuality: nextQuality };
                        setSettings(newSettings);
                        onSettingsChange?.(newSettings);
                      }}
                      className="h-6 px-2 text-xs capitalize"
                    >
                      {settings.imageQuality}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default MobilePerformanceMonitor;
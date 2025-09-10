/**
 * Performance monitoring hook for tracking metrics
 */

import { useEffect, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiResponseTime: number;
  memoryUsage?: number;
  errorCount: number;
}

interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  entryType: string;
}

export function usePerformanceMonitor(componentName: string) {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({
    errorCount: 0
  });
  const [startTime] = useState(() => performance.now());

  // Track component mount and unmount times
  useEffect(() => {
    const mountTime = performance.now() - startTime;
    
    setMetrics(prev => ({
      ...prev,
      loadTime: mountTime
    }));

    logger.info(`Component ${componentName} mounted`, {
      loadTime: mountTime,
      timestamp: new Date().toISOString()
    });

    return () => {
      const totalTime = performance.now() - startTime;
      logger.info(`Component ${componentName} unmounted`, {
        totalTime,
        timestamp: new Date().toISOString()
      });
    };
  }, [componentName, startTime]);

  // Track performance entries
  useEffect(() => {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          setMetrics(prev => ({
            ...prev,
            renderTime: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart
          }));
        }

        if (entry.entryType === 'measure') {
          logger.debug('Performance measure', {
            name: entry.name,
            duration: entry.duration,
            component: componentName
          });
        }
      });
    });

    observer.observe({ entryTypes: ['navigation', 'measure'] });

    return () => observer.disconnect();
  }, [componentName]);

  // Track memory usage (if available)
  useEffect(() => {
    if (typeof window === 'undefined' || !('memory' in performance)) return;

    const memoryInfo = (performance as any).memory;
    if (memoryInfo) {
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memoryInfo.usedJSHeapSize
      }));
    }
  }, []);

  // Method to track API response times
  const trackApiCall = useCallback((apiName: string, startTime: number) => {
    const duration = performance.now() - startTime;
    
    setMetrics(prev => ({
      ...prev,
      apiResponseTime: duration
    }));

    logger.info('API call completed', {
      apiName,
      duration,
      component: componentName
    });

    // Log slow API calls
    if (duration > 2000) {
      logger.warn('Slow API call detected', {
        apiName,
        duration,
        component: componentName
      });
    }

    return duration;
  }, [componentName]);

  // Method to track errors
  const trackError = useCallback((error: Error, context?: string) => {
    setMetrics(prev => ({
      ...prev,
      errorCount: (prev.errorCount || 0) + 1
    }));

    logger.error('Component error tracked', {
      error: error.message,
      context,
      component: componentName,
      stack: error.stack
    });
  }, [componentName]);

  // Method to measure performance of functions
  const measureFunction = useCallback(<T extends any[], R>(
    functionName: string,
    fn: (...args: T) => R
  ) => {
    return (...args: T): R => {
      const start = performance.now();
      const result = fn(...args);
      const duration = performance.now() - start;

      logger.debug('Function performance', {
        functionName,
        duration,
        component: componentName
      });

      return result;
    };
  }, [componentName]);

  // Method to track user interactions
  const trackInteraction = useCallback((interactionName: string) => {
    const timestamp = performance.now();
    
    logger.info('User interaction', {
      interactionName,
      timestamp,
      component: componentName
    });

    return timestamp;
  }, [componentName]);

  return {
    metrics,
    trackApiCall,
    trackError,
    measureFunction,
    trackInteraction
  };
}

// Utility to create performance marks
export function createPerformanceMark(name: string) {
  if (typeof window !== 'undefined' && 'performance' in window) {
    performance.mark(name);
  }
}

// Utility to measure between two marks
export function measurePerformance(measureName: string, startMark: string, endMark: string) {
  if (typeof window !== 'undefined' && 'performance' in window) {
    try {
      performance.measure(measureName, startMark, endMark);
    } catch (error) {
      logger.warn('Performance measurement failed', { measureName, startMark, endMark, error });
    }
  }
}
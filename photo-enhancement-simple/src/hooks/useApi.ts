/**
 * Generic API hook with caching and error handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface ApiOptions {
  immediate?: boolean;
  cache?: boolean;
  retries?: number;
  retryDelay?: number;
}

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useApi<T>(
  url: string,
  options: ApiOptions = {}
) {
  const {
    immediate = true,
    cache: useCache = true,
    retries = 0,
    retryDelay = 1000
  } = options;

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (retryCount = 0) => {
    // Check cache first
    if (useCache) {
      const cached = cache.get(url);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setState({
          data: cached.data as T,
          loading: false,
          error: null
        });
        return;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!mountedRef.current) return;

      // Cache the result
      if (useCache) {
        cache.set(url, { data, timestamp: Date.now() });
      }

      setState({
        data,
        loading: false,
        error: null
      });
    } catch (error) {
      if (!mountedRef.current) return;

      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request was cancelled
      }

      // Retry logic
      if (retryCount < retries) {
        setTimeout(() => {
          if (mountedRef.current) {
            fetchData(retryCount + 1);
          }
        }, retryDelay * Math.pow(2, retryCount)); // Exponential backoff
        return;
      }

      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      });
    }
  }, [url, useCache, retries, retryDelay]);

  const refresh = useCallback(() => {
    // Clear cache for this URL
    if (useCache) {
      cache.delete(url);
    }
    fetchData();
  }, [fetchData, url, useCache]);

  const mutate = useCallback((newData: T) => {
    setState(prev => ({ ...prev, data: newData }));
    
    // Update cache
    if (useCache) {
      cache.set(url, { data: newData, timestamp: Date.now() });
    }
  }, [url, useCache]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, immediate]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    ...state,
    refetch: fetchData,
    refresh,
    mutate
  };
}
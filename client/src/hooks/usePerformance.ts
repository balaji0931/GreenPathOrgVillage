import React, { useCallback, useRef, useEffect } from 'react';

// Performance monitoring hook
export const usePerformance = () => {
  const performanceMetrics = useRef<Map<string, number>>(new Map());

  const startMeasure = useCallback((name: string) => {
    performanceMetrics.current.set(name, performance.now());
  }, []);

  const endMeasure = useCallback((name: string) => {
    const startTime = performanceMetrics.current.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      performanceMetrics.current.delete(name);
      
      // Log in development
      if (import.meta.env.DEV) {
        console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
      }

      // Send to analytics in production
      if (import.meta.env.PROD && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.active?.postMessage({
            type: 'PERFORMANCE_METRIC',
            name,
            duration,
            timestamp: Date.now()
          });
        });
      }

      return duration;
    }
    return 0;
  }, []);

  return { startMeasure, endMeasure };
};

// Image lazy loading hook
export const useLazyImage = (src: string, placeholder?: string) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver>();

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // Intersection Observer for lazy loading
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const image = entry.target as HTMLImageElement;
            image.src = src;
            image.onload = () => {
              image.classList.add('loaded');
            };
            observerRef.current?.unobserve(image);
          }
        });
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(img);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src]);

  return { imgRef, placeholder: placeholder || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciPjxzdG9wIHN0b3AtY29sb3I9IiNlZWUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNkZGQiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+' };
};

// Debounce hook for performance optimization
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Throttle hook for performance optimization
export const useThrottle = <T extends any[]>(
  callback: (...args: T) => void,
  delay: number
) => {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: T) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      callback(...args);
      lastCall.current = now;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
        lastCall.current = Date.now();
      }, delay - (now - lastCall.current));
    }
  }, [callback, delay]);
};

// Virtual scrolling hook for large lists
export const useVirtualScroll = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = React.useState(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length - 1
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex
  };
};

// Network status hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
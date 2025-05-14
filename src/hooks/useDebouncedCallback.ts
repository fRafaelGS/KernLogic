import { useRef, useCallback } from 'react';

/**
 * A hook that returns a debounced version of the callback function.
 * 
 * @param callback Function to be debounced
 * @param delay Delay in milliseconds before executing the callback
 * @returns Debounced version of the callback function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
} 
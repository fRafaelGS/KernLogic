import { useState, useEffect } from "react";

/**
 * useDebounce
 * Returns `value` after it stops changing for `delay` ms.
 * Handy for search inputs, auto-save, etc.
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
  
      return () => {
        clearTimeout(timer);
      };
    }, [value, delay]);
  
    return debouncedValue;
  }
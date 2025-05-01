import { useEffect, useMemo } from 'react';
import { debounce } from 'lodash';

/**
 * A hook to create a debounced callback that is properly cleaned up
 * when component unmounts
 * 
 * @param fn Function to debounce
 * @param ms Debounce time in milliseconds
 * @returns Debounced function
 */
export const useDebouncedCallback = <F extends (...args: any[]) => any>(fn: F, ms = 800) => {
  const debounced = useMemo(() => debounce(fn, ms), [fn, ms]);
  
  // Clean up the debounce on unmount
  useEffect(() => () => debounced.cancel(), [debounced]);
  
  return debounced;
}; 
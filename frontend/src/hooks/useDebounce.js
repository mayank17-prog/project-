import { useState, useEffect } from 'react';

/**
 * Custom Hook: useDebounce
 *
 * WHAT IT DOES:
 * Delays updating the returned value until a specified delay (in milliseconds)
 * has passed since the last time the input value changed.
 *
 * WHY WE USE IT:
 * Without debounce, typing "react" triggers 5 separate network requests (r, re, rea, reac, react).
 * With debounce, we wait until the user pauses typing (e.g. 400ms), sending only 1 network request!
 *
 * HOW IT WORKS (STEP-BY-STEP):
 * 1. User types a letter -> value changes -> useEffect runs.
 * 2. setTimeout is scheduled to update debouncedValue after `delay` ms.
 * 3. If the user types another letter BEFORE `delay` expires, React runs the
 *    cleanup function (return () => clearTimeout(timer)) first!
 * 4. This cancels the previous timer before it can fire.
 * 5. A fresh timer is started for the new value.
 *
 * @param {*} value - The input value to debounce (e.g., search text)
 * @param {number} delay - Delay in milliseconds (default 400ms)
 * @returns {*} The debounced value
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Schedule an update after delay milliseconds
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // CLEANUP FUNCTION:
    // This executes every time `value` or `delay` changes, OR when component unmounts.
    // It clears the scheduled timer, effectively resetting the countdown!
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;

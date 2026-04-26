import { useState, useEffect, useCallback, useRef } from "react";

export interface UseDebounceOptions {
  delay?: number;
  leading?: boolean;
}

export function useDebounce<T>(
  value: T,
  delay?: number,
  options?: UseDebounceOptions
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const leading = options?.leading ?? false;
  
  useEffect(() => {
    if (leading) {
      setDebouncedValue(value);
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay ?? 300);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, leading]);

  return debouncedValue;
}

export interface UseDebounceCallbackOptions<T extends unknown[]> {
  delay?: number;
  leading?: boolean;
}

export function useDebouncedCallback<T extends unknown[]>(
  callback: (...args: T) => void,
  delay?: number,
  options?: UseDebounceCallbackOptions<T>
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leading = options?.leading ?? false;

  const debouncedCallback = useCallback(
    (...args: T) => {
      const invoke = () => {
        callback(...args);
      };

      if (leading && !timeoutRef.current) {
        invoke();
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(invoke, delay ?? 300);
    },
    [callback, delay, leading]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}
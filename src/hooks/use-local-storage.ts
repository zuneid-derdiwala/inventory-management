"use client";

import { useState, useEffect } from "react";

type InitialValue<T> = T | (() => T);

export function useLocalStorage<T>(key: string, initialValue: InitialValue<T>): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue instanceof Function ? initialValue() : initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : (initialValue instanceof Function ? initialValue() : initialValue);
    } catch (error) {
      console.error(`Error reading from local storage for key "${key}":`, error);
      return initialValue instanceof Function ? initialValue() : initialValue;
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error writing to local storage for key "${key}":`, error);
      }
    }
  }, [key, value]);

  return [value, setValue];
}
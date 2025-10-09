"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Get theme from localStorage or default to system
    const savedTheme = localStorage.getItem('theme') as Theme || 'system';
    setTheme(savedTheme);
    
    // Apply theme immediately
    applyTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Save theme to localStorage
    localStorage.setItem('theme', theme);
    
    // Apply theme
    applyTheme(theme);
  }, [theme, mounted]);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    let actualTheme: 'light' | 'dark';
    
    if (newTheme === 'system') {
      // Use system preference
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      actualTheme = newTheme;
    }
    
    // Apply the actual theme
    root.classList.add(actualTheme);
    setResolvedTheme(actualTheme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', actualTheme === 'dark' ? '#1a1a1a' : '#ffffff');
    }
  };

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

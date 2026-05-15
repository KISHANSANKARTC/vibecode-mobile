import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app-theme-preference');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeState(savedTheme);
        } else if (systemColorScheme) {
          setThemeState(systemColorScheme as Theme);
        }
      } catch (error) {
        console.log('Error loading theme:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadTheme();
  }, [systemColorScheme]);

  // Memoize setTheme to prevent re-renders in consumers
  const setTheme = useCallback(async (newTheme: Theme) => {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem('app-theme-preference', newTheme);
      console.log(`Theme switched to: ${newTheme}`);
    } catch (error) {
      const err = error as any;
      const errorMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'An error occurred';
      console.error('Error saving theme:', errorMsg);
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<ThemeContextType>(() => ({
    theme,
    setTheme,
    isDark: theme === 'dark',
  }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

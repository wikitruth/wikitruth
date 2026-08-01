import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'wt-theme';
const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

const readStoredTheme = (): Theme | null => {
  if (typeof window === 'undefined') return null;

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null;
  } catch {
    return null;
  }
};

const readSystemTheme = (): Theme => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';

  try {
    return window.matchMedia(DARK_MODE_QUERY).matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

export const resolveInitialTheme = (): Theme => readStoredTheme() || readSystemTheme();

export const applyThemeToDocument = (theme: Theme = resolveInitialTheme()) => {
  if (typeof document === 'undefined') return;

  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
};

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);
  const [followsSystemTheme, setFollowsSystemTheme] = useState(() => readStoredTheme() === null);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    if (!followsSystemTheme || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(DARK_MODE_QUERY);
    const handleSystemThemeChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setTheme(event.matches ? 'dark' : 'light');
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }

    mediaQuery.addListener(handleSystemThemeChange);
    return () => mediaQuery.removeListener(handleSystemThemeChange);
  }, [followsSystemTheme]);

  const toggleTheme = useCallback(() => {
    setFollowsSystemTheme(false);
    setTheme((previousTheme) => {
      const nextTheme = previousTheme === 'light' ? 'dark' : 'light';
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // The visual preference still works when storage is unavailable.
      }
      return nextTheme;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
    }),
    [theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
};

export default ThemeContext;

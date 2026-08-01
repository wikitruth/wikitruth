import React from 'react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';
import { act, render, screen, waitFor } from '../test-utils/render';

const TestComponent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <>
      <p>{theme}</p>
      <button type="button" onClick={toggleTheme}>
        Toggle
      </button>
    </>
  );
};

describe('ThemeContext', () => {
  let systemDarkMode = false;
  let systemThemeListeners: Set<(event: MediaQueryListEvent) => void>;

  beforeEach(() => {
    systemDarkMode = false;
    systemThemeListeners = new Set();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' && systemDarkMode,
        media: query,
        onchange: null,
        addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
          systemThemeListeners.add(listener);
        },
        removeEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
          systemThemeListeners.delete(listener);
        },
        addListener: (listener: (event: MediaQueryListEvent) => void) => systemThemeListeners.add(listener),
        removeListener: (listener: (event: MediaQueryListEvent) => void) => systemThemeListeners.delete(listener),
        dispatchEvent: () => true,
      })),
    });
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('color-scheme');
  });

  const changeSystemTheme = (matches: boolean) => {
    systemDarkMode = matches;
    act(() => {
      systemThemeListeners.forEach((listener) => listener({ matches } as MediaQueryListEvent));
    });
  };

  it('toggles theme state', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByText('light')).toBeInTheDocument();
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    });

    await user.click(screen.getByRole('button', { name: /toggle/i }));

    expect(screen.getByText('dark')).toBeInTheDocument();
    expect(window.localStorage.getItem('wt-theme')).toBe('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement).toHaveStyle({ colorScheme: 'dark' });
  });

  it('initializes theme from localStorage', async () => {
    window.localStorage.setItem('wt-theme', 'dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByText('dark')).toBeInTheDocument();
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
  });

  it('follows the device preference until the user chooses a theme', async () => {
    systemDarkMode = true;

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByText('dark')).toBeInTheDocument();
    expect(window.localStorage.getItem('wt-theme')).toBeNull();

    changeSystemTheme(false);
    expect(screen.getByText('light')).toBeInTheDocument();
  });

  it('stops following the device after the user chooses a theme', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await user.click(screen.getByRole('button', { name: /toggle/i }));
    expect(screen.getByText('dark')).toBeInTheDocument();

    await waitFor(() => expect(systemThemeListeners.size).toBe(0));
    changeSystemTheme(false);
    expect(screen.getByText('dark')).toBeInTheDocument();
  });
});

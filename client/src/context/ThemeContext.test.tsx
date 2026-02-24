import React from 'react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';
import { render, screen, waitFor } from '../test-utils/render';

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
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

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
});

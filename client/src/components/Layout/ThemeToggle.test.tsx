import React from 'react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../context/ThemeContext';
import { render, screen } from '../../test-utils/render';
import ThemeToggle from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    });
  });

  it('announces and persists the destination theme', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeToggle focused />
      </ThemeProvider>
    );

    const toggle = screen.getByRole('button', { name: 'Switch to dark mode' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveClass('wt-theme-toggle-focused');

    await user.click(toggle);

    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('wt-theme')).toBe('dark');
  });
});

import React from 'react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';
import { render, screen } from '../test-utils/render';

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
  it('toggles theme state', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByText('light')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /toggle/i }));

    expect(screen.getByText('dark')).toBeInTheDocument();
  });
});

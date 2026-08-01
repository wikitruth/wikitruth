import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  focused?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ focused = false }) => {
  const { theme, toggleTheme } = useTheme();
  const darkModeActive = theme === 'dark';
  const destination = darkModeActive ? 'light' : 'dark';

  return (
    <button
      type="button"
      className={`wt-theme-toggle${focused ? ' wt-theme-toggle-focused' : ''}`}
      aria-label={`Switch to ${destination} mode`}
      aria-pressed={darkModeActive}
      title={`Switch to ${destination} mode`}
      onClick={toggleTheme}
    >
      <i className={`fa ${darkModeActive ? 'fa-sun-o' : 'fa-moon-o'}`} aria-hidden="true"></i>
      <span className="wt-theme-toggle-label">{darkModeActive ? 'Light' : 'Dark'}</span>
    </button>
  );
};

export default ThemeToggle;

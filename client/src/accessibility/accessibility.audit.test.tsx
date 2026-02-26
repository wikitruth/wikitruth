import React from 'react';
import { axe } from 'jest-axe';
import Header from '../components/Layout/Header';
import SocialLoginButtons from '../components/Auth/SocialLoginButtons';
import { ThemeProvider } from '../context/ThemeContext';
import { render } from '../test-utils/render';

describe('accessibility audit', () => {
  it('header has no obvious axe violations', async () => {
    const { container } = render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('social login buttons have no obvious axe violations', async () => {
    const { container } = render(<SocialLoginButtons />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

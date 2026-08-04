import React, { ReactElement, ReactNode } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';

interface TestProvidersProps {
  children: ReactNode;
  route: string;
}

const TestProviders: React.FC<TestProvidersProps> = ({ children, route }) => {
  return (
    <HelmetProvider>
      <MemoryRouter initialEntries={[route]}>
        {children}
      </MemoryRouter>
    </HelmetProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

const render = (ui: ReactElement, options: CustomRenderOptions = {}) => {
  const { route = '/', ...renderOptions } = options;

  return rtlRender(ui, {
    wrapper: ({ children }) => <TestProviders route={route}>{children}</TestProviders>,
    ...renderOptions,
  });
};

export * from '@testing-library/react';
export { render };

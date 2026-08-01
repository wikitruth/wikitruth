import React from 'react';
import { render, screen } from '../../test-utils/render';
import Layout from './Layout';

jest.mock('./Header', () => ({
  __esModule: true,
  default: ({ onToggleSidebar, focused }: { onToggleSidebar?: () => void; focused?: boolean }) => (
    <header
      data-testid="layout-header"
      data-has-sidebar-toggle={Boolean(onToggleSidebar)}
      data-focused={Boolean(focused)}
    />
  ),
}));

jest.mock('./Footer', () => ({
  __esModule: true,
  default: () => <footer data-testid="layout-footer" />,
}));

jest.mock('./ContextSidebar', () => ({
  __esModule: true,
  default: () => <aside data-testid="context-sidebar" />,
}));

describe('Layout', () => {
  it('uses a focused full-width shell without contextual navigation on sign-in', () => {
    render(<Layout><div data-testid="page-content" /></Layout>, { route: '/login' });

    expect(screen.queryByTestId('context-sidebar')).not.toBeInTheDocument();
    expect(screen.getByTestId('layout-header')).toHaveAttribute('data-has-sidebar-toggle', 'false');
    expect(screen.getByTestId('layout-header')).toHaveAttribute('data-focused', 'true');
    expect(screen.queryByTestId('layout-footer')).not.toBeInTheDocument();
    expect(screen.getByTestId('page-content').parentElement).toHaveClass('col-xs-12');
  });

  it('uses the same focused shell for account creation', () => {
    render(<Layout><div data-testid="page-content" /></Layout>, { route: '/signup' });

    expect(screen.queryByTestId('context-sidebar')).not.toBeInTheDocument();
    expect(screen.getByTestId('layout-header')).toHaveAttribute('data-focused', 'true');
    expect(screen.queryByTestId('layout-footer')).not.toBeInTheDocument();
    expect(screen.getByTestId('page-content').parentElement).toHaveClass('col-xs-12');
  });

  it('retains contextual navigation on regular pages', () => {
    render(<Layout><div data-testid="page-content" /></Layout>, { route: '/explore' });

    expect(screen.getByTestId('context-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('layout-header')).toHaveAttribute('data-has-sidebar-toggle', 'true');
    expect(screen.getByTestId('layout-header')).toHaveAttribute('data-focused', 'false');
    expect(screen.getByTestId('layout-footer')).toBeInTheDocument();
    expect(screen.getByTestId('page-content').parentElement).toHaveClass('col-md-9');
  });
});

import React from 'react';
import { render, screen } from '../../test-utils/render';
import ErrorBoundary from './ErrorBoundary';

// Suppress console.error for expected errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
});

jest.mock('../../utils/analytics', () => ({
  trackEvent: jest.fn(),
}));

const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test render crash');
  }
  return <div>Normal content</div>;
};

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('tracks error via analytics', () => {
    const { trackEvent } = require('../../utils/analytics');
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    expect(trackEvent).toHaveBeenCalledWith('render_crash', 'error', 'Test render crash');
  });
});

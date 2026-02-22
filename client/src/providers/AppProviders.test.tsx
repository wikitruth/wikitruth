import React from 'react';
import AppProviders from './AppProviders';
import { render, screen } from '../test-utils/render';

describe('AppProviders', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders nested children', () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(
      <AppProviders>
        <div>app-child</div>
      </AppProviders>
    );

    expect(screen.getByText('app-child')).toBeInTheDocument();
  });
});

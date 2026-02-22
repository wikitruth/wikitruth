import { renderHook, waitFor, act } from '@testing-library/react';
import useFetch from './useFetch';

describe('useFetch', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('fetches data by default', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useFetch('/api/home'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ ok: true });
  });

  it('supports manual refetch', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useFetch('/api/home', { refetchOnMount: false }));

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});

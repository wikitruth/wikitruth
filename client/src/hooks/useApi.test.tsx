import { renderHook, waitFor, act } from '@testing-library/react';
import useApi from './useApi';

describe('useApi', () => {
  it('runs request immediately when enabled', async () => {
    const request = jest.fn().mockResolvedValue({ value: 1 });

    const { result } = renderHook(() => useApi(request, { immediate: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(request).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ value: 1 });
  });

  it('exposes execute and errors', async () => {
    const request = jest.fn().mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useApi(request));

    await act(async () => {
      await expect(result.current.execute()).rejects.toThrow('boom');
    });

    expect(result.current.error?.message).toBe('boom');
  });
});

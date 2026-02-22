import { renderHook, act } from '@testing-library/react';
import usePagination from './usePagination';

describe('usePagination', () => {
  it('paginates items and navigates pages', () => {
    const items = Array.from({ length: 45 }, (_, index) => index + 1);
    const { result } = renderHook(() => usePagination(items, 20));

    expect(result.current.totalPages).toBe(3);
    expect(result.current.paginatedItems).toHaveLength(20);

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.page).toBe(2);

    act(() => {
      result.current.goToPage(3);
      result.current.previousPage();
    });

    expect(result.current.page).toBe(2);
  });
});

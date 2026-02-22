import { useMemo, useState } from 'react';

export const usePagination = <T>(items: T[], pageSize = 20) => {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, page, pageSize]);

  const nextPage = () => setPage((prev) => Math.min(totalPages, prev + 1));
  const previousPage = () => setPage((prev) => Math.max(1, prev - 1));
  const goToPage = (nextPageNumber: number) => setPage(Math.min(totalPages, Math.max(1, nextPageNumber)));

  return {
    page,
    totalPages,
    paginatedItems,
    nextPage,
    previousPage,
    goToPage,
  };
};

export default usePagination;

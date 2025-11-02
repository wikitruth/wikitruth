import { useState, useEffect } from 'react';

interface UseFetchOptions {
  skip?: boolean;
  refetchOnMount?: boolean;
}

export function useFetch<T = any>(
  url: string,
  options: UseFetchOptions = {}
) {
  const { skip = false, refetchOnMount = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (skip) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (refetchOnMount) {
      fetchData();
    }
  }, [url, skip, refetchOnMount]);

  const refetch = () => {
    fetchData();
  };

  return { data, loading, error, refetch };
}

export default useFetch;

import { useCallback, useEffect, useState } from 'react';

interface UseApiOptions<T> {
  initialData?: T;
  immediate?: boolean;
}

export const useApi = <T>(request: () => Promise<T>, options: UseApiOptions<T> = {}) => {
  const [data, setData] = useState<T | undefined>(options.initialData);
  const [loading, setLoading] = useState(Boolean(options.immediate));
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await request();
      setData(result);
      return result;
    } catch (err) {
      const resolvedError = err instanceof Error ? err : new Error('Unknown API error');
      setError(resolvedError);
      throw resolvedError;
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (options.immediate) {
      void execute();
    }
  }, [options.immediate, execute]);

  return { data, loading, error, execute };
};

export default useApi;

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
  type Dispatch,
  type SetStateAction,
} from "react";

type UseAsyncDataResult<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
  setData: Dispatch<SetStateAction<T | null>>;
};

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList = [],
): UseAsyncDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  const requestIdRef = useRef(0);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const reload = useCallback(() => {
    const requestId = ++requestIdRef.current;
    return (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetcherRef.current();
        if (requestId !== requestIdRef.current) return;
        setData(result);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    })();
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, ...deps]);

  return { data, loading, error, reload, setData };
}

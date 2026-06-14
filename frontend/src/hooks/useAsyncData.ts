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

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const reload = useCallback(() => {
    return (async () => {
      setLoading(true);
      setError(null);
      try {
        setData(await fetcherRef.current());
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, ...deps]);

  return { data, loading, error, reload, setData };
}

import { useState, useEffect, useCallback } from 'react';

/**
 * 시트 데이터 fetch 훅
 * fetcher: () => Promise<data>
 * deps: 의존성 배열 (변경 시 재조회)
 */
export default function useSheetData(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  const reload = useCallback(() => setReloadTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.resolve(fetcher())
      .then(result => { if (!cancelled) setData(result); })
      .catch(err => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadTick]);

  return { data, loading, error, reload };
}

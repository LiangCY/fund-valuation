import { useEffect, useState, useCallback, useRef } from 'react';
import { Fund, FundEstimate } from '../types/fund.js';
import { 
  searchFunds, 
  getBatchEstimates, 
  getFundHistory,
  getFundComparison 
} from '../services/fundApi.js';
import { useFundStore } from '../store/fundStore.js';

// 搜索基金
export function useFundSearch(query: string) {
  const [results, setResults] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const funds = await searchFunds(query);
        setResults(funds);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return { results, loading, error };
}

// 获取自选基金估值（带自动刷新）
export function useWatchlistEstimates(refreshInterval: number = 60000) {
  const watchlist = useFundStore((state) => state.watchlist);
  const estimates = useFundStore((state) => state.estimates);
  const loading = useFundStore((state) => state.loading);
  const error = useFundStore((state) => state.error);
  const setEstimates = useFundStore((state) => state.setEstimates);
  const setLoading = useFundStore((state) => state.setLoading);
  const setError = useFundStore((state) => state.setError);
  const loadWatchlist = useFundStore((state) => state.loadWatchlist);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchlistRef = useRef(watchlist);
  watchlistRef.current = watchlist;

  const fetchEstimates = useCallback(async () => {
    const currentWatchlist = watchlistRef.current;
    if (currentWatchlist.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getBatchEstimates(currentWatchlist);
      setEstimates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch estimates');
    } finally {
      setLoading(false);
    }
  }, [setEstimates, setLoading, setError]);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  useEffect(() => {
    fetchEstimates();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(fetchEstimates, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchEstimates, refreshInterval]);

  useEffect(() => {
    if (watchlist.length > 0) {
      fetchEstimates();
    }
  }, [watchlist.length, fetchEstimates]);

  const watchlistEstimates = watchlist
    .map((code) => estimates.get(code))
    .filter((e): e is FundEstimate => e !== undefined);

  return { 
    watchlist, 
    estimates: watchlistEstimates, 
    loading,
    error,
    refresh: fetchEstimates 
  };
}

// 获取基金历史数据
export function useFundHistory(code: string, period: string = '1m') {
  const [data, setData] = useState<{ date: string; nav: number; changePercent: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    const fetchHistory = async () => {
      if (!code) return;

      setLoading(true);
      setError(null);
      try {
        const result = await getFundHistory(code, period);
        if (!cancelled) {
          setData(result.history || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch history');
          setData([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchHistory();
    
    return () => {
      cancelled = true;
    };
  }, [code, period]);

  return { data, loading, error };
}

// 获取基金对比数据
export function useFundComparison(code: string, days: number = 30) {
  const [data, setData] = useState<{
    comparisons: { date: string; estimateNav: number; actualNav: number; deviationPercent: number }[];
    summary: { avgDeviationPercent: number; totalDays: number };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComparison = async () => {
      if (!code) return;

      setLoading(true);
      setError(null);
      try {
        const result = await getFundComparison(code, days);
        setData({
          comparisons: result.comparisons,
          summary: result.summary,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch comparison');
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [code, days]);

  return { data, loading, error };
}

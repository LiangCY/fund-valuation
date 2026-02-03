import { create } from 'zustand';
import { Fund, FundEstimate } from '../types/fund.js';

interface FundHolding {
  code: string;
  shares: number;
}

interface ExportData {
  watchlist: string[];
  holdings: [string, number][];
  exportTime: string;
  version: number;
}

interface FundStore {
  watchlist: string[];
  holdings: Map<string, number>;
  estimates: Map<string, FundEstimate>;
  loading: boolean;
  error: string | null;
  
  addToWatchlist: (code: string) => void;
  removeFromWatchlist: (code: string) => void;
  setEstimates: (estimates: FundEstimate[]) => void;
  updateEstimate: (estimate: FundEstimate) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadWatchlist: () => void;
  setHolding: (code: string, shares: number) => void;
  getHolding: (code: string) => number;
  exportData: () => ExportData;
  importData: (data: ExportData) => boolean;
}

const STORAGE_KEY = 'fund-valuation-watchlist';
const HOLDINGS_KEY = 'fund-valuation-holdings';

export const useFundStore = create<FundStore>((set, get) => ({
  watchlist: [],
  holdings: new Map(),
  estimates: new Map(),
  loading: false,
  error: null,

  addToWatchlist: (code: string) => {
    set((state) => {
      if (state.watchlist.includes(code)) {
        return state;
      }
      const newWatchlist = [...state.watchlist, code];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newWatchlist));
      return { watchlist: newWatchlist };
    });
  },

  removeFromWatchlist: (code: string) => {
    set((state) => {
      const newWatchlist = state.watchlist.filter((c) => c !== code);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newWatchlist));
      const newHoldings = new Map(state.holdings);
      newHoldings.delete(code);
      saveHoldings(newHoldings);
      return { watchlist: newWatchlist, holdings: newHoldings };
    });
  },

  setEstimates: (estimates: FundEstimate[]) => {
    const estimatesMap = new Map(estimates.map((e) => [e.code, e]));
    set({ estimates: estimatesMap });
  },

  updateEstimate: (estimate: FundEstimate) => {
    set((state) => {
      const newEstimates = new Map(state.estimates);
      newEstimates.set(estimate.code, estimate);
      return { estimates: newEstimates };
    });
  },

  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),

  loadWatchlist: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const watchlist = JSON.parse(stored);
        set({ watchlist });
      }
      const holdingsStored = localStorage.getItem(HOLDINGS_KEY);
      if (holdingsStored) {
        const holdingsArr: [string, number][] = JSON.parse(holdingsStored);
        set({ holdings: new Map(holdingsArr) });
      }
    } catch (error) {
      console.error('Failed to load watchlist:', error);
    }
  },

  setHolding: (code: string, shares: number) => {
    set((state) => {
      const newHoldings = new Map(state.holdings);
      if (shares > 0) {
        newHoldings.set(code, shares);
      } else {
        newHoldings.delete(code);
      }
      saveHoldings(newHoldings);
      return { holdings: newHoldings };
    });
  },

  getHolding: (code: string) => {
    return get().holdings.get(code) || 0;
  },

  exportData: () => {
    const state = get();
    return {
      watchlist: state.watchlist,
      holdings: Array.from(state.holdings.entries()),
      exportTime: new Date().toISOString(),
      version: 1,
    };
  },

  importData: (data: ExportData) => {
    try {
      if (!data.watchlist || !Array.isArray(data.watchlist)) {
        return false;
      }
      const watchlist = data.watchlist.filter((code) => typeof code === 'string' && code.length > 0);
      const holdings = new Map<string, number>();
      if (data.holdings && Array.isArray(data.holdings)) {
        data.holdings.forEach(([code, shares]) => {
          if (typeof code === 'string' && typeof shares === 'number' && shares > 0) {
            holdings.set(code, shares);
          }
        });
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
      saveHoldings(holdings);
      set({ watchlist, holdings });
      return true;
    } catch {
      return false;
    }
  },
}));

function saveHoldings(holdings: Map<string, number>) {
  localStorage.setItem(HOLDINGS_KEY, JSON.stringify(Array.from(holdings.entries())));
}

import { create } from "zustand";
import { FundEstimate } from "../types/fund.js";

export interface FundHolding {
  shares: number;
  costNav: number;
}

interface ExportData {
  watchlist: string[];
  holdings: [string, FundHolding][];
  exportTime: string;
  version: number;
}

interface LegacyExportData {
  watchlist: string[];
  holdings: [string, number][];
  exportTime: string;
  version: number;
}

interface FundStore {
  watchlist: string[];
  holdings: Map<string, FundHolding>;
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
  setCostNav: (code: string, costNav: number) => void;
  getHolding: (code: string) => FundHolding | undefined;
  getShares: (code: string) => number;
  exportData: () => ExportData;
  importData: (data: ExportData | LegacyExportData) => boolean;
}

const STORAGE_KEY = "fund-valuation-watchlist";
const HOLDINGS_KEY = "fund-valuation-holdings";

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
        const holdingsArr = JSON.parse(holdingsStored);
        const holdingsMap = new Map<string, FundHolding>();
        for (const [code, value] of holdingsArr) {
          if (typeof value === "number") {
            holdingsMap.set(code, {
              shares: value,
              costNav: 0,
            });
          } else if (typeof value === "object" && value !== null) {
            const holding = value as {
              shares?: number;
              amount?: number;
              costNav?: number;
            };
            const shares = holding.shares || (holding.amount ? 0 : 0);
            holdingsMap.set(code, {
              shares: shares || 0,
              costNav: holding.costNav || 0,
            });
          }
        }
        set({ holdings: holdingsMap });
      }
    } catch (error) {
      console.error("Failed to load watchlist:", error);
    }
  },

  setHolding: (code: string, shares: number) => {
    set((state) => {
      const newHoldings = new Map(state.holdings);
      if (shares > 0) {
        const existingHolding = state.holdings.get(code);
        const holding: FundHolding = {
          shares,
          costNav: existingHolding?.costNav || 0,
        };
        newHoldings.set(code, holding);
      } else {
        newHoldings.delete(code);
      }
      saveHoldings(newHoldings);
      return { holdings: newHoldings };
    });
  },

  setCostNav: (code: string, costNav: number) => {
    set((state) => {
      const existingHolding = state.holdings.get(code);
      if (!existingHolding) return state;
      const newHoldings = new Map(state.holdings);
      newHoldings.set(code, {
        ...existingHolding,
        costNav,
      });
      saveHoldings(newHoldings);
      return { holdings: newHoldings };
    });
  },

  getHolding: (code: string) => {
    return get().holdings.get(code);
  },

  getShares: (code: string) => {
    const holding = get().holdings.get(code);
    if (!holding) return 0;
    return holding.shares;
  },

  exportData: () => {
    const state = get();
    return {
      watchlist: state.watchlist,
      holdings: Array.from(state.holdings.entries()),
      exportTime: new Date().toISOString(),
      version: 2,
    };
  },

  importData: (data: ExportData | LegacyExportData) => {
    try {
      if (!data.watchlist || !Array.isArray(data.watchlist)) {
        return false;
      }
      const watchlist = data.watchlist.filter(
        (code) => typeof code === "string" && code.length > 0,
      );
      const holdings = new Map<string, FundHolding>();
      if (data.holdings && Array.isArray(data.holdings)) {
        data.holdings.forEach(([code, value]) => {
          if (typeof code === "string") {
            if (typeof value === "number" && value > 0) {
              holdings.set(code, {
                shares: value,
                costNav: 0,
              });
            } else if (typeof value === "object" && value !== null) {
              const holding = value as { shares?: number; costNav?: number };
              if (holding.shares && holding.shares > 0) {
                holdings.set(code, {
                  shares: holding.shares || 0,
                  costNav: holding.costNav || 0,
                });
              }
            }
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

function saveHoldings(holdings: Map<string, FundHolding>) {
  localStorage.setItem(
    HOLDINGS_KEY,
    JSON.stringify(Array.from(holdings.entries())),
  );
}

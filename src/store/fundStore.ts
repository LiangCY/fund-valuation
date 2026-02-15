import { create } from "zustand";
import {
  FundEstimate,
  FundGroup,
  DEFAULT_GROUP_ID,
  DEFAULT_GROUP_NAME,
} from "../types/fund.js";

export interface FundHolding {
  shares: number;
  costNav: number;
}

interface ExportData {
  watchlist: string[];
  holdings: [string, FundHolding][];
  groups?: FundGroup[];
  exportTime: string;
  version: number;
}

interface LegacyExportData {
  watchlist: string[];
  holdings: [string, number][];
  exportTime: string;
  version: number;
}

function makeHoldingKey(groupId: string, code: string): string {
  return `${groupId}:${code}`;
}

function parseHoldingKey(key: string): { groupId: string; code: string } | null {
  const parts = key.split(":");
  if (parts.length === 2) {
    return { groupId: parts[0], code: parts[1] };
  }
  return null;
}

interface FundStore {
  watchlist: string[];
  holdings: Map<string, FundHolding>;
  estimates: Map<string, FundEstimate>;
  groups: FundGroup[];
  activeGroupId: string;
  loading: boolean;
  error: string | null;

  addToWatchlist: (code: string, groupId?: string) => void;
  removeFromWatchlist: (code: string, groupId?: string) => void;
  setEstimates: (estimates: FundEstimate[]) => void;
  updateEstimate: (estimate: FundEstimate) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadWatchlist: () => void;
  setHolding: (groupId: string, code: string, shares: number) => void;
  setCostNav: (groupId: string, code: string, costNav: number) => void;
  getHolding: (groupId: string, code: string) => FundHolding | undefined;
  getShares: (groupId: string, code: string) => number;
  exportData: () => ExportData;
  importData: (data: ExportData | LegacyExportData) => boolean;

  addGroup: (name: string) => string;
  removeGroup: (groupId: string) => void;
  renameGroup: (groupId: string, newName: string) => void;
  setActiveGroup: (groupId: string) => void;
  reorderGroups: (groupIds: string[]) => void;
  getGroupFunds: (groupId: string) => string[];
}

const STORAGE_KEY = "fund-valuation-watchlist";
const HOLDINGS_KEY = "fund-valuation-holdings";
const GROUPS_KEY = "fund-valuation-groups";

function generateGroupId(): string {
  return `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultGroup(funds: string[] = []): FundGroup {
  return {
    id: DEFAULT_GROUP_ID,
    name: DEFAULT_GROUP_NAME,
    funds,
    order: 0,
  };
}

export const useFundStore = create<FundStore>((set, get) => ({
  watchlist: [],
  holdings: new Map(),
  estimates: new Map(),
  groups: [createDefaultGroup()],
  activeGroupId: DEFAULT_GROUP_ID,
  loading: false,
  error: null,

  addToWatchlist: (code: string, groupId?: string) => {
    set((state) => {
      const targetGroupId = groupId || state.activeGroupId || DEFAULT_GROUP_ID;

      const group = state.groups.find((g) => g.id === targetGroupId);
      if (group?.funds.includes(code)) {
        return state;
      }

      let newWatchlist = state.watchlist;
      if (!state.watchlist.includes(code)) {
        newWatchlist = [...state.watchlist, code];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newWatchlist));
      }

      const newGroups = state.groups.map((g) => {
        if (g.id === targetGroupId && !g.funds.includes(code)) {
          return { ...g, funds: [...g.funds, code] };
        }
        return g;
      });
      saveGroups(newGroups);

      return { watchlist: newWatchlist, groups: newGroups };
    });
  },

  removeFromWatchlist: (code: string, groupId?: string) => {
    set((state) => {
      const targetGroupId = groupId || state.activeGroupId;

      const newGroups = state.groups.map((g) => {
        if (g.id === targetGroupId) {
          return { ...g, funds: g.funds.filter((f) => f !== code) };
        }
        return g;
      });
      saveGroups(newGroups);

      const newHoldings = new Map(state.holdings);
      const holdingKey = makeHoldingKey(targetGroupId, code);
      newHoldings.delete(holdingKey);
      saveHoldings(newHoldings);

      const stillInOtherGroups = newGroups.some((g) => g.funds.includes(code));
      let newWatchlist = state.watchlist;
      if (!stillInOtherGroups) {
        newWatchlist = state.watchlist.filter((c) => c !== code);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newWatchlist));
      }

      return { watchlist: newWatchlist, holdings: newHoldings, groups: newGroups };
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
      let watchlist: string[] = [];
      if (stored) {
        watchlist = JSON.parse(stored);
      }

      const holdingsStored = localStorage.getItem(HOLDINGS_KEY);
      const holdingsMap = new Map<string, FundHolding>();
      if (holdingsStored) {
        const holdingsArr = JSON.parse(holdingsStored);
        for (const [key, value] of holdingsArr) {
          if (typeof value === "number") {
            holdingsMap.set(key, {
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
            holdingsMap.set(key, {
              shares: shares || 0,
              costNav: holding.costNav || 0,
            });
          }
        }
      }

      const groupsStored = localStorage.getItem(GROUPS_KEY);
      let groups: FundGroup[] = [];

      if (groupsStored) {
        groups = JSON.parse(groupsStored);
        const allFundsInGroups = new Set(groups.flatMap((g) => g.funds));
        const orphanFunds = watchlist.filter((code) => !allFundsInGroups.has(code));

        if (orphanFunds.length > 0) {
          const defaultGroup = groups.find((g) => g.id === DEFAULT_GROUP_ID);
          if (defaultGroup) {
            defaultGroup.funds = [...defaultGroup.funds, ...orphanFunds];
          } else {
            groups.unshift(createDefaultGroup(orphanFunds));
          }
          saveGroups(groups);
        }
      } else if (watchlist.length > 0) {
        groups = [createDefaultGroup(watchlist)];
        saveGroups(groups);
      } else {
        groups = [createDefaultGroup()];
      }

      if (!groups.find((g) => g.id === DEFAULT_GROUP_ID)) {
        groups.unshift(createDefaultGroup());
        saveGroups(groups);
      }

      const migratedHoldings = new Map<string, FundHolding>();
      let needsMigration = false;

      holdingsMap.forEach((holding, key) => {
        const parsed = parseHoldingKey(key);
        if (parsed) {
          migratedHoldings.set(key, holding);
        } else {
          needsMigration = true;
          const newKey = makeHoldingKey(DEFAULT_GROUP_ID, key);
          migratedHoldings.set(newKey, holding);
        }
      });

      if (needsMigration) {
        saveHoldings(migratedHoldings);
      }

      set({ watchlist, holdings: migratedHoldings, groups });
    } catch (error) {
      console.error("Failed to load watchlist:", error);
    }
  },

  setHolding: (groupId: string, code: string, shares: number) => {
    set((state) => {
      const newHoldings = new Map(state.holdings);
      const key = makeHoldingKey(groupId, code);
      if (shares > 0) {
        const existingHolding = state.holdings.get(key);
        const holding: FundHolding = {
          shares,
          costNav: existingHolding?.costNav || 0,
        };
        newHoldings.set(key, holding);
      } else {
        newHoldings.delete(key);
      }
      saveHoldings(newHoldings);
      return { holdings: newHoldings };
    });
  },

  setCostNav: (groupId: string, code: string, costNav: number) => {
    set((state) => {
      const key = makeHoldingKey(groupId, code);
      const existingHolding = state.holdings.get(key);
      if (!existingHolding) return state;
      const newHoldings = new Map(state.holdings);
      newHoldings.set(key, {
        ...existingHolding,
        costNav,
      });
      saveHoldings(newHoldings);
      return { holdings: newHoldings };
    });
  },

  getHolding: (groupId: string, code: string) => {
    const key = makeHoldingKey(groupId, code);
    return get().holdings.get(key);
  },

  getShares: (groupId: string, code: string) => {
    const key = makeHoldingKey(groupId, code);
    const holding = get().holdings.get(key);
    if (!holding) return 0;
    return holding.shares;
  },

  exportData: () => {
    const state = get();
    return {
      watchlist: state.watchlist,
      holdings: Array.from(state.holdings.entries()),
      groups: state.groups,
      exportTime: new Date().toISOString(),
      version: 4,
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
        data.holdings.forEach(([key, value]) => {
          if (typeof key === "string") {
            const parsed = parseHoldingKey(key);
            const finalKey = parsed ? key : makeHoldingKey(DEFAULT_GROUP_ID, key);

            if (typeof value === "number" && value > 0) {
              holdings.set(finalKey, {
                shares: value,
                costNav: 0,
              });
            } else if (typeof value === "object" && value !== null) {
              const holding = value as { shares?: number; costNav?: number };
              if (holding.shares && holding.shares > 0) {
                holdings.set(finalKey, {
                  shares: holding.shares || 0,
                  costNav: holding.costNav || 0,
                });
              }
            }
          }
        });
      }

      let groups: FundGroup[];
      const exportData = data as ExportData;
      if (exportData.groups && Array.isArray(exportData.groups) && exportData.groups.length > 0) {
        groups = exportData.groups;
        const allFundsInGroups = new Set(groups.flatMap((g) => g.funds));
        const orphanFunds = watchlist.filter((code) => !allFundsInGroups.has(code));

        if (orphanFunds.length > 0) {
          const defaultGroup = groups.find((g) => g.id === DEFAULT_GROUP_ID);
          if (defaultGroup) {
            defaultGroup.funds = [...defaultGroup.funds, ...orphanFunds];
          } else {
            groups.unshift(createDefaultGroup(orphanFunds));
          }
        }

        if (!groups.find((g) => g.id === DEFAULT_GROUP_ID)) {
          groups.unshift(createDefaultGroup());
        }
      } else {
        groups = [createDefaultGroup(watchlist)];
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
      saveHoldings(holdings);
      saveGroups(groups);
      set({ watchlist, holdings, groups, activeGroupId: DEFAULT_GROUP_ID });
      return true;
    } catch {
      return false;
    }
  },

  addGroup: (name: string) => {
    const newGroupId = generateGroupId();
    set((state) => {
      const maxOrder = Math.max(...state.groups.map((g) => g.order), -1);
      const newGroup: FundGroup = {
        id: newGroupId,
        name,
        funds: [],
        order: maxOrder + 1,
      };
      const newGroups = [...state.groups, newGroup];
      saveGroups(newGroups);
      return { groups: newGroups };
    });
    return newGroupId;
  },

  removeGroup: (groupId: string) => {
    if (groupId === DEFAULT_GROUP_ID) {
      return;
    }

    set((state) => {
      const groupToRemove = state.groups.find((g) => g.id === groupId);
      if (!groupToRemove) return state;

      const newGroups = state.groups.filter((g) => g.id !== groupId);
      saveGroups(newGroups);

      const newHoldings = new Map(state.holdings);
      groupToRemove.funds.forEach((code) => {
        const holdingKey = makeHoldingKey(groupId, code);
        newHoldings.delete(holdingKey);
      });
      saveHoldings(newHoldings);

      const stillUsedFunds = new Set(newGroups.flatMap((g) => g.funds));
      const orphanFunds = groupToRemove.funds.filter((code) => !stillUsedFunds.has(code));
      let newWatchlist = state.watchlist;
      if (orphanFunds.length > 0) {
        newWatchlist = state.watchlist.filter((code) => !orphanFunds.includes(code));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newWatchlist));
      }

      const newActiveGroupId =
        state.activeGroupId === groupId ? DEFAULT_GROUP_ID : state.activeGroupId;

      return {
        groups: newGroups,
        holdings: newHoldings,
        watchlist: newWatchlist,
        activeGroupId: newActiveGroupId,
      };
    });
  },

  renameGroup: (groupId: string, newName: string) => {
    set((state) => {
      const newGroups = state.groups.map((g) => {
        if (g.id === groupId) {
          return { ...g, name: newName };
        }
        return g;
      });
      saveGroups(newGroups);
      return { groups: newGroups };
    });
  },

  setActiveGroup: (groupId: string) => {
    set({ activeGroupId: groupId });
  },

  reorderGroups: (groupIds: string[]) => {
    set((state) => {
      const groupMap = new Map(state.groups.map((g) => [g.id, g]));
      const newGroups = groupIds
        .map((id, index) => {
          const group = groupMap.get(id);
          if (group) {
            return { ...group, order: index };
          }
          return null;
        })
        .filter((g): g is FundGroup => g !== null);

      state.groups.forEach((g) => {
        if (!groupIds.includes(g.id)) {
          newGroups.push({ ...g, order: newGroups.length });
        }
      });

      saveGroups(newGroups);
      return { groups: newGroups };
    });
  },

  getGroupFunds: (groupId: string) => {
    const state = get();
    const group = state.groups.find((g) => g.id === groupId);
    return group?.funds || [];
  },
}));

function saveHoldings(holdings: Map<string, FundHolding>) {
  localStorage.setItem(
    HOLDINGS_KEY,
    JSON.stringify(Array.from(holdings.entries())),
  );
}

function saveGroups(groups: FundGroup[]) {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

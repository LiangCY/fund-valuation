export interface Fund {
  code: string;
  name: string;
  type: string;
}

export interface FundGroup {
  id: string;
  name: string;
  funds: string[];
  order: number;
}

export const DEFAULT_GROUP_ID = "default";
export const DEFAULT_GROUP_NAME = "默认";

export interface FundEstimate {
  code: string;
  name: string;
  estimateNav: number;
  lastNav: number;
  prevNav: number;
  changePercent: number;
  lastChangePercent: number;
  lastNavDate: string;
  estimateTime: string;
  type: string;
  navUpdatedToday: boolean;
}

export interface FundHistoricalData {
  date: string;
  nav: number;
  changePercent: number;
}

export interface FundComparison {
  code: string;
  name: string;
  estimateNav: number;
  actualNav: number;
  deviation: number;
  deviationPercent: number;
  date: string;
}

export interface SearchResult {
  funds: Fund[];
  total: number;
}

export interface HistoryData {
  code: string;
  period: string;
  history: FundHistoricalData[];
}

export interface ComparisonData {
  code: string;
  comparisons: FundComparison[];
  summary: {
    avgDeviationPercent: number;
    totalDays: number;
  };
}

export interface MarketIndex {
  code: string;
  name: string;
  current: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
  updateTime: string;
  market: "A" | "HK" | "US";
}

export interface IndexTrendData {
  time: string;
  price: number;
  avgPrice: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface IndexKlineData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePercent: number;
}

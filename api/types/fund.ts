export interface Fund {
  code: string;
  name: string;
  type: string;
}

export interface FundEstimate {
  code: string;
  name: string;
  estimateNav: number;
  lastNav: number;
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

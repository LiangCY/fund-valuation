export interface Fund {
  code: string;
  name: string;
  type: string;
  market: 'A股' | '港股' | '美股';
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
  market: string;
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

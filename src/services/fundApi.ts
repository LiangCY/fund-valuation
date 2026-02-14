import {
  Fund,
  FundEstimate,
  HistoryData,
  ComparisonData,
  MarketIndex,
  IndexTrendData,
  IndexKlineData,
} from "../types/fund.js";

const API_BASE = "/api";

export async function searchFunds(query: string): Promise<Fund[]> {
  const response = await fetch(
    `${API_BASE}/funds/search?query=${encodeURIComponent(query)}`,
  );
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Search failed");
  }
  return result.data.funds;
}

export async function getFundEstimate(code: string): Promise<FundEstimate> {
  const response = await fetch(`${API_BASE}/funds/estimate/${code}`);
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to get estimate");
  }
  return result.data;
}

export async function getBatchEstimates(
  codes: string[],
): Promise<FundEstimate[]> {
  const response = await fetch(`${API_BASE}/funds/estimates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codes }),
  });
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to get estimates");
  }
  return result.data;
}

export async function getFundHistory(
  code: string,
  period: string = "1m",
): Promise<HistoryData> {
  const response = await fetch(
    `${API_BASE}/funds/history/${code}?period=${period}`,
  );
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to get history");
  }
  return result.data;
}

export async function getFundComparison(
  code: string,
  days: number = 30,
): Promise<ComparisonData> {
  const response = await fetch(
    `${API_BASE}/funds/comparison/${code}?days=${days}`,
  );
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to get comparison");
  }
  return result.data;
}

export async function getAllFunds(): Promise<Fund[]> {
  const response = await fetch(`${API_BASE}/funds/list`);
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to get fund list");
  }
  return result.data;
}

export async function getMarketIndices(): Promise<MarketIndex[]> {
  const response = await fetch(`${API_BASE}/market/indices`);
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to get market indices");
  }
  return result.data;
}

export async function getIndexTrend(code: string): Promise<IndexTrendData[]> {
  const response = await fetch(`${API_BASE}/market/trend/${code}`);
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to get index trend");
  }
  return result.data;
}

export async function getIndexKline(
  code: string,
  period: string = "day",
): Promise<IndexKlineData[]> {
  const response = await fetch(
    `${API_BASE}/market/kline/${code}?period=${period}`,
  );
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to get index kline");
  }
  return result.data;
}

export async function getTradingDays(
  startDate: string,
  endDate: string,
): Promise<string[]> {
  const response = await fetch(
    `${API_BASE}/funds/trading-days?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
  );
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to get trading days");
  }
  return result.data;
}

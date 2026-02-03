import { Fund, FundEstimate, SearchResult, HistoryData, ComparisonData } from '../types/fund.js';

const API_BASE = '/api';

export async function searchFunds(query: string): Promise<Fund[]> {
  const response = await fetch(`${API_BASE}/funds/search?query=${encodeURIComponent(query)}`);
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Search failed');
  }
  return result.data.funds;
}

export async function getFundEstimate(code: string): Promise<FundEstimate> {
  const response = await fetch(`${API_BASE}/funds/estimate/${code}`);
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to get estimate');
  }
  return result.data;
}

export async function getBatchEstimates(codes: string[]): Promise<FundEstimate[]> {
  const response = await fetch(`${API_BASE}/funds/estimates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codes }),
  });
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to get estimates');
  }
  return result.data;
}

export async function getFundHistory(code: string, period: string = '1m'): Promise<HistoryData> {
  const response = await fetch(`${API_BASE}/funds/history/${code}?period=${period}`);
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to get history');
  }
  return result.data;
}

export async function getFundComparison(code: string, days: number = 30): Promise<ComparisonData> {
  const response = await fetch(`${API_BASE}/funds/comparison/${code}?days=${days}`);
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to get comparison');
  }
  return result.data;
}

export async function getAllFunds(): Promise<Fund[]> {
  const response = await fetch(`${API_BASE}/funds/list`);
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to get fund list');
  }
  return result.data;
}

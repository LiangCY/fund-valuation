import { FundHistoricalData } from '../types/fund.js';

interface EastMoneyHistoryItem {
  FSRQ: string;
  DWJZ: string;
  LJJZ: string;
  JZZZL: string;
}

interface EastMoneyHistoryResponse {
  Data: {
    LSJZList: EastMoneyHistoryItem[];
  };
  TotalCount: number;
  PageSize: number;
  PageIndex: number;
  ErrCode: number;
  ErrMsg: string | null;
}

function getPeriodDays(period: string): number {
  switch (period) {
    case '1w': return 7;
    case '1m': return 30;
    case '3m': return 90;
    case '6m': return 180;
    case '1y': return 365;
    default: return 30;
  }
}

async function fetchHistoryPage(fundCode: string, pageIndex: number): Promise<EastMoneyHistoryResponse | null> {
  try {
    const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${fundCode}&pageIndex=${pageIndex}&pageSize=20&_=${Date.now()}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://fund.eastmoney.com/',
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function getFundHistoryFromEastMoney(
  fundCode: string, 
  period: string = '1m'
): Promise<FundHistoricalData[]> {
  try {
    const days = getPeriodDays(period);
    const pagesNeeded = Math.ceil(days / 20);
    
    const pagePromises: Promise<EastMoneyHistoryResponse | null>[] = [];
    for (let i = 1; i <= pagesNeeded; i++) {
      pagePromises.push(fetchHistoryPage(fundCode, i));
    }
    
    const results = await Promise.all(pagePromises);
    
    const allItems: EastMoneyHistoryItem[] = [];
    for (const data of results) {
      if (data?.ErrCode === 0 && data.Data?.LSJZList) {
        allItems.push(...data.Data.LSJZList);
      }
    }

    const historyData: FundHistoricalData[] = allItems
      .slice(0, days)
      .map((item) => ({
        date: item.FSRQ,
        nav: parseFloat(item.DWJZ) || 0,
        changePercent: parseFloat(item.JZZZL) || 0,
      }))
      .reverse();

    return historyData;
  } catch (error) {
    console.error(`Error fetching history for ${fundCode}:`, error);
    return [];
  }
}

export async function getTradingDaysFromEastMoney(
  startDate: string,
  endDate: string
): Promise<string[]> {
  try {
    const start = new Date(startDate);
    const today = new Date();
    const daysFromToday = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const fundCode = '510300';
    const pagesNeeded = Math.ceil(daysFromToday / 20) + 1;
    
    const pagePromises: Promise<EastMoneyHistoryResponse | null>[] = [];
    for (let i = 1; i <= pagesNeeded; i++) {
      pagePromises.push(fetchHistoryPage(fundCode, i));
    }
    
    const results = await Promise.all(pagePromises);
    
    const allDates: string[] = [];
    for (const data of results) {
      if (data?.ErrCode === 0 && data.Data?.LSJZList) {
        for (const item of data.Data.LSJZList) {
          allDates.push(item.FSRQ);
        }
      }
    }

    const tradingDays = allDates
      .filter(date => date >= startDate && date <= endDate)
      .sort();

    return tradingDays;
  } catch (error) {
    console.error('Error fetching trading days:', error);
    return [];
  }
}

import { FundEstimate } from '../types/fund.js';

interface EastMoneyEstimateData {
  fundcode: string;
  name: string;
  jzrq: string;
  dwjz: string;
  gsz: string;
  gszzl: string;
  gztime: string;
}

interface EastMoneyHistoryItem {
  FSRQ: string;
  DWJZ: string;
  JZZZL: string;
}

interface EastMoneyHistoryResponse {
  Data: {
    LSJZList: EastMoneyHistoryItem[];
  };
}

interface LatestNavData {
  date: string;
  nav: number;
  changePercent: number;
}

interface HistoryNavData {
  latest: LatestNavData | null;
  yesterday: LatestNavData | null;
}

async function getHistoryNavData(fundCode: string): Promise<HistoryNavData> {
  try {
    const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${fundCode}&pageIndex=1&pageSize=2&_=${Date.now()}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://fund.eastmoney.com/',
      },
    });
    if (!response.ok) return { latest: null, yesterday: null };
    const data: EastMoneyHistoryResponse = await response.json();
    const list = data.Data?.LSJZList || [];
    
    const latest = list[0] ? {
      date: list[0].FSRQ,
      nav: parseFloat(list[0].DWJZ) || 0,
      changePercent: parseFloat(list[0].JZZZL) || 0,
    } : null;
    
    const yesterday = list[1] ? {
      date: list[1].FSRQ,
      nav: parseFloat(list[1].DWJZ) || 0,
      changePercent: parseFloat(list[1].JZZZL) || 0,
    } : null;
    
    return { latest, yesterday };
  } catch {
    return { latest: null, yesterday: null };
  }
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return dateStr === todayStr;
}

function createEmptyEstimate(fundCode: string): FundEstimate {
  return {
    code: fundCode,
    name: `基金 ${fundCode}`,
    estimateNav: 0,
    lastNav: 0,
    changePercent: 0,
    lastChangePercent: 0,
    lastNavDate: '',
    estimateTime: '',
    market: 'A股',
    type: '',
    navUpdatedToday: false,
  };
}

export async function getFundEstimateFromEastMoney(fundCode: string): Promise<FundEstimate> {
  try {
    const timestamp = Date.now();
    const url = `https://fundgz.1234567.com.cn/js/${fundCode}.js?rt=${timestamp}`;
    
    const [response, historyData] = await Promise.all([
      fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://fund.eastmoney.com/',
        },
      }),
      getHistoryNavData(fundCode),
    ]);

    if (!response.ok) {
      console.error(`Failed to fetch estimate for ${fundCode}: ${response.status}`);
      return createEmptyEstimate(fundCode);
    }

    const text = await response.text();
    
    const match = text.match(/jsonpgz\((.*)\)/);
    if (!match || !match[1]) {
      console.error(`Invalid response format for ${fundCode}`);
      return createEmptyEstimate(fundCode);
    }

    const data: EastMoneyEstimateData = JSON.parse(match[1]);
    
    const { latest, yesterday } = historyData;
    const navUpdatedToday = latest && isToday(latest.date);

    return {
      code: data.fundcode,
      name: data.name,
      estimateNav: navUpdatedToday ? latest.nav : (parseFloat(data.gsz) || 0),
      lastNav: parseFloat(data.dwjz) || 0,
      changePercent: navUpdatedToday ? latest.changePercent : (parseFloat(data.gszzl) || 0),
      lastChangePercent: navUpdatedToday ? (yesterday?.changePercent || 0) : (latest?.changePercent || 0),
      lastNavDate: latest?.date || data.jzrq || '',
      estimateTime: data.gztime || new Date().toISOString(),
      market: 'A股',
      type: '',
      navUpdatedToday: !!navUpdatedToday,
    };
  } catch (error) {
    console.error(`Error fetching estimate for ${fundCode}:`, error);
    return createEmptyEstimate(fundCode);
  }
}

export async function getBatchEstimatesFromEastMoney(fundCodes: string[]): Promise<FundEstimate[]> {
  const results = await Promise.allSettled(
    fundCodes.map(code => getFundEstimateFromEastMoney(code))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return createEmptyEstimate(fundCodes[index]);
  });
}

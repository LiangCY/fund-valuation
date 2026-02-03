import { Fund } from '../types/fund.js';

interface EastMoneyFund {
  CODE: string;
  NAME: string;
  FundBaseInfo: {
    FTYPE: string;
  };
}

interface EastMoneySearchResult {
  Datas: EastMoneyFund[];
  ErrCode: number;
  ErrMsg: string | null;
}

const fundTypeMap: Record<string, string> = {
  '股票型': '股票型',
  '混合型': '混合型',
  '债券型': '债券型',
  '指数型': '指数型',
  '货币型': '货币型',
  'QDII': 'QDII',
  'ETF': 'ETF',
  'LOF': 'LOF',
  'FOF': 'FOF',
};

function normalizeFundType(type: string): string {
  for (const [key, value] of Object.entries(fundTypeMap)) {
    if (type.includes(key)) {
      return value;
    }
  }
  return type || '其他';
}

export async function searchFundsFromEastMoney(query: string): Promise<Fund[]> {
  if (!query || query.trim() === '') {
    return [];
  }

  const trimmedQuery = query.trim();
  
  try {
    const url = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?callback=&m=1&key=${encodeURIComponent(trimmedQuery)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://fund.eastmoney.com/',
      },
    });

    if (!response.ok) {
      console.error('EastMoney API error:', response.status, response.statusText);
      return [];
    }

    const data: EastMoneySearchResult = await response.json();

    if (data.ErrCode !== 0 || !data.Datas) {
      console.error('EastMoney API returned error:', data.ErrMsg);
      return [];
    }

    const funds: Fund[] = data.Datas.slice(0, 20).map((item) => ({
      code: item.CODE,
      name: item.NAME,
      type: normalizeFundType(item.FundBaseInfo?.FTYPE || ''),
      market: 'A股' as const,
    }));

    return funds;
  } catch (error) {
    console.error('Failed to search funds from EastMoney:', error);
    return [];
  }
}

export async function searchFundsRealtime(query: string): Promise<Fund[]> {
  return searchFundsFromEastMoney(query);
}

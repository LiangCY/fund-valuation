import { Fund, FundEstimate, FundHistoricalData } from '../types/fund.js';

// 模拟基金数据库
const mockFunds: Fund[] = [
  { code: '000001', name: '华夏成长混合', type: '混合型', market: 'A股' },
  { code: '000002', name: '华夏大盘精选', type: '混合型', market: 'A股' },
  { code: '000003', name: '中海可转债债券A', type: '债券型', market: 'A股' },
  { code: '000004', name: '中海可转债债券C', type: '债券型', market: 'A股' },
  { code: '000005', name: '嘉实增强信用定期债券', type: '债券型', market: 'A股' },
  { code: '000006', name: '西部利得量化成长混合A', type: '混合型', market: 'A股' },
  { code: '000007', name: '鹏华弘利混合A', type: '混合型', market: 'A股' },
  { code: '000008', name: '嘉实中证500ETF联接A', type: '指数型', market: 'A股' },
  { code: '000009', name: '易方达天天理财货币A', type: '货币型', market: 'A股' },
  { code: '000010', name: '易方达天天理财货币B', type: '货币型', market: 'A股' },
  { code: '000011', name: '华夏大盘精选混合', type: '混合型', market: 'A股' },
  { code: '000012', name: '华安沪深300指数A', type: '指数型', market: 'A股' },
  { code: '000013', name: '易方达增强回报债券A', type: '债券型', market: 'A股' },
  { code: '000014', name: '易方达增强回报债券B', type: '债券型', market: 'A股' },
  { code: '000015', name: '华夏债券A', type: '债券型', market: 'A股' },
  { code: '000016', name: '华夏债券C', type: '债券型', market: 'A股' },
  { code: '000017', name: '财通可持续发展主题股票', type: '股票型', market: 'A股' },
  { code: '000018', name: '财通纯债债券A', type: '债券型', market: 'A股' },
  { code: '000019', name: '财通纯债债券C', type: '债券型', market: 'A股' },
  { code: '000020', name: '景顺长城品质成长混合', type: '混合型', market: 'A股' },
  { code: '510300', name: '华泰柏瑞沪深300ETF', type: 'ETF', market: 'A股' },
  { code: '510500', name: '南方中证500ETF', type: 'ETF', market: 'A股' },
  { code: '159915', name: '易方达创业板ETF', type: 'ETF', market: 'A股' },
  { code: '02800', name: '盈富基金', type: 'ETF', market: '港股' },
  { code: '03188', name: '华夏沪深300指数', type: 'ETF', market: '港股' },
  { code: '00700', name: '腾讯控股', type: '股票', market: '港股' },
  { code: '03690', name: '美团-W', type: '股票', market: '港股' },
  { code: '09988', name: '阿里巴巴-SW', type: '股票', market: '港股' },
  { code: 'SPY', name: 'SPDR S&P 500 ETF Trust', type: 'ETF', market: '美股' },
  { code: 'QQQ', name: 'Invesco QQQ Trust', type: 'ETF', market: '美股' },
  { code: 'VTI', name: 'Vanguard Total Stock Market ETF', type: 'ETF', market: '美股' },
  { code: 'AAPL', name: 'Apple Inc.', type: '股票', market: '美股' },
  { code: 'MSFT', name: 'Microsoft Corporation', type: '股票', market: '美股' },
  { code: 'TSLA', name: 'Tesla, Inc.', type: '股票', market: '美股' },
];

// 基金净值缓存
const navCache: Map<string, { nav: number; updateTime: Date }> = new Map();

// 生成基金净值（基于基金代码的伪随机但稳定的数值）
function generateNav(fundCode: string): number {
  const seed = fundCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseNav = 1.0 + (seed % 300) / 100;
  return Math.round(baseNav * 10000) / 10000;
}

// 生成实时估值
export function generateEstimate(fundCode: string): FundEstimate {
  const fund = mockFunds.find(f => f.code === fundCode);
  if (!fund) {
    throw new Error(`Fund not found: ${fundCode}`);
  }

  const cached = navCache.get(fundCode);
  const lastNav = cached?.nav || generateNav(fundCode);
  
  // 模拟估值波动 (-3% ~ +3%)
  const fluctuation = (Math.random() - 0.5) * 0.06;
  const estimateNav = lastNav * (1 + fluctuation);
  const changePercent = (fluctuation * 100);
  
  const now = new Date();
  
  return {
    code: fundCode,
    name: fund.name,
    estimateNav: Math.round(estimateNav * 10000) / 10000,
    lastNav: lastNav,
    changePercent: Math.round(changePercent * 100) / 100,
    estimateTime: now.toISOString(),
    market: fund.market,
    type: fund.type,
  };
}

// 获取基金历史数据
export function getHistoricalData(fundCode: string, period: '1d' | '1w' | '1m' | '3m' | '6m' | '1y'): FundHistoricalData[] {
  const fund = mockFunds.find(f => f.code === fundCode);
  if (!fund) {
    throw new Error(`Fund not found: ${fundCode}`);
  }

  const baseNav = generateNav(fundCode);
  const data: FundHistoricalData[] = [];
  const now = new Date();
  
  let points: number;
  let interval: number; // milliseconds
  
  switch (period) {
    case '1d':
      points = 24;
      interval = 60 * 60 * 1000; // 1小时
      break;
    case '1w':
      points = 7;
      interval = 24 * 60 * 60 * 1000; // 1天
      break;
    case '1m':
      points = 30;
      interval = 24 * 60 * 60 * 1000;
      break;
    case '3m':
      points = 90;
      interval = 24 * 60 * 60 * 1000;
      break;
    case '6m':
      points = 180;
      interval = 24 * 60 * 60 * 1000;
      break;
    case '1y':
      points = 365;
      interval = 24 * 60 * 60 * 1000;
      break;
    default:
      points = 30;
      interval = 24 * 60 * 60 * 1000;
  }

  let currentNav = baseNav;
  
  for (let i = points; i >= 0; i--) {
    const date = new Date(now.getTime() - i * interval);
    
    // 模拟随机波动
    const dailyChange = (Math.random() - 0.48) * 0.02; // 略微上涨趋势
    currentNav = currentNav * (1 + dailyChange);
    
    data.push({
      date: date.toISOString().split('T')[0],
      nav: Math.round(currentNav * 10000) / 10000,
      estimate: Math.round(currentNav * (1 + (Math.random() - 0.5) * 0.01) * 10000) / 10000,
    });
  }

  return data;
}

// 搜索基金
export function searchFunds(query: string): Fund[] {
  if (!query || query.trim() === '') {
    return mockFunds.slice(0, 10);
  }
  
  const lowerQuery = query.toLowerCase().trim();
  return mockFunds.filter(fund => 
    fund.code.toLowerCase().includes(lowerQuery) ||
    fund.name.toLowerCase().includes(lowerQuery)
  ).slice(0, 20);
}

// 获取基金详情
export function getFundDetail(fundCode: string): Fund | null {
  return mockFunds.find(f => f.code === fundCode) || null;
}

// 获取所有基金
export function getAllFunds(): Fund[] {
  return mockFunds;
}

// 更新缓存净值（模拟收盘后更新实际净值）
export function updateNavCache(fundCode: string, nav: number): void {
  navCache.set(fundCode, { nav, updateTime: new Date() });
}

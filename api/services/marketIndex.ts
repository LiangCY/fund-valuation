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

interface EastMoneyIndexData {
  f2: number;
  f3: number;
  f4: number;
  f5: number;
  f6: number | string;
  f12: string;
  f14: string;
  f15: number;
  f16: number;
  f17: number;
}

const INDEX_LIST = [
  { code: "1.000001", name: "上证指数", market: "A" as const },
  { code: "0.399001", name: "深证成指", market: "A" as const },
  { code: "0.399006", name: "创业板指", market: "A" as const },
  { code: "1.000300", name: "沪深300", market: "A" as const },
  { code: "1.000905", name: "中证500", market: "A" as const },
  { code: "1.000688", name: "科创50", market: "A" as const },
  { code: "1.000016", name: "上证50", market: "A" as const },
  { code: "100.HSI", name: "恒生指数", market: "HK" as const },
  { code: "124.HSTECH", name: "恒生科技", market: "HK" as const },
  { code: "100.HSCEI", name: "国企指数", market: "HK" as const },
  { code: "100.NDX", name: "纳斯达克", market: "US" as const },
  { code: "100.DJIA", name: "道琼斯", market: "US" as const },
  { code: "100.SPX", name: "标普500", market: "US" as const },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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

const INDEX_CODE_MAP: Record<string, string> = {
  "000001": "1.000001",
  "399001": "0.399001",
  "399006": "0.399006",
  "000300": "1.000300",
  "000905": "1.000905",
  "000688": "1.000688",
  "000016": "1.000016",
  HSI: "100.HSI",
  HSTECH: "124.HSTECH",
  HSCEI: "100.HSCEI",
  NDX: "100.NDX",
  DJIA: "100.DJIA",
  SPX: "100.SPX",
};

export async function getIndexTrend(code: string): Promise<IndexTrendData[]> {
  try {
    const fullCode = INDEX_CODE_MAP[code] || code;
    const [market, secId] = fullCode.split(".");
    const url = `https://push2.eastmoney.com/api/qt/stock/trends2/get?secid=${market}.${secId}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58&iscr=0&iscca=0&ndays=1&_=${Date.now()}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Referer: "https://quote.eastmoney.com/",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const json = await response.json();
    const trends = json.data?.trends || [];
    const preClose = json.data?.preClose || 0;

    return trends.map((item: string) => {
      const parts = item.split(",");
      const price = parseFloat(parts[1]) || 0;
      const avgPrice = parseFloat(parts[2]) || 0;
      const volume = parseFloat(parts[5]) || 0;
      const change = preClose > 0 ? price - preClose : 0;
      const changePercent =
        preClose > 0 ? ((price - preClose) / preClose) * 100 : 0;

      return {
        time: parts[0],
        price,
        avgPrice,
        change,
        changePercent,
        volume,
      };
    });
  } catch (error) {
    console.error("Error fetching index trend:", error);
    return [];
  }
}

export async function getIndexKline(
  code: string,
  period: string = "101",
): Promise<IndexKlineData[]> {
  try {
    const fullCode = INDEX_CODE_MAP[code] || code;
    const [market, secId] = fullCode.split(".");

    const periodMap: Record<string, string> = {
      day: "101",
      week: "102",
      month: "103",
    };
    const klt = periodMap[period] || period;

    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${market}.${secId}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${klt}&fqt=1&beg=0&end=20500101&lmt=120&_=${Date.now()}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Referer: "https://quote.eastmoney.com/",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const json = await response.json();
    const klines = json.data?.klines || [];

    return klines.map((item: string) => {
      const parts = item.split(",");
      return {
        date: parts[0],
        open: parseFloat(parts[1]) || 0,
        close: parseFloat(parts[2]) || 0,
        high: parseFloat(parts[3]) || 0,
        low: parseFloat(parts[4]) || 0,
        volume: parseFloat(parts[5]) || 0,
        change: parseFloat(parts[7]) || 0,
        changePercent: parseFloat(parts[8]) || 0,
      };
    });
  } catch (error) {
    console.error("Error fetching index kline:", error);
    return [];
  }
}

export async function getMarketIndices(): Promise<MarketIndex[]> {
  try {
    const codes = INDEX_LIST.map((i) => `i:${i.code}`).join(",");
    const url = `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f3&fs=${codes}&fields=f2,f3,f4,f5,f6,f12,f14,f15,f16,f17&_=${Date.now()}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Referer: "https://quote.eastmoney.com/",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const json = await response.json();
    const dataList: EastMoneyIndexData[] = json.data?.diff || [];

    const updateTime = formatTime(new Date());
    const dataMap = new Map(dataList.map((item) => [item.f12, item]));

    return INDEX_LIST.map((indexConfig) => {
      const code = indexConfig.code.split(".")[1];
      const item = dataMap.get(code);
      if (!item) return null;
      return {
        code: item.f12,
        name: item.f14 || indexConfig.name,
        current: item.f2 || 0,
        change: item.f4 || 0,
        changePercent: item.f3 || 0,
        open: item.f17 || 0,
        high: item.f15 || 0,
        low: item.f16 || 0,
        volume: item.f5 || 0,
        amount: typeof item.f6 === "number" ? item.f6 : 0,
        updateTime,
        market: indexConfig.market,
      };
    }).filter((item): item is MarketIndex => item !== null);
  } catch (error) {
    console.error("Error fetching market indices:", error);
    return [];
  }
}

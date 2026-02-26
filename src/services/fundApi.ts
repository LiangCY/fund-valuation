import {
  Fund,
  FundEstimate,
  HistoryData,
  FundHistoricalData,
  MarketIndex,
  IndexTrendData,
  IndexKlineData,
} from "../types/fund.js";

let jsonpCounter = 0;

const createMutex = () => {
  let current = Promise.resolve();
  return {
    async run<T>(fn: () => Promise<T>): Promise<T> {
      const prev = current;
      let resolve: () => void;
      current = new Promise<void>((r) => {
        resolve = r;
      });
      await prev;
      try {
        return await fn();
      } finally {
        resolve!();
      }
    },
  };
};

const estimateMutex = createMutex();

function jsonp<T>(url: string, callbackParam: string = "callback"): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_callback_${Date.now()}_${jsonpCounter++}`;
    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP request timeout"));
    }, 10000);

    function cleanup() {
      clearTimeout(timeout);
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)[callbackName];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[callbackName] = (data: T) => {
      cleanup();
      resolve(data);
    };

    const separator = url.includes("?") ? "&" : "?";
    script.src = `${url}${separator}${callbackParam}=${callbackName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP request failed"));
    };
    document.head.appendChild(script);
  });
}

function parseJsonpScript<T>(url: string, wrapperFn: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP request timeout"));
    }, 10000);

    function cleanup() {
      clearTimeout(timeout);
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)[wrapperFn];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[wrapperFn] = (data: T) => {
      cleanup();
      resolve(data);
    };

    script.src = url;
    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP request failed"));
    };
    document.head.appendChild(script);
  });
}

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
  LJJZ: string;
  JZZZL: string;
}

interface EastMoneyHistoryResponse {
  Data: {
    LSJZList: EastMoneyHistoryItem[];
  };
  TotalCount: number;
  ErrCode: number;
  ErrMsg: string | null;
}

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

interface LatestNavData {
  date: string;
  nav: number;
  changePercent: number;
}

interface HistoryNavData {
  latest: LatestNavData | null;
  yesterday: LatestNavData | null;
}

const fundTypeMap: Record<string, string> = {
  股票型: "股票型",
  混合型: "混合型",
  债券型: "债券型",
  指数型: "指数型",
  货币型: "货币型",
  QDII: "QDII",
  ETF: "ETF",
  LOF: "LOF",
  FOF: "FOF",
};

function normalizeFundType(type: string): string {
  for (const [key, value] of Object.entries(fundTypeMap)) {
    if (type.includes(key)) {
      return value;
    }
  }
  return type || "其他";
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return dateStr === todayStr;
}

function createEmptyEstimate(fundCode: string): FundEstimate {
  return {
    code: fundCode,
    name: "--",
    estimateNav: 0,
    lastNav: 0,
    prevNav: 0,
    changePercent: 0,
    lastChangePercent: 0,
    lastNavDate: "",
    estimateTime: "",
    type: "",
    navUpdatedToday: false,
  };
}

async function getHistoryNavData(fundCode: string): Promise<HistoryNavData> {
  try {
    const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${fundCode}&pageIndex=1&pageSize=2&_=${Date.now()}`;
    const data = await jsonp<EastMoneyHistoryResponse>(url, "callback");
    const list = data.Data?.LSJZList || [];

    const latest = list[0]
      ? {
          date: list[0].FSRQ,
          nav: parseFloat(list[0].DWJZ) || 0,
          changePercent: parseFloat(list[0].JZZZL) || 0,
        }
      : null;

    const yesterday = list[1]
      ? {
          date: list[1].FSRQ,
          nav: parseFloat(list[1].DWJZ) || 0,
          changePercent: parseFloat(list[1].JZZZL) || 0,
        }
      : null;

    return { latest, yesterday };
  } catch {
    return { latest: null, yesterday: null };
  }
}

export async function searchFunds(query: string): Promise<Fund[]> {
  if (!query || query.trim() === "") {
    return [];
  }

  const trimmedQuery = query.trim();

  try {
    const url = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(trimmedQuery)}`;
    const data = await jsonp<EastMoneySearchResult>(url, "callback");

    if (data.ErrCode !== 0 || !data.Datas) {
      console.error("EastMoney API returned error:", data.ErrMsg);
      return [];
    }

    const funds: Fund[] = data.Datas.slice(0, 20).map((item) => ({
      code: item.CODE,
      name: item.NAME,
      type: normalizeFundType(item.FundBaseInfo?.FTYPE || ""),
    }));

    return funds;
  } catch (error) {
    console.error("Failed to search funds:", error);
    return [];
  }
}

async function fetchEstimateData(code: string): Promise<EastMoneyEstimateData> {
  const timestamp = Date.now();
  const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${timestamp}`;
  return estimateMutex.run(() =>
    parseJsonpScript<EastMoneyEstimateData>(url, "jsonpgz"),
  );
}

export async function getFundEstimate(code: string): Promise<FundEstimate> {
  try {
    const [estimateData, historyData] = await Promise.all([
      fetchEstimateData(code),
      getHistoryNavData(code),
    ]);

    const data = estimateData;
    const { latest, yesterday } = historyData;
    const navUpdatedToday = latest && isToday(latest.date);

    const gztime = data.gztime || "";
    const isEstimateToday = gztime && isToday(gztime.split(" ")[0]);
    const hasValidEstimate = navUpdatedToday || isEstimateToday;

    return {
      code: data.fundcode,
      name: data.name,
      estimateNav: hasValidEstimate
        ? navUpdatedToday
          ? latest.nav
          : parseFloat(data.gsz) || 0
        : 0,
      lastNav: latest?.nav || parseFloat(data.dwjz) || 0,
      prevNav: yesterday?.nav || parseFloat(data.dwjz) || 0,
      changePercent: hasValidEstimate
        ? navUpdatedToday
          ? latest.changePercent
          : parseFloat(data.gszzl) || 0
        : 0,
      lastChangePercent: navUpdatedToday
        ? yesterday?.changePercent || 0
        : latest?.changePercent || 0,
      lastNavDate: latest?.date || data.jzrq || "",
      estimateTime: hasValidEstimate ? gztime || new Date().toISOString() : "",
      type: "",
      navUpdatedToday: !!navUpdatedToday,
    };
  } catch (error) {
    console.error(`Error fetching estimate for ${code}:`, error);
    return createEmptyEstimate(code);
  }
}

export async function getBatchEstimates(
  codes: string[],
): Promise<FundEstimate[]> {
  const results = await Promise.allSettled(
    codes.map((code) => getFundEstimate(code)),
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return createEmptyEstimate(codes[index]);
  });
}

function getPeriodDays(period: string): number {
  switch (period) {
    case "1w":
      return 7;
    case "1m":
      return 30;
    case "3m":
      return 90;
    case "6m":
      return 180;
    case "1y":
      return 365;
    default:
      return 30;
  }
}

async function fetchHistoryPage(
  fundCode: string,
  pageIndex: number,
): Promise<EastMoneyHistoryResponse | null> {
  try {
    const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${fundCode}&pageIndex=${pageIndex}&pageSize=20&_=${Date.now()}`;
    return await jsonp<EastMoneyHistoryResponse>(url, "callback");
  } catch {
    return null;
  }
}

export async function getFundHistory(
  code: string,
  period: string = "1m",
): Promise<HistoryData> {
  try {
    const days = getPeriodDays(period);
    const pagesNeeded = Math.ceil(days / 20);

    const pagePromises: Promise<EastMoneyHistoryResponse | null>[] = [];
    for (let i = 1; i <= pagesNeeded; i++) {
      pagePromises.push(fetchHistoryPage(code, i));
    }

    const results = await Promise.all(pagePromises);

    const allItems: EastMoneyHistoryItem[] = [];
    for (const data of results) {
      if (data?.ErrCode === 0 && data.Data?.LSJZList) {
        allItems.push(...data.Data.LSJZList);
      }
    }

    const history: FundHistoricalData[] = allItems
      .slice(0, days)
      .map((item) => ({
        date: item.FSRQ,
        nav: parseFloat(item.DWJZ) || 0,
        changePercent: parseFloat(item.JZZZL) || 0,
      }))
      .reverse();

    return {
      code,
      period,
      history,
    };
  } catch (error) {
    console.error(`Error fetching history for ${code}:`, error);
    return {
      code,
      period,
      history: [],
    };
  }
}

export async function getTradingDays(
  startDate: string,
  endDate: string,
): Promise<string[]> {
  try {
    const start = new Date(startDate);
    const today = new Date();
    const daysFromToday =
      Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
      1;

    const fundCode = "510300";
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
      .filter((date) => date >= startDate && date <= endDate)
      .sort();

    return tradingDays;
  } catch (error) {
    console.error("Error fetching trading days:", error);
    return [];
  }
}

const INDEX_LIST = [
  {
    code: "1.000001",
    name: "上证指数",
    market: "A" as const,
    sina: "s_sh000001",
  },
  {
    code: "0.399001",
    name: "深证成指",
    market: "A" as const,
    sina: "s_sz399001",
  },
  {
    code: "0.399006",
    name: "创业板指",
    market: "A" as const,
    sina: "s_sz399006",
  },
  {
    code: "1.000300",
    name: "沪深300",
    market: "A" as const,
    sina: "s_sh000300",
  },
  {
    code: "1.000905",
    name: "中证500",
    market: "A" as const,
    sina: "s_sh000905",
  },
  {
    code: "1.000688",
    name: "科创50",
    market: "A" as const,
    sina: "s_sh000688",
  },
  {
    code: "1.000016",
    name: "上证50",
    market: "A" as const,
    sina: "s_sh000016",
  },
  {
    code: "100.HSI",
    name: "恒生指数",
    market: "HK" as const,
    sina: "rt_hkHSI",
  },
  {
    code: "124.HSTECH",
    name: "恒生科技",
    market: "HK" as const,
    sina: "rt_hkHSTECH",
  },
  {
    code: "100.HSCEI",
    name: "国企指数",
    market: "HK" as const,
    sina: "rt_hkHSCEI",
  },
  { code: "100.NDX", name: "纳斯达克", market: "US" as const, sina: "gb_ndx" },
  { code: "100.DJIA", name: "道琼斯", market: "US" as const, sina: "gb_dji" },
  { code: "100.SPX", name: "标普500", market: "US" as const, sina: "gb_spx" },
];

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

function formatTime(date: Date): string {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface EastMoneyQuoteData {
  f2: number;
  f3: number;
  f4: number;
  f5: number;
  f6: number;
  f12: string;
  f14: string;
  f15: number;
  f16: number;
  f17: number;
}

interface EastMoneyBatchResponse {
  data: {
    diff: EastMoneyQuoteData[];
  };
}

export async function getMarketIndices(): Promise<MarketIndex[]> {
  try {
    const secids = INDEX_LIST.map((i) => i.code).join(",");
    const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=${secids}&fields=f2,f3,f4,f5,f6,f12,f14,f15,f16,f17&_=${Date.now()}`;

    const response = await jsonp<EastMoneyBatchResponse>(url, "cb");
    const dataList = response.data?.diff || [];

    const results: MarketIndex[] = [];

    for (const data of dataList) {
      const indexConfig = INDEX_LIST.find((i) => i.code.endsWith(data.f12));
      if (!indexConfig) continue;

      results.push({
        code: data.f12,
        name: indexConfig.name,
        current: data.f2 || 0,
        change: data.f4 || 0,
        changePercent: data.f3 || 0,
        open: data.f17 || 0,
        high: data.f15 || 0,
        low: data.f16 || 0,
        volume: data.f5 || 0,
        amount: data.f6 || 0,
        updateTime: formatTime(new Date()),
        market: indexConfig.market,
      });
    }

    return results;
  } catch (error) {
    console.error("Error fetching market indices:", error);
    return [];
  }
}

interface EastMoneyTrendResponse {
  data: {
    trends: string[];
    preClose: number;
  };
}

export async function getIndexTrend(code: string): Promise<IndexTrendData[]> {
  try {
    const fullCode = INDEX_CODE_MAP[code] || code;
    const [market, secId] = fullCode.split(".");
    const url = `https://push2.eastmoney.com/api/qt/stock/trends2/get?secid=${market}.${secId}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58&iscr=0&iscca=0&ndays=1&_=${Date.now()}`;

    const json = await jsonp<EastMoneyTrendResponse>(url, "cb");
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

const QQ_INDEX_MAP: Record<string, string> = {
  "000001": "sh000001",
  "399001": "sz399001",
  "399006": "sz399006",
  "000300": "sh000300",
  "000905": "sh000905",
  "000688": "sh000688",
  "000016": "sh000016",
  HSI: "hkHSI",
  HSTECH: "hkHSTECH",
  HSCEI: "hkHSCEI",
  NDX: "usNDX.OTC",
  DJIA: "usDJI.OTC",
  SPX: "usINX.OTC",
};

interface QQKlineResponse {
  code: number;
  data: {
    [key: string]: {
      day?: string[][];
      week?: string[][];
      month?: string[][];
    };
  };
}

export async function getIndexKline(
  code: string,
  period: string = "day",
): Promise<IndexKlineData[]> {
  try {
    const qqCode = QQ_INDEX_MAP[code];
    if (!qqCode) {
      console.error(`Unknown index code: ${code}`);
      return [];
    }

    const varName = `kline_${period}`;
    const url = `https://web.ifzq.gtimg.cn/appstock/app/kline/kline?param=${qqCode},${period},,,120&_var=${varName}`;

    return new Promise((resolve) => {
      const script = document.createElement("script");
      const timeout = setTimeout(() => {
        cleanup();
        resolve([]);
      }, 10000);

      function cleanup() {
        clearTimeout(timeout);
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      }

      script.src = url;
      script.onload = () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = (window as any)[varName] as QQKlineResponse;
          cleanup();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (window as any)[varName];

          if (!data || data.code !== 0) {
            resolve([]);
            return;
          }

          const stockData = data.data[qqCode];
          const klines = stockData?.[period as keyof typeof stockData] || [];

          const result = klines.map(
            (item: string[], index: number, arr: string[][]) => {
              const prevClose =
                index > 0 ? parseFloat(arr[index - 1][2]) : parseFloat(item[1]);
              const close = parseFloat(item[2]) || 0;
              const change = close - prevClose;
              const changePercent =
                prevClose > 0 ? (change / prevClose) * 100 : 0;

              return {
                date: item[0],
                open: parseFloat(item[1]) || 0,
                close,
                high: parseFloat(item[3]) || 0,
                low: parseFloat(item[4]) || 0,
                volume: parseFloat(item[5]) || 0,
                change,
                changePercent,
              };
            },
          );

          resolve(result);
        } catch {
          cleanup();
          resolve([]);
        }
      };
      script.onerror = () => {
        cleanup();
        resolve([]);
      };
      document.head.appendChild(script);
    });
  } catch (error) {
    console.error("Error fetching index kline:", error);
    return [];
  }
}

export async function getFundComparison(code: string) {
  return {
    code,
    comparisons: [],
    summary: {
      avgDeviationPercent: 0,
      totalDays: 0,
    },
  };
}

export async function getAllFunds(): Promise<Fund[]> {
  return [];
}

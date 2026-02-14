import { useState, useMemo, useEffect } from "react";
import { Calculator, Wallet, TrendingUp, X, Plus, Search } from "lucide-react";
import { Fund } from "../types/fund.js";
import { getTradingDays, searchFunds } from "../services/fundApi.js";

type CycleType = "day" | "week" | "month";

interface SelectedFund extends Fund {
  amount: number;
  cycle: CycleType;
  weekDay: number;
  monthDay: number;
  startDate: string;
  endDate: string;
}

interface FundResult {
  fund: SelectedFund;
  investment: number;
  count: number;
  tradingDays: number;
}

interface CalculationResult {
  totalInvestment: number;
  investmentCount: number;
  details: FundResult[];
}

interface DCAConfig {
  funds: SelectedFund[];
  globalStartDate: string;
  globalEndDate: string;
}

const STORAGE_KEY = "dca-config-v2";

function loadConfig(): DCAConfig | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    console.error("Failed to load DCA config from localStorage");
  }
  return null;
}

function saveConfig(config: DCAConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    console.error("Failed to save DCA config to localStorage");
  }
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().split("T")[0];
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function calculateInvestmentDays(
  tradingDays: string[],
  cycle: CycleType,
  weekDay: number,
  monthDay: number,
): string[] {
  if (cycle === "day") {
    return tradingDays;
  } else if (cycle === "week") {
    const weekMap = new Map<string, string>();
    tradingDays.forEach((day) => {
      const date = new Date(day);
      const dayOfWeek = date.getDay() || 7;
      const year = date.getFullYear();
      const week = getWeekNumber(date);
      const key = `${year}-${week}`;
      if (!weekMap.has(key)) {
        if (dayOfWeek >= weekDay) {
          weekMap.set(key, day);
        }
      } else {
        const existingDate = new Date(weekMap.get(key)!);
        const existingDayOfWeek = existingDate.getDay() || 7;
        if (dayOfWeek >= weekDay && dayOfWeek < existingDayOfWeek) {
          weekMap.set(key, day);
        }
        if (existingDayOfWeek < weekDay && dayOfWeek >= weekDay) {
          weekMap.set(key, day);
        }
      }
    });
    return Array.from(weekMap.values());
  } else {
    const monthMap = new Map<string, string>();
    tradingDays.forEach((day) => {
      const date = new Date(day);
      const dayOfMonth = date.getDate();
      const key = day.substring(0, 7);
      if (!monthMap.has(key)) {
        if (dayOfMonth >= monthDay) {
          monthMap.set(key, day);
        }
      } else {
        const existingDate = new Date(monthMap.get(key)!);
        const existingDayOfMonth = existingDate.getDate();
        if (dayOfMonth >= monthDay && dayOfMonth < existingDayOfMonth) {
          monthMap.set(key, day);
        }
        if (existingDayOfMonth < monthDay && dayOfMonth >= monthDay) {
          monthMap.set(key, day);
        }
      }
    });
    return Array.from(monthMap.values());
  }
}

function AddFundModal({
  onAdd,
  onClose,
  existingCodes,
}: {
  onAdd: (fund: Fund) => void;
  onClose: () => void;
  existingCodes: string[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Fund[]>([]);
  const [searching, setSearching] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [customName, setCustomName] = useState("");
  const [mode, setMode] = useState<"search" | "custom">("search");

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const funds = await searchFunds(query);
        setResults(funds);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleAddCustom = () => {
    if (!customCode.trim() || !customName.trim()) return;
    if (existingCodes.includes(customCode.trim())) return;
    onAdd({ code: customCode.trim(), name: customName.trim(), type: "" });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium text-gray-900">添加基金</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setMode("search")}
            className={`flex-1 py-2 text-sm font-medium ${mode === "search" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          >
            搜索基金
          </button>
          <button
            onClick={() => setMode("custom")}
            className={`flex-1 py-2 text-sm font-medium ${mode === "custom" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          >
            自定义输入
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          {mode === "search" ? (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索基金代码或名称..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                {searching && (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    搜索中...
                  </div>
                )}
                {!searching && query && results.length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    未找到相关基金
                  </div>
                )}
                {results.map((fund) => {
                  const isAdded = existingCodes.includes(fund.code);
                  return (
                    <div
                      key={fund.code}
                      onClick={() => !isAdded && (onAdd(fund), onClose())}
                      className={`flex items-center justify-between p-2 rounded-lg ${isAdded ? "bg-gray-50 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer"}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {fund.name}
                        </div>
                        <div className="text-xs text-gray-400">{fund.code}</div>
                      </div>
                      {isAdded && (
                        <span className="text-xs text-gray-400 ml-2">
                          已添加
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  基金代码
                </label>
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  placeholder="例如: 017730"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  基金名称
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="例如: 沪深300ETF"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {existingCodes.includes(customCode.trim()) &&
                customCode.trim() && (
                  <div className="text-xs text-red-500">该基金已添加</div>
                )}
              <button
                onClick={handleAddCustom}
                disabled={
                  !customCode.trim() ||
                  !customName.trim() ||
                  existingCodes.includes(customCode.trim())
                }
                className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                添加
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DCA() {
  const [selectedFunds, setSelectedFunds] = useState<SelectedFund[]>(() => {
    const config = loadConfig();
    return config?.funds || [];
  });
  const [globalStartDate, setGlobalStartDate] = useState(() => {
    const config = loadConfig();
    return config?.globalStartDate || getDefaultStartDate();
  });
  const [globalEndDate, setGlobalEndDate] = useState(() => {
    const config = loadConfig();
    return config?.globalEndDate || "";
  });
  const [tradingDaysCache, setTradingDaysCache] = useState<
    Map<string, string[]>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [calculated, setCalculated] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    saveConfig({ funds: selectedFunds, globalStartDate, globalEndDate });
  }, [selectedFunds, globalStartDate, globalEndDate]);

  const handleAddFund = (fund: Fund) => {
    if (selectedFunds.some((f) => f.code === fund.code)) {
      return;
    }
    setSelectedFunds([
      ...selectedFunds,
      {
        ...fund,
        amount: 100,
        cycle: "week",
        weekDay: 1,
        monthDay: 1,
        startDate: getDefaultStartDate(),
        endDate: "",
      },
    ]);
    setCalculated(false);
  };

  const handleRemoveFund = (code: string) => {
    setSelectedFunds(selectedFunds.filter((f) => f.code !== code));
    setCalculated(false);
  };

  const handleUpdateFund = (
    code: string,
    updates: Partial<
      Pick<
        SelectedFund,
        "amount" | "cycle" | "weekDay" | "monthDay" | "startDate" | "endDate"
      >
    >,
  ) => {
    setSelectedFunds(
      selectedFunds.map((f) => (f.code === code ? { ...f, ...updates } : f)),
    );
    setCalculated(false);
  };

  const handleCalculate = async () => {
    if (selectedFunds.length === 0) return;

    setLoading(true);
    try {
      const newCache = new Map<string, string[]>();
      const dateRanges = new Set<string>();
      const gEnd = globalEndDate || getTodayDate();

      selectedFunds.forEach((fund) => {
        const fundEnd = fund.endDate || getTodayDate();
        const effectiveStart =
          fund.startDate > globalStartDate ? fund.startDate : globalStartDate;
        const effectiveEnd = fundEnd < gEnd ? fundEnd : gEnd;
        if (effectiveStart <= effectiveEnd) {
          const key = `${effectiveStart}_${effectiveEnd}`;
          dateRanges.add(key);
        }
      });

      await Promise.all(
        Array.from(dateRanges).map(async (key) => {
          const [start, end] = key.split("_");
          const days = await getTradingDays(start, end);
          newCache.set(key, days);
        }),
      );

      setTradingDaysCache(newCache);
      setCalculated(true);
    } catch (error) {
      console.error("Failed to get trading days:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculationResult = useMemo<CalculationResult | null>(() => {
    if (!calculated || selectedFunds.length === 0) {
      return null;
    }

    const gEnd = globalEndDate || getTodayDate();

    const details: FundResult[] = selectedFunds.map((fund) => {
      const fundEnd = fund.endDate || getTodayDate();
      const effectiveStart =
        fund.startDate > globalStartDate ? fund.startDate : globalStartDate;
      const effectiveEnd = fundEnd < gEnd ? fundEnd : gEnd;

      if (effectiveStart > effectiveEnd) {
        return {
          fund,
          investment: 0,
          count: 0,
          tradingDays: 0,
        };
      }

      const key = `${effectiveStart}_${effectiveEnd}`;
      const tradingDays = tradingDaysCache.get(key) || [];
      const investmentDays = calculateInvestmentDays(
        tradingDays,
        fund.cycle,
        fund.weekDay,
        fund.monthDay,
      );

      return {
        fund,
        investment: investmentDays.length * fund.amount,
        count: investmentDays.length,
        tradingDays: tradingDays.length,
      };
    });

    const totalInvestment = details.reduce((sum, d) => sum + d.investment, 0);
    const investmentCount = details.reduce((sum, d) => sum + d.count, 0);

    return {
      totalInvestment,
      investmentCount,
      details,
    };
  }, [
    calculated,
    tradingDaysCache,
    selectedFunds,
    globalStartDate,
    globalEndDate,
  ]);

  const weekDayLabels = [
    "",
    "周一",
    "周二",
    "周三",
    "周四",
    "周五",
    "周六",
    "周日",
  ];

  const getCycleLabel = (fund: SelectedFund) => {
    switch (fund.cycle) {
      case "day":
        return "每日";
      case "week":
        return `每${weekDayLabels[fund.weekDay]}`;
      case "month":
        return `每月${fund.monthDay}号`;
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-500" />
          定投计算器
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            {selectedFunds.length > 0 ? (
              <div className="space-y-2">
                {selectedFunds.map((fund) => (
                  <div
                    key={fund.code}
                    className="border border-gray-100 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {fund.name}
                        </div>
                        <div className="text-xs text-gray-400 shrink-0">
                          {fund.code}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFund(fund.code)}
                        className="text-gray-300 hover:text-red-500 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-20 shrink-0">
                        <label className="block text-xs text-gray-400 mb-1">
                          周期
                        </label>
                        <select
                          value={fund.cycle}
                          onChange={(e) =>
                            handleUpdateFund(fund.code, {
                              cycle: e.target.value as CycleType,
                            })
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="day">每日</option>
                          <option value="week">每周</option>
                          <option value="month">每月</option>
                        </select>
                      </div>
                      {fund.cycle === "week" && (
                        <div className="w-16 shrink-0">
                          <label className="block text-xs text-gray-400 mb-1">
                            周几
                          </label>
                          <select
                            value={fund.weekDay}
                            onChange={(e) =>
                              handleUpdateFund(fund.code, {
                                weekDay: Number(e.target.value),
                              })
                            }
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value={1}>周一</option>
                            <option value={2}>周二</option>
                            <option value={3}>周三</option>
                            <option value={4}>周四</option>
                            <option value={5}>周五</option>
                          </select>
                        </div>
                      )}
                      {fund.cycle === "month" && (
                        <div className="w-16 shrink-0">
                          <label className="block text-xs text-gray-400 mb-1">
                            几号
                          </label>
                          <select
                            value={fund.monthDay}
                            onChange={(e) =>
                              handleUpdateFund(fund.code, {
                                monthDay: Number(e.target.value),
                              })
                            }
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {Array.from({ length: 28 }, (_, i) => i + 1).map(
                              (d) => (
                                <option key={d} value={d}>
                                  {d}号
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      )}
                      <div className="w-20 shrink-0">
                        <label className="block text-xs text-gray-400 mb-1">
                          金额
                        </label>
                        <input
                          type="number"
                          value={fund.amount}
                          onChange={(e) =>
                            handleUpdateFund(fund.code, {
                              amount: Math.max(0, Number(e.target.value)),
                            })
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="0"
                          step="10"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs text-gray-400 mb-1">
                          开始
                        </label>
                        <input
                          type="date"
                          value={fund.startDate}
                          onChange={(e) => {
                            handleUpdateFund(fund.code, {
                              startDate: e.target.value,
                            });
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs text-gray-400 mb-1">
                          结束
                        </label>
                        <input
                          type="date"
                          value={fund.endDate}
                          onChange={(e) => {
                            handleUpdateFund(fund.code, {
                              endDate: e.target.value,
                            });
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                暂无定投基金，点击下方按钮添加
              </div>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              添加基金
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <h3 className="font-medium text-gray-900 mb-3 text-sm">
              计算时间范围
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">开始</label>
                <input
                  type="date"
                  value={globalStartDate}
                  onChange={(e) => {
                    setGlobalStartDate(e.target.value);
                    setCalculated(false);
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">结束</label>
                <input
                  type="date"
                  value={globalEndDate}
                  onChange={(e) => {
                    setGlobalEndDate(e.target.value);
                    setCalculated(false);
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              onClick={handleCalculate}
              disabled={selectedFunds.length === 0 || loading}
              className="w-full py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "计算中..." : "计算投资支出"}
            </button>
          </div>

          {calculationResult && (
            <>
              <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                <h3 className="font-medium text-gray-900 mb-3 text-sm flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-blue-500" />
                  投资汇总
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                    <span className="text-gray-500">投资次数</span>
                    <span className="font-medium text-gray-900">
                      {calculationResult.investmentCount} 次
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-gray-500">总投资</span>
                    <span className="text-lg font-bold text-blue-600">
                      ¥{calculationResult.totalInvestment.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                <h3 className="font-medium text-gray-900 mb-3 text-sm flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  分项明细
                </h3>
                <div className="space-y-2">
                  {calculationResult.details.map(
                    ({ fund, investment, count, tradingDays }) => (
                      <div
                        key={fund.code}
                        className="p-2 bg-gray-50 rounded-lg text-sm"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate text-xs">
                              {fund.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {getCycleLabel(fund)}¥{fund.amount} ·{" "}
                              {fund.startDate.slice(5)}~
                              {fund.endDate ? fund.endDate.slice(5) : "至今"}
                            </div>
                          </div>
                          <span className="font-medium text-blue-600 ml-2">
                            ¥{investment.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {tradingDays}交易日 · {count}次投资
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </>
          )}

          {!calculationResult && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Calculator className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-gray-900 font-medium text-sm mb-1">
                等待计算
              </h3>
              <p className="text-gray-400 text-xs">
                添加基金并设置参数后，点击计算按钮
              </p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddFundModal
          onAdd={handleAddFund}
          onClose={() => setShowAddModal(false)}
          existingCodes={selectedFunds.map((f) => f.code)}
        />
      )}
    </main>
  );
}

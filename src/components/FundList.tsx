import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  X,
  BarChart3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit3,
} from "lucide-react";
import { FundEstimate } from "../types/fund.js";
import { useFundStore } from "../store/fundStore.js";

interface FundListProps {
  funds: FundEstimate[];
  onViewDetail?: (fund: FundEstimate) => void;
}

type SortField =
  | "name"
  | "changePercent"
  | "estimateNav"
  | "profit"
  | "yesterdayProfit"
  | "holdingAmount"
  | "totalProfit";
type SortOrder = "asc" | "desc";

export function FundList({ funds, onViewDetail }: FundListProps) {
  const { removeFromWatchlist, holdings, setHolding, setCostNav, getShares } =
    useFundStore();
  const [sortField, setSortField] = useState<SortField>("changePercent");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingCostCode, setEditingCostCode] = useState<string | null>(null);
  const [costValue, setCostValue] = useState("");

  const getProfit = (fund: FundEstimate) => {
    const shares = getShares(fund.code);
    if (shares <= 0 || fund.estimateNav <= 0 || fund.lastNav <= 0) return 0;
    return shares * (fund.estimateNav - fund.lastNav);
  };

  const getYesterdayProfit = (fund: FundEstimate) => {
    const shares = getShares(fund.code);
    if (shares <= 0 || fund.lastNav <= 0 || fund.prevNav <= 0) return 0;
    return shares * (fund.lastNav - fund.prevNav);
  };

  const getHoldingAmount = (fund: FundEstimate) => {
    const shares = getShares(fund.code);
    if (shares <= 0 || fund.lastNav <= 0) return 0;
    return shares * fund.lastNav;
  };

  const getTotalProfit = (fund: FundEstimate, costNav: number) => {
    const shares = getShares(fund.code);
    if (shares <= 0 || fund.lastNav <= 0 || costNav <= 0) return 0;
    return shares * (fund.lastNav - costNav);
  };

  const getTotalProfitForSort = (fund: FundEstimate) => {
    const holding = holdings.get(fund.code);
    const costNav = holding?.costNav || 0;
    return getTotalProfit(fund, costNav);
  };

  const saveCostFromProfit = (code: string, lastNav: number) => {
    const totalProfitInput = parseFloat(costValue);
    const shares = getShares(code);
    if (!isNaN(totalProfitInput) && shares > 0 && lastNav > 0) {
      const costNav = parseFloat(
        (lastNav - totalProfitInput / shares).toFixed(10),
      );
      if (costNav > 0) {
        setCostNav(code, costNav);
      }
    }
    setEditingCostCode(null);
    setCostValue("");
  };

  const handleCostKeyDown = (
    e: React.KeyboardEvent,
    code: string,
    lastNav: number,
  ) => {
    if (e.key === "Enter") {
      saveCostFromProfit(code, lastNav);
    } else if (e.key === "Escape") {
      setEditingCostCode(null);
      setCostValue("");
    }
  };

  const sortedFunds = useMemo(() => {
    return [...funds].sort((a, b) => {
      const aFailed = a.name === "--";
      const bFailed = b.name === "--";
      if (aFailed && !bFailed) return 1;
      if (!aFailed && bFailed) return -1;

      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "changePercent":
          comparison = a.changePercent - b.changePercent;
          break;
        case "estimateNav":
          comparison = a.estimateNav - b.estimateNav;
          break;
        case "profit":
          comparison = getProfit(a) - getProfit(b);
          break;
        case "yesterdayProfit":
          comparison = getYesterdayProfit(a) - getYesterdayProfit(b);
          break;
        case "holdingAmount":
          comparison = getHoldingAmount(a) - getHoldingAmount(b);
          break;
        case "totalProfit":
          comparison = getTotalProfitForSort(a) - getTotalProfitForSort(b);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funds, sortField, sortOrder, holdings]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(
        field === "changePercent" ||
          field === "profit" ||
          field === "yesterdayProfit" ||
          field === "holdingAmount" ||
          field === "totalProfit"
          ? "desc"
          : "asc",
      );
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-4 h-4 text-blue-500" />
    ) : (
      <ArrowDown className="w-4 h-4 text-blue-500" />
    );
  };

  const startEdit = (code: string, currentShares: number) => {
    setEditValue(currentShares > 0 ? currentShares.toString() : "");
    setEditingCode(code);
  };

  const saveEdit = () => {
    if (editingCode) {
      const value = parseFloat(editValue) || 0;
      setHolding(editingCode, value);
      setEditingCode(null);
      setEditValue("");
    }
  };

  const cancelEdit = () => {
    setEditingCode(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  if (funds.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => handleSort("name")}
                className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                基金名称
                <SortIcon field="name" />
              </button>
            </th>
            <th className="px-4 py-3 text-right">
              <button
                onClick={() => handleSort("changePercent")}
                className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 ml-auto"
              >
                估算涨幅
                <SortIcon field="changePercent" />
              </button>
            </th>
            <th className="px-4 py-3 text-right">
              <button
                onClick={() => handleSort("profit")}
                className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 ml-auto"
              >
                估算收益
                <SortIcon field="profit" />
              </button>
            </th>
            <th className="px-4 py-3 text-right">
              <button
                onClick={() => handleSort("yesterdayProfit")}
                className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 ml-auto"
              >
                昨日收益
                <SortIcon field="yesterdayProfit" />
              </button>
            </th>
            <th className="px-4 py-3 text-right">
              <button
                onClick={() => handleSort("totalProfit")}
                className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 ml-auto"
              >
                持仓收益
                <SortIcon field="totalProfit" />
              </button>
            </th>
            <th className="px-4 py-3 text-right">
              <button
                onClick={() => handleSort("holdingAmount")}
                className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 ml-auto"
              >
                持有金额
                <SortIcon field="holdingAmount" />
              </button>
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
              最新净值
            </th>
            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sortedFunds.map((fund) => {
            const updatedToday = fund.navUpdatedToday;
            const isPositive = fund.changePercent >= 0;
            const hasData = fund.estimateNav > 0;
            const isFailed = fund.name === "--";
            const holding = holdings.get(fund.code);
            const shares = holding?.shares || 0;
            const holdingAmount =
              shares > 0 && fund.lastNav > 0 ? shares * fund.lastNav : 0;
            const profit = getProfit(fund);
            const isProfitPositive = profit >= 0;
            const isLastChangePositive = fund.lastChangePercent >= 0;

            return (
              <tr
                key={fund.code}
                className={`transition-colors ${isFailed ? "bg-gray-100" : "hover:bg-gray-50"}`}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span
                      className="font-medium text-gray-900 truncate max-w-[280px]"
                      title={fund.name}
                    >
                      {fund.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {updatedToday && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded">
                          已更新
                        </span>
                      )}
                      <span className="text-xs text-gray-500">{fund.code}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end">
                    {hasData ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${
                          isPositive
                            ? "bg-red-50 text-red-600"
                            : "bg-green-50 text-green-600"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        {isPositive ? "+" : ""}
                        {fund.changePercent.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                    <span className="text-xs text-gray-500 mt-0.5">
                      {hasData ? fund.estimateNav.toFixed(4) : ""}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {shares > 0 && hasData ? (
                    <span
                      className={`font-medium ${isProfitPositive ? "text-red-600" : "text-green-600"}`}
                    >
                      {isProfitPositive ? "+" : ""}
                      {profit.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {(() => {
                    const yesterdayProfit = getYesterdayProfit(fund);
                    const isYesterdayProfitPositive = yesterdayProfit >= 0;
                    return (
                      <div className="flex flex-col items-end">
                        {shares > 0 ? (
                          <span
                            className={`text-sm font-medium ${isYesterdayProfitPositive ? "text-red-600" : "text-green-600"}`}
                          >
                            {isYesterdayProfitPositive ? "+" : ""}
                            {yesterdayProfit.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                        <span
                          className={`text-xs mt-0.5 ${
                            isLastChangePositive
                              ? "text-red-500"
                              : "text-green-500"
                          }`}
                        >
                          {isLastChangePositive ? "+" : ""}
                          {fund.lastChangePercent.toFixed(2)}%
                        </span>
                      </div>
                    );
                  })()}
                </td>
                <td className="px-4 py-3 text-right">
                  {(() => {
                    const costNav = holding?.costNav || 0;
                    const totalProfit = getTotalProfit(fund, costNav);
                    const isTotalProfitPositive = totalProfit >= 0;
                    if (editingCostCode === fund.code) {
                      return (
                        <input
                          type="number"
                          value={costValue}
                          onChange={(e) => setCostValue(e.target.value)}
                          onBlur={() =>
                            saveCostFromProfit(fund.code, fund.lastNav)
                          }
                          onKeyDown={(e) =>
                            handleCostKeyDown(e, fund.code, fund.lastNav)
                          }
                          className="w-24 px-2 py-1 text-right text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                          placeholder="累计收益"
                        />
                      );
                    }
                    if (shares > 0 && costNav > 0) {
                      return (
                        <div className="flex flex-col items-end">
                          <button
                            onClick={() => {
                              setEditingCostCode(fund.code);
                              setCostValue(totalProfit.toFixed(2));
                            }}
                            className={`font-medium hover:underline ${isTotalProfitPositive ? "text-red-600" : "text-green-600"}`}
                          >
                            {isTotalProfitPositive ? "+" : ""}
                            {totalProfit.toFixed(2)}
                          </button>
                          <span className="text-xs text-gray-400 mt-0.5">
                            成本:{costNav.toFixed(4)}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <button
                        onClick={() => {
                          setEditingCostCode(fund.code);
                          setCostValue("");
                        }}
                        className="text-gray-400 hover:text-blue-600 text-sm"
                      >
                        设置收益
                      </button>
                    );
                  })()}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingCode === fund.code ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={handleKeyDown}
                      className="w-24 px-2 py-1 text-right text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      placeholder="份额"
                    />
                  ) : holdingAmount > 0 ? (
                    <div className="flex flex-col items-end">
                      <span className="text-sm text-blue-600 font-medium">
                        {holdingAmount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => startEdit(fund.code, shares)}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 mt-0.5"
                      >
                        {shares.toFixed(2)}份
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(fund.code, 0)}
                      className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-blue-600"
                    >
                      -
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-gray-700">
                    {fund.lastNav.toFixed(4)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {onViewDetail && (
                      <button
                        onClick={() => onViewDetail(fund)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="查看详情"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => removeFromWatchlist(fund.code)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="移除自选"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import { useState, useEffect, useRef, useMemo } from "react";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  PieChart,
  Wallet,
  Download,
  Upload,
  Banknote,
} from "lucide-react";
import { FundSearch } from "../components/FundSearch.js";
import { FundList } from "../components/FundList.js";
import { FundDetail } from "../components/FundDetail.js";
import { GroupTabs } from "../components/GroupTabs.js";
import { useWatchlistEstimates } from "../hooks/useFundData.js";
import { useFundStore } from "../store/fundStore.js";
import { FundEstimate } from "../types/fund.js";

export default function Home() {
  const { watchlist, estimates, loading, error, refresh } =
    useWatchlistEstimates(60000);
  const groups = useFundStore((state) => state.groups);
  const activeGroupId = useFundStore((state) => state.activeGroupId);
  const getHolding = useFundStore((state) => state.getHolding);
  const exportData = useFundStore((state) => state.exportData);
  const importData = useFundStore((state) => state.importData);
  const [selectedFund, setSelectedFund] = useState<FundEstimate | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const prevLoadingRef = useRef(loading);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prevLoadingRef.current && !loading && estimates.length > 0) {
      setLastUpdate(new Date());
    }
    prevLoadingRef.current = loading;
  }, [loading, estimates.length]);

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const activeGroupFunds = activeGroup?.funds || [];

  const filteredEstimates = useMemo(() => {
    return estimates.filter((e) => activeGroupFunds.includes(e.code));
  }, [estimates, activeGroupFunds]);

  const getTotalProfit = () => {
    return filteredEstimates.reduce((sum, fund) => {
      const holding = getHolding(activeGroupId, fund.code);
      if (!holding || fund.estimateNav <= 0 || fund.lastNav <= 0) return sum;
      const shares = holding.shares;
      if (shares <= 0) return sum;
      return sum + shares * (fund.estimateNav - fund.lastNav);
    }, 0);
  };

  const getTotalAmount = () => {
    return filteredEstimates.reduce((sum, fund) => {
      const holding = getHolding(activeGroupId, fund.code);
      if (!holding || fund.lastNav <= 0) return sum;
      const shares = holding.shares;
      if (shares <= 0) return sum;
      return sum + shares * fund.lastNav;
    }, 0);
  };

  const totalProfit = getTotalProfit();
  const totalAmount = getTotalAmount();

  const stats = {
    total: filteredEstimates.length,
    up: filteredEstimates.filter((e) => e.changePercent > 0).length,
    down: filteredEstimates.filter((e) => e.changePercent < 0).length,
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fund-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const success = importData(data);
        if (success) {
          refresh();
        } else {
          alert("导入失败：数据格式不正确");
        }
      } catch {
        alert("导入失败：文件解析错误");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <FundSearch />
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm text-gray-500 hidden sm:inline">
            更新: {lastUpdate.toLocaleTimeString("zh-CN")}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            title="导入数据"
          >
            <Upload className="w-5 h-5" />
          </button>
          <button
            onClick={handleExport}
            disabled={watchlist.length === 0}
            className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            title="导出数据"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            title="刷新数据"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <GroupTabs />

      {filteredEstimates.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">总金额</div>
            <div className="text-2xl font-bold text-blue-600 flex items-center gap-1">
              <Banknote className="w-5 h-5" />
              {totalAmount.toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">上涨</div>
            <div className="text-2xl font-bold text-red-500 flex items-center gap-1">
              <TrendingUp className="w-5 h-5" />
              {stats.up}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">下跌</div>
            <div className="text-2xl font-bold text-green-500 flex items-center gap-1">
              <TrendingDown className="w-5 h-5" />
              {stats.down}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">今日估算收益</div>
            <div
              className={`text-2xl font-bold flex items-center gap-1 ${totalProfit >= 0 ? "text-red-500" : "text-green-500"}`}
            >
              <Wallet className="w-5 h-5" />
              {totalProfit >= 0 ? "+" : ""}
              {totalProfit.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

      {activeGroupFunds.length === 0 && (
        <div className="text-center py-16">
          <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <PieChart className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            当前分组暂无基金
          </h3>
          <p className="text-gray-500 mb-6">在上方搜索框中添加您关注的基金</p>
        </div>
      )}

      {filteredEstimates.length > 0 && (
        <FundList
          funds={filteredEstimates}
          groupId={activeGroupId}
          onViewDetail={(fund) => setSelectedFund(fund)}
        />
      )}

      {loading && estimates.length === 0 && (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      )}

      {selectedFund && (
        <FundDetail
          code={selectedFund.code}
          name={selectedFund.name}
          onClose={() => setSelectedFund(null)}
        />
      )}
    </main>
  );
}

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { getMarketIndices } from "../services/fundApi.js";
import { MarketIndex } from "../types/fund.js";
import { IndexDetail } from "../components/IndexDetail.js";

function IndexCard({
  index,
  onClick,
}: {
  index: MarketIndex;
  onClick: () => void;
}) {
  const isUp = index.changePercent > 0;
  const isDown = index.changePercent < 0;

  return (
    <div
      className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900 text-sm truncate">
          {index.name}
        </h3>
      </div>
      <div
        className={`text-xl font-bold ${isUp ? "text-red-500" : isDown ? "text-green-500" : "text-gray-900"}`}
      >
        {index.current.toFixed(2)}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span
          className={`text-xs font-medium ${isUp ? "text-red-500" : isDown ? "text-green-500" : "text-gray-500"}`}
        >
          {isUp ? "+" : ""}
          {index.change.toFixed(2)}
        </span>
        <span
          className={`text-xs font-medium flex items-center gap-0.5 ${isUp ? "text-red-500" : isDown ? "text-green-500" : "text-gray-500"}`}
        >
          {isUp ? (
            <TrendingUp className="w-3 h-3" />
          ) : isDown ? (
            <TrendingDown className="w-3 h-3" />
          ) : null}
          {isUp ? "+" : ""}
          {index.changePercent.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

function MarketSection({
  title,
  indices,
  onIndexClick,
}: {
  title: string;
  indices: MarketIndex[];
  onIndexClick: (index: MarketIndex) => void;
}) {
  if (indices.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold text-gray-700 mb-3">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {indices.map((index) => (
          <IndexCard
            key={index.code}
            index={index}
            onClick={() => onIndexClick(index)}
          />
        ))}
      </div>
    </div>
  );
}

export default function Market() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedIndex, setSelectedIndex] = useState<MarketIndex | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMarketIndices();
      setIndices(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取数据失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const aIndices = indices.filter((i) => i.market === "A");
  const hkIndices = indices.filter((i) => i.market === "HK");
  const usIndices = indices.filter((i) => i.market === "US");

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400">
          更新: {lastUpdate.toLocaleTimeString("zh-CN")}
        </span>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-1.5 text-gray-500 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
          title="刷新数据"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {loading && indices.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">加载中...</p>
        </div>
      ) : indices.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-1">暂无数据</h3>
          <p className="text-gray-500 text-sm">无法获取市场数据</p>
        </div>
      ) : (
        <>
          <MarketSection
            title="A股"
            indices={aIndices}
            onIndexClick={setSelectedIndex}
          />
          <MarketSection
            title="港股"
            indices={hkIndices}
            onIndexClick={setSelectedIndex}
          />
          <MarketSection
            title="美股"
            indices={usIndices}
            onIndexClick={setSelectedIndex}
          />
        </>
      )}

      {selectedIndex && (
        <IndexDetail
          index={selectedIndex}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </main>
  );
}

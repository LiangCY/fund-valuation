import { useState, useEffect, useCallback } from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Bar,
} from "recharts";
import { MarketIndex, IndexTrendData, IndexKlineData } from "../types/fund.js";
import { getIndexTrend, getIndexKline } from "../services/fundApi.js";

interface IndexDetailProps {
  index: MarketIndex;
  onClose: () => void;
}

type ChartType = "trend" | "kline";
type KlinePeriod = "day" | "week" | "month";

export function IndexDetail({ index, onClose }: IndexDetailProps) {
  const [chartType, setChartType] = useState<ChartType>("trend");
  const [klinePeriod, setKlinePeriod] = useState<KlinePeriod>("day");
  const [trendData, setTrendData] = useState<IndexTrendData[]>([]);
  const [klineData, setKlineData] = useState<IndexKlineData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrendData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getIndexTrend(index.code);
      setTrendData(data);
    } catch (error) {
      console.error("Failed to fetch trend data:", error);
    } finally {
      setLoading(false);
    }
  }, [index.code]);

  const fetchKlineData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getIndexKline(index.code, klinePeriod);
      setKlineData(data);
    } catch (error) {
      console.error("Failed to fetch kline data:", error);
    } finally {
      setLoading(false);
    }
  }, [index.code, klinePeriod]);

  useEffect(() => {
    if (chartType === "trend") {
      fetchTrendData();
    } else {
      fetchKlineData();
    }
  }, [chartType, fetchTrendData, fetchKlineData]);

  const isUp = index.changePercent > 0;
  const isDown = index.changePercent < 0;
  const color = isUp ? "#ef4444" : isDown ? "#22c55e" : "#6b7280";

  const formatTime = (time: string) => {
    if (!time) return "";
    const parts = time.split(" ");
    return parts[1]?.substring(0, 5) || time;
  };

  const trendChartData = trendData.map((item) => ({
    ...item,
    formattedTime: formatTime(item.time),
  }));

  const preClose = trendData.length > 0 ? trendData[0].price - trendData[0].change : index.current - index.change;

  const trendYDomain: [number, number] | undefined =
    trendChartData.length > 0
      ? [
          Math.min(preClose, ...trendChartData.map((d) => d.price)) * 0.998,
          Math.max(preClose, ...trendChartData.map((d) => d.price)) * 1.002,
        ]
      : undefined;

  const klineChartData = klineData.slice(-60).map((item) => ({
    ...item,
    formattedDate: item.date.substring(5),
    isUp: item.close >= item.open,
  }));

  const klineYDomain: [number, number] | undefined =
    klineChartData.length > 0
      ? [
          Math.min(...klineChartData.map((d) => d.low)) * 0.995,
          Math.max(...klineChartData.map((d) => d.high)) * 1.005,
        ]
      : undefined;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{index.name}</h2>
              <span className="text-sm text-gray-500">{index.code}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${isUp ? "text-red-500" : isDown ? "text-green-500" : "text-gray-900"}`}>
                {index.current.toFixed(2)}
              </span>
              <div className="flex flex-col">
                <span className={`text-sm font-medium ${isUp ? "text-red-500" : isDown ? "text-green-500" : "text-gray-500"}`}>
                  {isUp ? "+" : ""}{index.change.toFixed(2)}
                </span>
                <span className={`text-sm font-medium flex items-center gap-0.5 ${isUp ? "text-red-500" : isDown ? "text-green-500" : "text-gray-500"}`}>
                  {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : null}
                  {isUp ? "+" : ""}{index.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">今开</div>
              <div className="text-lg font-bold text-gray-900">{index.open.toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">最高</div>
              <div className="text-lg font-bold text-red-500">{index.high.toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">最低</div>
              <div className="text-lg font-bold text-green-500">{index.low.toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">成交额</div>
              <div className="text-lg font-bold text-gray-900">
                {index.amount >= 100000000
                  ? `${(index.amount / 100000000).toFixed(0)}亿`
                  : `${(index.amount / 10000).toFixed(0)}万`}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setChartType("trend")}
                  className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
                    chartType === "trend"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  分时
                </button>
                <button
                  onClick={() => setChartType("kline")}
                  className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
                    chartType === "kline"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  K线
                </button>
              </div>
              {chartType === "kline" && (
                <div className="flex gap-1">
                  {(["day", "week", "month"] as KlinePeriod[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setKlinePeriod(p)}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        klinePeriod === p
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {p === "day" ? "日K" : p === "week" ? "周K" : "月K"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loading ? (
              <div className="h-72 flex items-center justify-center text-gray-400">
                加载中...
              </div>
            ) : chartType === "trend" ? (
              trendChartData.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-gray-400">
                  暂无分时数据
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="formattedTime"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e5e7eb" }}
                        minTickGap={40}
                      />
                      <YAxis
                        domain={trendYDomain}
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e5e7eb" }}
                        tickFormatter={(value) => value.toFixed(0)}
                        width={55}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === "avgPrice") return [value.toFixed(2), "均价"];
                          if (name === "changePercent") return [`${value >= 0 ? "+" : ""}${value.toFixed(2)}%`, "涨跌幅"];
                          return [value.toFixed(2), "价格"];
                        }}
                        labelFormatter={(label) => `时间: ${label}`}
                      />
                      <ReferenceLine y={preClose} stroke="#9ca3af" strokeDasharray="3 3" />
                      <Line
                        type="monotone"
                        dataKey="price"
                        name="price"
                        stroke={color}
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )
            ) : klineChartData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-gray-400">
                暂无K线数据
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={klineChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="formattedDate"
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                      minTickGap={30}
                    />
                    <YAxis
                      domain={klineYDomain}
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                      tickFormatter={(value) => value.toFixed(0)}
                      width={55}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          open: "开盘",
                          close: "收盘",
                          high: "最高",
                          low: "最低",
                          changePercent: "涨跌幅",
                        };
                        if (name === "changePercent") {
                          return [`${value >= 0 ? "+" : ""}${value.toFixed(2)}%`, labels[name] || name];
                        }
                        return [value.toFixed(2), labels[name] || name];
                      }}
                      labelFormatter={(label) => `日期: ${label}`}
                    />
                    <Bar
                      dataKey="close"
                      name="close"
                      fill="#3b82f6"
                      shape={(props) => {
                        const { x = 0, width = 0, payload } = props as { x?: number; width?: number; payload?: { open: number; close: number; high: number; low: number; isUp: boolean } };
                        if (!payload) return <g />;
                        const { open, close, high, low, isUp } = payload;
                        const yScale = (klineYDomain![1] - klineYDomain![0]) / 280;
                        const candleColor = isUp ? "#ef4444" : "#22c55e";
                        const bodyTop = Math.max(open, close);
                        const bodyBottom = Math.min(open, close);
                        const bodyY = 5 + (klineYDomain![1] - bodyTop) / yScale;
                        const bodyHeight = Math.max(1, (bodyTop - bodyBottom) / yScale);
                        const wickX = x + width / 2;
                        const highY = 5 + (klineYDomain![1] - high) / yScale;
                        const lowY = 5 + (klineYDomain![1] - low) / yScale;

                        return (
                          <g>
                            <line x1={wickX} y1={highY} x2={wickX} y2={lowY} stroke={candleColor} strokeWidth={1} />
                            <rect x={x + 1} y={bodyY} width={width - 2} height={bodyHeight} fill={candleColor} />
                          </g>
                        );
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

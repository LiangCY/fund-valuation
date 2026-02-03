import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useFundHistory } from '../hooks/useFundData.js';

interface FundChartProps {
  code: string;
}

const periods = [
  { key: '1w', label: '周' },
  { key: '1m', label: '月' },
  { key: '3m', label: '季' },
  { key: '6m', label: '半年' },
  { key: '1y', label: '年' },
];

export function FundChart({ code }: FundChartProps) {
  const [period, setPeriod] = useState('1m');
  const { data, loading } = useFundHistory(code, period);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const chartData = data.map((item) => ({
    ...item,
    formattedDate: formatDate(item.date),
  }));

  const yDomain: [number, number] | undefined = chartData.length > 0
    ? [
        Math.min(...chartData.map(d => d.nav)) * 0.995,
        Math.max(...chartData.map(d => d.nav)) * 1.005,
      ]
    : undefined;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">历史走势</h3>
        <div className="flex gap-1">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                period === p.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400">
          加载中...
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-400">
          暂无数据
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height={256}>
            <LineChart 
              data={chartData} 
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                minTickGap={30}
              />
              <YAxis
                domain={yDomain}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) => value.toFixed(4)}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'changePercent') {
                    return [`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, '日涨幅'];
                  }
                  return [value.toFixed(4), '单位净值'];
                }}
                labelFormatter={(label) => `日期: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="nav"
                name="nav"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

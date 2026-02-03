import { TrendingUp, TrendingDown, X, BarChart3 } from 'lucide-react';
import { FundEstimate } from '../types/fund.js';
import { useFundStore } from '../store/fundStore.js';

interface FundCardProps {
  fund: FundEstimate;
  onViewDetail?: (code: string) => void;
  showRemove?: boolean;
}

export function FundCard({ fund, onViewDetail, showRemove = true }: FundCardProps) {
  const { removeFromWatchlist } = useFundStore();
  const hasData = fund.estimateNav > 0;
  const isPositive = fund.changePercent >= 0;
  const colorClass = isPositive ? 'text-red-500' : 'text-green-500';
  const bgClass = isPositive ? 'bg-red-50' : 'bg-green-50';

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatNav = (nav: number) => {
    return hasData ? nav.toFixed(4) : '-';
  };

  const formatPercent = (percent: number) => {
    if (!hasData) return '-';
    return `${isPositive ? '+' : ''}${percent.toFixed(2)}%`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate" title={fund.name}>
            {fund.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">{fund.code}</span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
              {fund.market}
            </span>
            <span className="text-xs px-2 py-0.5 bg-blue-50 rounded-full text-blue-600">
              {fund.type}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {showRemove && (
            <button
              onClick={() => removeFromWatchlist(fund.code)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="移除自选"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {onViewDetail && (
            <button
              onClick={() => onViewDetail(fund.code)}
              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
              title="查看详情"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-sm text-gray-500 mb-1">实时估值</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatNav(fund.estimateNav)}
          </div>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ${hasData ? bgClass : 'bg-gray-50'} ${hasData ? colorClass : 'text-gray-400'}`}>
            {hasData && (isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            ))}
            <span className="font-semibold">
              {formatPercent(fund.changePercent)}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            更新时间: {formatTime(fund.estimateTime)}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm">
        <span className="text-gray-500">昨日净值</span>
        <span className="font-medium text-gray-700">{formatNav(fund.lastNav)}</span>
      </div>
    </div>
  );
}

import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { FundChart } from './FundChart.js';
import { useFundHistory } from '../hooks/useFundData.js';

interface FundDetailProps {
  code: string;
  name: string;
  onClose: () => void;
}

export function FundDetail({ code, name, onClose }: FundDetailProps) {
  const { data, loading } = useFundHistory(code, '1m');

  const stats = data.length > 0 ? {
    latestNav: data[data.length - 1]?.nav || 0,
    maxNav: Math.max(...data.map(d => d.nav)),
    minNav: Math.min(...data.map(d => d.nav)),
    avgChange: data.reduce((sum, d) => sum + d.changePercent, 0) / data.length,
  } : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{name}</h2>
            <span className="text-sm text-gray-500">{code}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {stats && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-500 mb-1">最新净值</div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.latestNav.toFixed(4)}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-500 mb-1">最高净值</div>
                <div className="text-2xl font-bold text-red-500">
                  {stats.maxNav.toFixed(4)}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-500 mb-1">最低净值</div>
                <div className="text-2xl font-bold text-green-500">
                  {stats.minNav.toFixed(4)}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-500 mb-1">平均日涨幅</div>
                <div className={`text-2xl font-bold ${stats.avgChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {stats.avgChange >= 0 ? '+' : ''}{stats.avgChange.toFixed(2)}%
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <FundChart code={code} />
          </div>

          {data.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <h3 className="font-semibold text-gray-900 px-4 py-3 border-b border-gray-100">
                历史净值明细
              </h3>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-600 font-medium">日期</th>
                      <th className="px-4 py-2 text-right text-gray-600 font-medium">单位净值</th>
                      <th className="px-4 py-2 text-right text-gray-600 font-medium">日涨幅</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice().reverse().map((item, index) => (
                      <tr key={index} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-2 text-gray-900">{item.date}</td>
                        <td className="px-4 py-2 text-right font-medium">{item.nav.toFixed(4)}</td>
                        <td className="px-4 py-2 text-right">
                          <span className={`inline-flex items-center gap-1 ${
                            item.changePercent >= 0 ? 'text-red-500' : 'text-green-500'
                          }`}>
                            {item.changePercent >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {item.changePercent >= 0 ? '+' : ''}
                            {item.changePercent.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center py-8 text-gray-400">加载中...</div>
          )}
        </div>
      </div>
    </div>
  );
}

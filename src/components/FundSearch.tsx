import { useState } from 'react';
import { Search, Plus, Loader2 } from 'lucide-react';
import { useFundSearch } from '../hooks/useFundData.js';
import { useFundStore } from '../store/fundStore.js';
import { Fund } from '../types/fund.js';

interface FundSearchProps {
  onSelect?: (fund: Fund) => void;
}

export function FundSearch({ onSelect }: FundSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { results, loading } = useFundSearch(query);
  const { addToWatchlist, watchlist } = useFundStore();

  const handleSelect = (fund: Fund) => {
    if (onSelect) {
      onSelect(fund);
    } else {
      addToWatchlist(fund.code);
    }
    setQuery('');
    setIsOpen(false);
  };

  const isInWatchlist = (code: string) => watchlist.includes(code);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="搜索基金代码或名称..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
        )}
      </div>

      {isOpen && (query.trim() || results.length > 0) && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 max-h-80 overflow-y-auto z-20">
            {results.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {query.trim() ? '未找到相关基金' : '输入关键词搜索基金'}
              </div>
            ) : (
              <div className="py-2">
                {results.map((fund) => (
                  <div
                    key={fund.code}
                    onClick={() => handleSelect(fund)}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {fund.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm text-gray-500">{fund.code}</span>
                        {fund.type && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-50 rounded text-blue-600">
                            {fund.type}
                          </span>
                        )}
                      </div>
                    </div>
                    {isInWatchlist(fund.code) ? (
                      <span className="text-xs text-gray-400 ml-2">已添加</span>
                    ) : (
                      <button className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors ml-2">
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

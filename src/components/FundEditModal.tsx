import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { FundEstimate } from "../types/fund.js";
import { useFundStore } from "../store/fundStore.js";

interface FundEditModalProps {
  fund: FundEstimate;
  groupId: string;
  onClose: () => void;
}

type InputMode = "shares" | "amount";

export function FundEditModal({ fund, groupId, onClose }: FundEditModalProps) {
  const { getHolding, setHolding, setCostNav, getShares } = useFundStore();
  const holding = getHolding(groupId, fund.code);
  const currentShares = holding?.shares || 0;
  const currentCostNav = holding?.costNav || 0;

  const [inputMode, setInputMode] = useState<InputMode>("shares");
  const [sharesValue, setSharesValue] = useState(
    currentShares > 0 ? currentShares.toString() : "",
  );
  const [amountValue, setAmountValue] = useState(
    currentShares > 0 && fund.lastNav > 0
      ? (currentShares * fund.lastNav).toFixed(2)
      : "",
  );
  const [profitValue, setProfitValue] = useState(() => {
    if (currentShares > 0 && currentCostNav > 0 && fund.lastNav > 0) {
      return (currentShares * (fund.lastNav - currentCostNav)).toFixed(2);
    }
    return "";
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSharesChange = (value: string) => {
    setSharesValue(value);
    const shares = parseFloat(value);
    if (!isNaN(shares) && shares > 0 && fund.lastNav > 0) {
      setAmountValue((shares * fund.lastNav).toFixed(2));
    } else {
      setAmountValue("");
    }
  };

  const handleAmountChange = (value: string) => {
    setAmountValue(value);
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount > 0 && fund.lastNav > 0) {
      setSharesValue((amount / fund.lastNav).toFixed(2));
    } else {
      setSharesValue("");
    }
  };

  const handleSave = () => {
    const shares = parseFloat(sharesValue);
    if (!isNaN(shares) && shares >= 0) {
      setHolding(groupId, fund.code, shares);

      const profit = parseFloat(profitValue);
      if (!isNaN(profit) && shares > 0 && fund.lastNav > 0) {
        const costNav = parseFloat(
          (fund.lastNav - profit / shares).toFixed(10),
        );
        if (costNav > 0) {
          setCostNav(groupId, fund.code, costNav);
        }
      }
    }
    onClose();
  };

  const currentAmount =
    currentShares > 0 && fund.lastNav > 0
      ? (currentShares * fund.lastNav).toFixed(2)
      : "-";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{fund.name}</h3>
            <p className="text-sm text-gray-500">{fund.code}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">最新净值</span>
            <span className="font-medium text-gray-900">
              {fund.lastNav.toFixed(4)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">当前持有</span>
            <span className="font-medium text-gray-900">
              {currentShares > 0
                ? `${currentShares.toFixed(2)}份 (¥${currentAmount})`
                : "-"}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                修改持仓
              </label>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setInputMode("shares")}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    inputMode === "shares"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  份额
                </button>
                <button
                  onClick={() => setInputMode("amount")}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    inputMode === "amount"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  金额
                </button>
              </div>
            </div>

            {inputMode === "shares" ? (
              <div className="relative">
                <input
                  type="number"
                  value={sharesValue}
                  onChange={(e) => handleSharesChange(e.target.value)}
                  placeholder="输入持有份额"
                  className="w-full px-4 py-2.5 pr-12 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  份
                </span>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="number"
                  value={amountValue}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="输入持有金额"
                  className="w-full px-4 py-2.5 pr-12 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  元
                </span>
              </div>
            )}

            {inputMode === "amount" && sharesValue && (
              <p className="text-xs text-gray-500">
                ≈ {parseFloat(sharesValue).toFixed(2)} 份
              </p>
            )}
            {inputMode === "shares" && amountValue && (
              <p className="text-xs text-gray-500">
                ≈ ¥{parseFloat(amountValue).toFixed(2)}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              累计收益
            </label>
            <div className="relative">
              <input
                type="number"
                value={profitValue}
                onChange={(e) => setProfitValue(e.target.value)}
                placeholder="输入累计收益（可选）"
                className="w-full px-4 py-2.5 pr-12 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                元
              </span>
            </div>
            <p className="text-xs text-gray-500">
              根据累计收益自动计算成本净值
            </p>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

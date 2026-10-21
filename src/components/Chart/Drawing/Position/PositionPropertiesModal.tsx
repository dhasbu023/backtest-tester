import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Sliders, Hash, BarChart2, AlertCircle } from 'lucide-react';
import type { DrawingObject } from '../../../../types/index.js';

interface PositionPropertiesModalProps {
  open: boolean;
  drawing: DrawingObject;
  isDarkMode: boolean;
  onClose: () => void;
  onApply: (updated: DrawingObject) => void;
}

type TabType = 'inputs' | 'style' | 'stats';

export const PositionPropertiesModal: React.FC<PositionPropertiesModalProps> = ({
  open,
  drawing,
  isDarkMode,
  onClose,
  onApply,
}) => {
  const isLong = drawing.type === 'LONG_POSITION';

  const [activeTab, setActiveTab] = useState<TabType>('inputs');

  // Input states
  const [entryPrice, setEntryPrice] = useState<number>(() => drawing.entryPrice ?? drawing.points[0]?.price ?? 0);
  const [targetPrice, setTargetPrice] = useState<number>(() => drawing.targetPrice ?? drawing.points[1]?.price ?? 0);
  const [stopPrice, setStopPrice] = useState<number>(() => drawing.stopPrice ?? drawing.points[2]?.price ?? 0);

  // Style states
  const [profitColor, setProfitColor] = useState<string>(() => drawing.profitColor || '#10b981');
  const [lossColor, setLossColor] = useState<string>(() => drawing.lossColor || '#ef4444');
  const [entryColor, setEntryColor] = useState<string>(() => drawing.color || '#3b82f6');
  const [opacity, setOpacity] = useState<number>(() => drawing.opacity ?? 0.22);
  const [showLabels, setShowLabels] = useState<boolean>(() => drawing.showLabels ?? true);
  const [showPrice, setShowPrice] = useState<boolean>(() => drawing.showPrice ?? true);
  const [showStats, setShowStats] = useState<boolean>(() => drawing.showStats ?? true);

  // Error validation
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEntryPrice(drawing.entryPrice ?? drawing.points[0]?.price ?? 0);
      setTargetPrice(drawing.targetPrice ?? drawing.points[1]?.price ?? 0);
      setStopPrice(drawing.stopPrice ?? drawing.points[2]?.price ?? 0);
      setProfitColor(drawing.profitColor || '#10b981');
      setLossColor(drawing.lossColor || '#ef4444');
      setEntryColor(drawing.color || '#3b82f6');
      setOpacity(drawing.opacity ?? 0.22);
      setShowLabels(drawing.showLabels ?? true);
      setShowPrice(drawing.showPrice ?? true);
      setShowStats(drawing.showStats ?? true);
      setValidationError(null);
      setActiveTab('inputs');
    }
  }, [open, drawing]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // Real-time calculations
  const riskDistance = isLong ? entryPrice - stopPrice : stopPrice - entryPrice;
  const rewardDistance = isLong ? targetPrice - entryPrice : entryPrice - targetPrice;
  const isRiskValid = riskDistance > 0;
  const riskReward = isRiskValid ? rewardDistance / riskDistance : 0;

  const pipMultiplier = entryPrice > 500 ? 10 : 10000;
  const riskPips = Math.abs(riskDistance) * pipMultiplier;
  const rewardPips = Math.abs(rewardDistance) * pipMultiplier;

  const riskPct = entryPrice > 0 ? (riskDistance / entryPrice) * 100 : 0;
  const rewardPct = entryPrice > 0 ? (rewardDistance / entryPrice) * 100 : 0;

  const handleSave = () => {
    if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
      setValidationError('Harga Entry harus berupa angka positif.');
      return;
    }
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
      setValidationError('Harga Take Profit harus berupa angka positif.');
      return;
    }
    if (!Number.isFinite(stopPrice) || stopPrice <= 0) {
      setValidationError('Harga Stop Loss harus berupa angka positif.');
      return;
    }

    if (isLong) {
      if (stopPrice >= entryPrice) {
        setValidationError('Untuk Posisi Long, Stop Loss harus berada di bawah Entry Price.');
        return;
      }
      if (targetPrice <= entryPrice) {
        setValidationError('Untuk Posisi Long, Take Profit harus berada di atas Entry Price.');
        return;
      }
    } else {
      if (stopPrice <= entryPrice) {
        setValidationError('Untuk Posisi Short, Stop Loss harus berada di atas Entry Price.');
        return;
      }
      if (targetPrice >= entryPrice) {
        setValidationError('Untuk Posisi Short, Take Profit harus berada di bawah Entry Price.');
        return;
      }
    }

    // Reconstruct points with updated prices
    const updatedPoints = [...drawing.points];
    if (updatedPoints[0]) {
      updatedPoints[0] = { ...updatedPoints[0], price: entryPrice };
    }
    if (updatedPoints[1]) {
      updatedPoints[1] = { ...updatedPoints[1], price: targetPrice };
    }
    if (updatedPoints[2]) {
      updatedPoints[2] = { ...updatedPoints[2], price: stopPrice };
    }

    const updatedDrawing: DrawingObject = {
      ...drawing,
      entryPrice,
      targetPrice,
      stopPrice,
      riskReward,
      profitColor,
      lossColor,
      color: entryColor,
      opacity,
      showLabels,
      showPrice,
      showStats,
      points: updatedPoints,
      updatedAt: new Date().toISOString(),
    };

    onApply(updatedDrawing);
    onClose();
  };

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
  const labelClass = 'mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300';

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isLong ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
              }`}
            >
              {isLong ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {isLong ? 'Long Position Properties' : 'Short Position Properties'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Simulasi risiko dan target rasio TradingView
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs Header */}
        <div className="flex border-b border-slate-200 px-5 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('inputs')}
            className={`flex items-center gap-1.5 border-b-2 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'inputs'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Hash className="h-3.5 w-3.5" />
            <span>Inputs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('style')}
            className={`flex items-center gap-1.5 border-b-2 py-2.5 px-4 text-xs font-semibold transition-colors ${
              activeTab === 'style'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Style</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-1.5 border-b-2 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'stats'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span>Statistics</span>
          </button>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="flex items-center gap-2 bg-rose-50 px-5 py-2 text-xs font-medium text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border-b border-rose-100 dark:border-rose-900/50">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[60vh]">
          {activeTab === 'inputs' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Harga Masuk (Entry Price)</label>
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => {
                    setEntryPrice(Number(e.target.value));
                    setValidationError(null);
                  }}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Take Profit Price</span>
                  <span className="text-slate-400 font-normal ml-1">
                    ({isLong ? 'harus > Entry' : 'harus < Entry'})
                  </span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={targetPrice}
                  onChange={(e) => {
                    setTargetPrice(Number(e.target.value));
                    setValidationError(null);
                  }}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  <span className="text-rose-600 dark:text-rose-400 font-bold">Stop Loss Price</span>
                  <span className="text-slate-400 font-normal ml-1">
                    ({isLong ? 'harus < Entry' : 'harus > Entry'})
                  </span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={stopPrice}
                  onChange={(e) => {
                    setStopPrice(Number(e.target.value));
                    setValidationError(null);
                  }}
                  className={inputClass}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Risk / Reward Ratio:</span>
                  <span className={`font-mono font-bold text-sm ${isRiskValid ? 'text-blue-600 dark:text-blue-400' : 'text-rose-500'}`}>
                    {isRiskValid ? `1 : ${riskReward.toFixed(2)}` : 'Invalid Range'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'style' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Profit Zone Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={profitColor}
                      onChange={(e) => setProfitColor(e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded border border-slate-300 dark:border-slate-700 bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={profitColor}
                      onChange={(e) => setProfitColor(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Stop Loss Zone Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={lossColor}
                      onChange={(e) => setLossColor(e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded border border-slate-300 dark:border-slate-700 bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={lossColor}
                      onChange={(e) => setLossColor(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Entry Line Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={entryColor}
                    onChange={(e) => setEntryColor(e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border border-slate-300 dark:border-slate-700 bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={entryColor}
                    onChange={(e) => setEntryColor(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className={labelClass}>Area Fill Opacity</label>
                  <span className="text-xs font-mono text-slate-500">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.6"
                  step="0.01"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                    className="accent-blue-600"
                  />
                  <span>Tampilkan Label Target & Stop Loss</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="accent-blue-600"
                  />
                  <span>Tampilkan Angka Harga dan Pips</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStats}
                    onChange={(e) => setShowStats(e.target.checked)}
                    className="accent-blue-600"
                  />
                  <span>Tampilkan Badge R:R di Tengah Entry</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-950 dark:bg-emerald-950/20">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Take Profit / Reward
                  </span>
                  <div className="mt-1 text-base font-bold font-mono text-emerald-700 dark:text-emerald-300">
                    +{rewardDistance.toFixed(2)}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                    +{rewardPips.toFixed(1)} pips ({rewardPct.toFixed(2)}%)
                  </div>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-950 dark:bg-rose-950/20">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Stop Loss / Risk
                  </span>
                  <div className="mt-1 text-base font-bold font-mono text-rose-700 dark:text-rose-300">
                    -{riskDistance.toFixed(2)}
                  </div>
                  <div className="text-[11px] font-mono text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                    -{riskPips.toFixed(1)} pips ({riskPct.toFixed(2)}%)
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/60 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Risk/Reward:</span>
                  <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                    {isRiskValid ? `1 : ${riskReward.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Entry Price:</span>
                  <span className="font-mono font-semibold">{entryPrice.toFixed(entryPrice > 500 ? 2 : 4)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Take Profit:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {targetPrice.toFixed(entryPrice > 500 ? 2 : 4)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Stop Loss:</span>
                  <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                    {stopPrice.toFixed(entryPrice > 500 ? 2 : 4)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed italic">
                * Simulasi posisi ini digunakan untuk analisis teknikal chart dan penghitungan rasio trading, bukan eksekusi order broker langsung.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default PositionPropertiesModal;

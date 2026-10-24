
import React, { useEffect, useState } from 'react';
import type { DrawingObject } from '../../../types/index.js';

interface PositionPropertiesModalProps {
  drawing: DrawingObject;
  isDarkMode: boolean;
  onApply: (values: {
    entryPrice: number;
    targetPrice: number;
    stopPrice: number;
    color: string;
    profitColor: string;
    lossColor: string;
    opacity: number;
    showLabels: boolean;
    showPrice: boolean;
    showStats: boolean;
  }) => void;
  onClose: () => void;
}

export const PositionPropertiesModal: React.FC<
  PositionPropertiesModalProps
> = ({ drawing, isDarkMode, onApply, onClose }) => {
  const isLong = drawing.type === 'LONG_POSITION';
  const title = isLong
    ? 'Long Position Properties'
    : 'Short Position Properties';

  const [entryPrice, setEntryPrice] = useState(
    String(drawing.entryPrice ?? drawing.points[0]?.price ?? ''),
  );
  const [targetPrice, setTargetPrice] = useState(
    String(drawing.targetPrice ?? drawing.points[1]?.price ?? ''),
  );
  const [stopPrice, setStopPrice] = useState(
    String(drawing.stopPrice ?? drawing.points[2]?.price ?? ''),
  );

  const [color, setColor] = useState(drawing.color || '#3b82f6');
  const [profitColor, setProfitColor] = useState(
    drawing.profitColor || '#10b981',
  );
  const [lossColor, setLossColor] = useState(
    drawing.lossColor || '#ef4444',
  );
  const [opacity, setOpacity] = useState(drawing.opacity ?? 0.22);
  const [showLabels, setShowLabels] = useState(
    drawing.showLabels ?? true,
  );
  const [showPrice, setShowPrice] = useState(
    drawing.showPrice ?? true,
  );
  const [showStats, setShowStats] = useState(
    drawing.showStats ?? true,
  );
  const [error, setError] = useState('');

  // Sync form state when drawing changes
  useEffect(() => {
    setEntryPrice(
      String(drawing.entryPrice ?? drawing.points[0]?.price ?? ''),
    );
    setTargetPrice(
      String(drawing.targetPrice ?? drawing.points[1]?.price ?? ''),
    );
    setStopPrice(
      String(drawing.stopPrice ?? drawing.points[2]?.price ?? ''),
    );
    setColor(drawing.color || '#3b82f6');
    setProfitColor(drawing.profitColor || '#10b981');
    setLossColor(drawing.lossColor || '#ef4444');
    setOpacity(drawing.opacity ?? 0.22);
    setShowLabels(drawing.showLabels ?? true);
    setShowPrice(drawing.showPrice ?? true);
    setShowStats(drawing.showStats ?? true);
    setError('');
  }, [drawing]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedEntry = Number(entryPrice);
    const parsedTarget = Number(targetPrice);
    const parsedStop = Number(stopPrice);

    if (!Number.isFinite(parsedEntry) || parsedEntry <= 0) {
      setError('Masukkan Entry Price yang valid.');
      return;
    }
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setError('Masukkan Target Price yang valid.');
      return;
    }
    if (!Number.isFinite(parsedStop) || parsedStop <= 0) {
      setError('Masukkan Stop Loss Price yang valid.');
      return;
    }

    onApply({
      entryPrice: parsedEntry,
      targetPrice: parsedTarget,
      stopPrice: parsedStop,
      color,
      profitColor,
      lossColor,
      opacity,
      showLabels,
      showPrice,
      showStats,
    });
  };

  const panelClass = isDarkMode
    ? 'bg-slate-900 text-slate-100 border-slate-700'
    : 'bg-white text-slate-900 border-slate-200';

  const inputClass = isDarkMode
    ? 'bg-slate-800 border-slate-600 text-white'
    : 'bg-white border-slate-300 text-slate-900';

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
        className={`w-full max-w-md rounded-xl border p-5 shadow-2xl ${panelClass} max-h-[90vh] overflow-y-auto`}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-xs opacity-60">
              Atur harga, warna, dan tampilan label posisi.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-lg hover:bg-slate-500/20"
            aria-label="Tutup properties"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Price fields */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Entry Price
            </label>
            <input
              type="number"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 font-mono text-sm ${inputClass}`}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Take Profit Price
            </label>
            <input
              type="number"
              step="any"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 font-mono text-sm ${inputClass}`}
              required
            />
            <p className="mt-1 text-xs opacity-60">
              {isLong
                ? 'Harus lebih tinggi dari Entry Price.'
                : 'Harus lebih rendah dari Entry Price.'}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Stop Loss Price
            </label>
            <input
              type="number"
              step="any"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 font-mono text-sm ${inputClass}`}
              required
            />
            <p className="mt-1 text-xs opacity-60">
              {isLong
                ? 'Harus lebih rendah dari Entry Price.'
                : 'Harus lebih tinggi dari Entry Price.'}
            </p>
          </div>

          {/* Color fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-2 block text-xs font-medium">
                Entry
              </label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-full cursor-pointer rounded border-0 bg-transparent"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium">
                Profit
              </label>
              <input
                type="color"
                value={profitColor}
                onChange={(e) => setProfitColor(e.target.value)}
                className="h-9 w-full cursor-pointer rounded border-0 bg-transparent"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium">
                Loss
              </label>
              <input
                type="color"
                value={lossColor}
                onChange={(e) => setLossColor(e.target.value)}
                className="h-9 w-full cursor-pointer rounded border-0 bg-transparent"
              />
            </div>
          </div>

          {/* Opacity */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Opacity ({Math.round(opacity * 100)}%)
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
              />
              Tampilkan label TP & SL
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
              />
              Tampilkan harga pada label
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showStats}
                onChange={(e) => setShowStats(e.target.checked)}
              />
              Tampilkan Risk/Reward ratio
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-500/40 px-4 py-2 text-sm hover:bg-slate-500/10"
          >
            Batal
          </button>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </form>
    </div>
  );
};

export default PositionPropertiesModal;

import React, { useRef, useEffect } from 'react';
import { IndicatorConfig, Candle } from '../types/index.js';
import {
  calculateRSI,
  calculateATR,
  IndicatorPoint,
} from '../utils/indicators.js';
import { X } from 'lucide-react';

interface SubIndicatorsPaneProps {
  candles: Candle[];
  activeSubIndicators: IndicatorConfig[];
  isDarkMode: boolean;
  onRemoveIndicator: (id: string) => void;
}

export const SubIndicatorsPane: React.FC<SubIndicatorsPaneProps> = ({
  candles,
  activeSubIndicators,
  isDarkMode,
  onRemoveIndicator,
}) => {
  if (activeSubIndicators.length === 0 || candles.length === 0) return null;

  return (
    <div className="flex flex-col border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0 select-none">
      {activeSubIndicators.map((ind) => (
        <SingleSubIndicator
          key={ind.id}
          indicator={ind}
          candles={candles}
          isDarkMode={isDarkMode}
          onClose={() => onRemoveIndicator(ind.id)}
        />
      ))}
    </div>
  );
};

interface SingleSubIndicatorProps {
  indicator: IndicatorConfig;
  candles: Candle[];
  isDarkMode: boolean;
  onClose: () => void;
}

const SingleSubIndicator: React.FC<SingleSubIndicatorProps> = ({
  indicator,
  candles,
  isDarkMode,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute indicator values up to current candles
  let points: IndicatorPoint[] = [];
  if (indicator.type === 'RSI') {
    points = calculateRSI(candles, indicator.period || 14);
  } else if (indicator.type === 'ATR') {
    points = calculateATR(candles, indicator.period || 14);
  }

  const latestVal = points.length > 0 ? points[points.length - 1].value : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, width, height);

    if (points.length < 2) return;

    // Y scale range
    let minY = 0;
    let maxY = 100;

    if (indicator.type === 'RSI') {
      minY = 0;
      maxY = 100;

      // Draw 30, 50, 70 level guidelines
      const levels = indicator.levels || [30, 50, 70];
      ctx.strokeStyle = isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      for (const lvl of levels) {
        const y = height - (lvl / 100) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width - 45, y);
        ctx.stroke();

        ctx.fillStyle = isDarkMode ? '#64748b' : '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(lvl.toString(), width - 35, y + 3);
      }
      ctx.setLineDash([]);
    } else if (indicator.type === 'ATR') {
      const vals = points.map((p) => p.value);
      minY = Math.min(...vals) * 0.95;
      maxY = Math.max(...vals) * 1.05;
      if (minY === maxY) {
        minY -= 1;
        maxY += 1;
      }
    }

    // Map points to canvas coordinates
    const totalVisible = candles.length;
    const stepX = (width - 45) / Math.max(1, totalVisible - 1);

    ctx.beginPath();
    ctx.strokeStyle = indicator.color || '#3b82f6';
    ctx.lineWidth = indicator.strokeWidth || 2;

    let hasStarted = false;

    // Align indicator points with corresponding candle index
    const candleTimeMap = new Map<number, number>();
    candles.forEach((c, idx) => candleTimeMap.set(c.timestamp, idx));

    for (const pt of points) {
      const candleIdx = candleTimeMap.get(pt.time);
      if (candleIdx === undefined) continue;

      const x = candleIdx * stepX;
      const y = height - ((pt.value - minY) / (maxY - minY)) * (height - 10) - 5;

      if (!hasStarted) {
        ctx.moveTo(x, y);
        hasStarted = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }, [points, candles, indicator, isDarkMode]);

  return (
    <div className="h-28 border-b border-slate-200 dark:border-slate-800 flex flex-col relative">
      {/* Pane Top Header */}
      <div className="h-6 px-3 flex items-center justify-between text-[11px] font-mono bg-slate-50 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: indicator.color }} />
          <span className="font-bold">{indicator.name}:</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {latestVal !== null ? latestVal.toFixed(2) : '-'}
          </span>
          {indicator.type === 'RSI' && latestVal !== null && (
            <span
              className={`text-[10px] px-1 rounded font-sans ${
                latestVal >= 70
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  : latestVal <= 30
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {latestVal >= 70 ? 'Overbought' : latestVal <= 30 ? 'Oversold' : 'Neutral'}
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          title="Tutup Panel Indikator"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 w-full h-full relative">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};

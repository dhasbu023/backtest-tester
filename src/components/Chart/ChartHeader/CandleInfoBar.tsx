
import React from 'react';
import type { Candle, Timeframe } from '../../../types/index.js';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatDateTimeWithTz } from '../../../utils/timezone.js';
import { formatPrice } from '../utils/chartFormatters.js';

interface CandleInfoBarProps {
  symbol: string;
  timeframe: Timeframe;
  displayedCandle: Candle | null;
  candleChange: number;
  candleChangePercent: number;
  activeTimezone: string;
}

export const CandleInfoBar: React.FC<CandleInfoBarProps> = ({
  symbol,
  timeframe,
  displayedCandle,
  candleChange,
  candleChangePercent,
  activeTimezone,
}) => {
  return (
    <div className="relative z-10 flex min-h-9 shrink-0 items-center gap-3 overflow-x-auto border-b border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-[#0b0f19]">
      <div className="flex shrink-0 items-center gap-2 font-sans text-xs font-semibold">
        <span className="text-slate-900 dark:text-white">
          {symbol}
        </span>

        <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
          {timeframe}
        </span>
      </div>

      {displayedCandle ? (
        <div className="flex min-w-0 items-center gap-2.5 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-300">
          <span className="hidden text-slate-400 lg:inline">
            {formatDateTimeWithTz(
              displayedCandle.timestamp,
              activeTimezone,
            )}
          </span>

          <span>
            O:{' '}
            <b className="text-slate-900 dark:text-white">
              {formatPrice(displayedCandle.open)}
            </b>
          </span>

          <span>
            H:{' '}
            <b className="text-emerald-600 dark:text-emerald-400">
              {formatPrice(displayedCandle.high)}
            </b>
          </span>

          <span>
            L:{' '}
            <b className="text-rose-600 dark:text-rose-400">
              {formatPrice(displayedCandle.low)}
            </b>
          </span>

          <span>
            C:{' '}
            <b className="text-slate-900 dark:text-white">
              {formatPrice(displayedCandle.close)}
            </b>
          </span>

          <span
            className={`flex items-center gap-1 font-semibold ${
              candleChange >= 0
                ? 'text-emerald-500'
                : 'text-rose-500'
            }`}
          >
            {candleChange >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}

            {candleChange >= 0 ? '+' : ''}
            {candleChange.toFixed(2)} (
            {candleChangePercent.toFixed(2)}%)
          </span>
        </div>
      ) : (
        <span className="text-xs text-slate-400">
          Menunggu data candle...
        </span>
      )}
    </div>
  );
};

export default CandleInfoBar;

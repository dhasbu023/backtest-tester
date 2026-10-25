/** Exponential Moving Average (EMA), seeded with the first-period SMA. */
import type { CandleClose, IndicatorPoint } from './SMA.js';
import { calculateSMA } from './SMA.js';

export function calculateEMA<TTime>(
  candles: CandleClose<TTime>[],
  period = 20,
): IndicatorPoint<TTime>[] {
  if (!Number.isInteger(period) || period < 1 || candles.length < period) return [];
  if (candles.slice(0, candles.length).some(c => !Number.isFinite(c.close))) return [];

  const alpha = 2 / (period + 1);
  const seed = candles.slice(0, period).reduce((sum, candle) => sum + candle.close, 0) / period;
  const result: IndicatorPoint<TTime>[] = [{ time: candles[period - 1].time, value: round(seed, 4) }];
  let ema = seed;

  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * alpha + ema * (1 - alpha);
    result.push({ time: candles[i].time, value: round(ema, 4) });
  }
  return result;
}

// Kept exported for callers that need the seed calculation.
export { calculateSMA };

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

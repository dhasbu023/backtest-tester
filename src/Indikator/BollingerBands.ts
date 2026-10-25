/** Bollinger Bands: SMA middle band +/- multiplier * population standard deviation. */
import type { CandleClose } from './SMA.js';

export interface BollingerBandPoint<TTime = unknown> {
  time: TTime;
  upper: number;
  middle: number;
  lower: number;
}

export function calculateBollingerBands<TTime>(
  candles: CandleClose<TTime>[],
  period = 20,
  multiplier = 2,
): BollingerBandPoint<TTime>[] {
  if (!Number.isInteger(period) || period < 1 || candles.length < period || !Number.isFinite(multiplier) || multiplier < 0) return [];

  const result: BollingerBandPoint<TTime>[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const window = candles.slice(i - period + 1, i + 1).map(c => c.close);
    if (window.some(value => !Number.isFinite(value))) continue;
    const mean = window.reduce((sum, value) => sum + value, 0) / period;
    const variance = window.reduce((sum, value) => sum + (value - mean) ** 2, 0) / period;
    const deviation = Math.sqrt(variance);
    result.push({
      time: candles[i].time,
      upper: round(mean + multiplier * deviation, 4),
      middle: round(mean, 4),
      lower: round(mean - multiplier * deviation, 4),
    });
  }
  return result;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

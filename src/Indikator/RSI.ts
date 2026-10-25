/** Relative Strength Index (RSI), using Wilder smoothing after initial averages. */
import type { CandleClose, IndicatorPoint } from './SMA.js';

export function calculateRSI<TTime>(
  candles: CandleClose<TTime>[],
  period = 14,
): IndicatorPoint<TTime>[] {
  if (!Number.isInteger(period) || period < 1 || candles.length <= period) return [];
  if (candles.some(c => !Number.isFinite(c.close))) return [];

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    gainSum += Math.max(change, 0);
    lossSum += Math.max(-change, 0);
  }
  let averageGain = gainSum / period;
  let averageLoss = lossSum / period;
  const result: IndicatorPoint<TTime>[] = [
    { time: candles[period].time, value: rsiValue(averageGain, averageLoss) },
  ];

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
    result.push({ time: candles[i].time, value: rsiValue(averageGain, averageLoss) });
  }
  return result;
}

function rsiValue(averageGain: number, averageLoss: number): number {
  // Flat market: RSI=50. Gains only: 100. Losses only: 0.
  if (averageGain === 0 && averageLoss === 0) return 50;
  if (averageLoss === 0) return 100;
  if (averageGain === 0) return 0;
  const rs = averageGain / averageLoss;
  return round(100 - 100 / (1 + rs), 2);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

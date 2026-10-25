/** Average True Range (ATR), initialized by mean TR then Wilder-smoothed. */
import type { IndicatorPoint } from './SMA.js';

export interface CandleOHLC<TTime = unknown> {
  time: TTime;
  high: number;
  low: number;
  close: number;
}

export function calculateATR<TTime>(
  candles: CandleOHLC<TTime>[],
  period = 14,
): IndicatorPoint<TTime>[] {
  if (!Number.isInteger(period) || period < 1 || candles.length < period) return [];
  if (candles.some(c => !Number.isFinite(c.high) || !Number.isFinite(c.low) || !Number.isFinite(c.close) || c.high < c.low)) return [];

  const trueRanges: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const previousClose = i > 0 ? candles[i - 1].close : candle.close;
    trueRanges.push(Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose),
    ));
  }

  let atr = trueRanges.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  const result: IndicatorPoint<TTime>[] = [{ time: candles[period - 1].time, value: round(atr, 4) }];
  for (let i = period; i < candles.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
    result.push({ time: candles[i].time, value: round(atr, 4) });
  }
  return result;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

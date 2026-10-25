/**
 * Simple Moving Average (SMA)
 * Rata-rata aritmetika dari harga penutupan selama `period` candle.
 */
export interface CandleClose<TTime = unknown> {
  time: TTime;
  close: number;
}

export interface IndicatorPoint<TTime = unknown> {
  time: TTime;
  value: number;
}

export function calculateSMA<TTime>(
  candles: CandleClose<TTime>[],
  period = 20,
): IndicatorPoint<TTime>[] {
  if (!Number.isInteger(period) || period < 1 || candles.length < period) return [];

  const result: IndicatorPoint<TTime>[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    let valid = true;
    for (let j = i - period + 1; j <= i; j++) {
      const close = candles[j]?.close;
      if (!Number.isFinite(close)) { valid = false; break; }
      sum += close;
    }
    if (valid) result.push({ time: candles[i].time, value: round(sum / period, 4) });
  }
  return result;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

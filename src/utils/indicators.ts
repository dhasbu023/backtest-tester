import { Candle, IndicatorConfig } from '../types/index.js';

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface BollingerBandsResult {
  upper: IndicatorPoint[];
  middle: IndicatorPoint[];
  lower: IndicatorPoint[];
}

/**
 * Calculates Simple Moving Average (SMA).
 * Strictly respects warm-up period (zero values before period is reached).
 */
export function calculateSMA(candles: Candle[], period: number): IndicatorPoint[] {
  if (candles.length < period || period <= 0) return [];

  const results: IndicatorPoint[] = [];
  let sum = 0;

  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;

    if (i >= period) {
      sum -= candles[i - period].close;
    }

    if (i >= period - 1) {
      results.push({
        time: candles[i].timestamp,
        value: Number((sum / period).toFixed(4)),
      });
    }
  }

  return results;
}

/**
 * Calculates Exponential Moving Average (EMA).
 * Formula: EMA_t = (Close_t - EMA_prev) * (2 / (period + 1)) + EMA_prev.
 */
export function calculateEMA(candles: Candle[], period: number): IndicatorPoint[] {
  if (candles.length < period || period <= 0) return [];

  const results: IndicatorPoint[] = [];
  const multiplier = 2 / (period + 1);

  // Initialize with SMA of first 'period' candles
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let prevEMA = sum / period;

  results.push({
    time: candles[period - 1].timestamp,
    value: Number(prevEMA.toFixed(4)),
  });

  for (let i = period; i < candles.length; i++) {
    const currentClose = candles[i].close;
    const currentEMA = (currentClose - prevEMA) * multiplier + prevEMA;
    results.push({
      time: candles[i].timestamp,
      value: Number(currentEMA.toFixed(4)),
    });
    prevEMA = currentEMA;
  }

  return results;
}

/**
 * Calculates Bollinger Bands (Upper, Middle SMA, Lower).
 */
export function calculateBollingerBands(
  candles: Candle[],
  period = 20,
  stdDevMultiplier = 2.0
): BollingerBandsResult {
  if (candles.length < period || period <= 0) {
    return { upper: [], middle: [], lower: [] };
  }

  const upper: IndicatorPoint[] = [];
  const middle: IndicatorPoint[] = [];
  const lower: IndicatorPoint[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    // Calculate mean of window
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += candles[j].close;
    }
    const mean = sum / period;

    // Calculate variance and standard deviation
    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += Math.pow(candles[j].close - mean, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);

    const time = candles[i].timestamp;
    middle.push({ time, value: Number(mean.toFixed(4)) });
    upper.push({ time, value: Number((mean + stdDevMultiplier * stdDev).toFixed(4)) });
    lower.push({ time, value: Number((mean - stdDevMultiplier * stdDev).toFixed(4)) });
  }

  return { upper, middle, lower };
}

/**
 * Calculates Relative Strength Index (RSI) using Wilder's smoothing method.
 * Values bounded between 0 and 100.
 */
export function calculateRSI(candles: Candle[], period = 14): IndicatorPoint[] {
  if (candles.length <= period || period <= 0) return [];

  const results: IndicatorPoint[] = [];
  const changes: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i].close - candles[i - 1].close);
  }

  // Initial average gain & loss
  let gainSum = 0;
  let lossSum = 0;

  for (let i = 0; i < period; i++) {
    const change = changes[i];
    if (change > 0) gainSum += change;
    else lossSum += Math.abs(change);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - 100 / (1 + rs);

  results.push({
    time: candles[period].timestamp,
    value: Number(rsi.toFixed(2)),
  });

  // Wilder's smoothing for subsequent candles
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - 100 / (1 + rs);

    results.push({
      time: candles[i + 1].timestamp,
      value: Number(Math.max(0, Math.min(100, rsi)).toFixed(2)),
    });
  }

  return results;
}

/**
 * Calculates Average True Range (ATR) using Wilder's smoothing.
 */
export function calculateATR(candles: Candle[], period = 14): IndicatorPoint[] {
  if (candles.length <= period || period <= 0) return [];

  const trs: number[] = [];
  // First candle TR is high - low
  trs.push(candles[0].high - candles[0].low);

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose)
    );
    trs.push(tr);
  }

  // Initial ATR is simple average of first 'period' TR values
  let sumTR = 0;
  for (let i = 0; i < period; i++) {
    sumTR += trs[i];
  }
  let prevATR = sumTR / period;

  const results: IndicatorPoint[] = [
    {
      time: candles[period - 1].timestamp,
      value: Number(prevATR.toFixed(4)),
    },
  ];

  for (let i = period; i < candles.length; i++) {
    const currentATR = (prevATR * (period - 1) + trs[i]) / period;
    results.push({
      time: candles[i].timestamp,
      value: Number(currentATR.toFixed(4)),
    });
    prevATR = currentATR;
  }

  return results;
}

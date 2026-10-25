/**
 * ============================================================
 * INDICATOR COMPATIBILITY BRIDGE
 * ============================================================
 *
 * File ini menghubungkan komponen lama dengan perhitungan
 * indikator yang sudah dipisahkan ke folder src/Indikator/.
 *
 * Jangan menaruh rumus indikator di file ini.
 *
 * Indikator:
 * - SMA.ts
 * - EMA.ts
 * - BollingerBands.ts
 * - RSI.ts
 * - ATR.ts
 *
 * Tanggung jawab file ini:
 * 1. Mengadaptasi candle.timestamp menjadi time.
 * 2. Menjaga format hasil agar cocok dengan komponen lama.
 * 3. Mempertahankan nama fungsi yang digunakan chart.
 */

import type { Candle } from '../types/index.js';

import {
  calculateSMA as calculateSMACore,
} from '../Indikator/SMA.js';

import {
  calculateEMA as calculateEMACore,
} from '../Indikator/EMA.js';

import {
  calculateBollingerBands as calculateBollingerBandsCore,
} from '../Indikator/BollingerBands.js';

import {
  calculateRSI as calculateRSICore,
} from '../Indikator/RSI.js';

import {
  calculateATR as calculateATRCore,
} from '../Indikator/ATR.js';

// ============================================================
// PUBLIC TYPES
// ============================================================

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface BollingerBandsResult {
  upper: IndicatorPoint[];
  middle: IndicatorPoint[];
  lower: IndicatorPoint[];
}

// ============================================================
// CANDLE ADAPTERS
// ============================================================

/**
 * Mengubah format Candle aplikasi menjadi format yang
 * digunakan indikator baru.
 *
 * Candle aplikasi:
 * {
 *   timestamp: number;
 *   open: number;
 *   high: number;
 *   low: number;
 *   close: number;
 * }
 *
 * Indikator baru:
 * {
 *   time: number;
 *   open: number;
 *   high: number;
 *   low: number;
 *   close: number;
 * }
 */

function toCloseCandles(candles: Candle[]) {
  return candles.map((candle) => ({
    time: candle.timestamp,
    close: candle.close,
  }));
}

function toOHLCCandles(candles: Candle[]) {
  return candles.map((candle) => ({
    time: candle.timestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }));
}

// ============================================================
// SMA
// ============================================================

/**
 * Simple Moving Average.
 *
 * Menghasilkan titik:
 * {
 *   time: candle.timestamp,
 *   value: SMA
 * }
 */
export function calculateSMA(
  candles: Candle[],
  period: number,
): IndicatorPoint[] {
  if (
    !Array.isArray(candles) ||
    candles.length === 0 ||
    !Number.isInteger(period) ||
    period < 1
  ) {
    return [];
  }

  const result = calculateSMACore(
    toCloseCandles(candles),
    period,
  );

  return result.map((point) => ({
    time: Number(point.time),
    value: point.value,
  }));
}

// ============================================================
// EMA
// ============================================================

/**
 * Exponential Moving Average.
 *
 * Menggunakan implementasi EMA dari src/Indikator/EMA.ts.
 */
export function calculateEMA(
  candles: Candle[],
  period: number,
): IndicatorPoint[] {
  if (
    !Array.isArray(candles) ||
    candles.length === 0 ||
    !Number.isInteger(period) ||
    period < 1
  ) {
    return [];
  }

  const result = calculateEMACore(
    toCloseCandles(candles),
    period,
  );

  return result.map((point) => ({
    time: Number(point.time),
    value: point.value,
  }));
}

// ============================================================
// BOLLINGER BANDS
// ============================================================

/**
 * Bollinger Bands.
 *
 * Format hasil sengaja dipertahankan agar kompatibel
 * dengan TradingChart.tsx.
 *
 * Format yang dibutuhkan chart:
 *
 * {
 *   upper:  [{ time, value }],
 *   middle: [{ time, value }],
 *   lower:  [{ time, value }]
 * }
 */
export function calculateBollingerBands(
  candles: Candle[],
  period = 20,
  stdDevMultiplier = 2,
): BollingerBandsResult {
  const emptyResult: BollingerBandsResult = {
    upper: [],
    middle: [],
    lower: [],
  };

  if (
    !Array.isArray(candles) ||
    candles.length === 0 ||
    !Number.isInteger(period) ||
    period < 1 ||
    !Number.isFinite(stdDevMultiplier) ||
    stdDevMultiplier < 0
  ) {
    return emptyResult;
  }

  const bands = calculateBollingerBandsCore(
    toCloseCandles(candles),
    period,
    stdDevMultiplier,
  );

  return {
    upper: bands.map((point) => ({
      time: Number(point.time),
      value: point.upper,
    })),

    middle: bands.map((point) => ({
      time: Number(point.time),
      value: point.middle,
    })),

    lower: bands.map((point) => ({
      time: Number(point.time),
      value: point.lower,
    })),
  };
}

// ============================================================
// RSI
// ============================================================

/**
 * Relative Strength Index.
 *
 * Fungsi ini tetap dapat digunakan oleh SubIndicatorsPane.tsx.
 */
export function calculateRSI(
  candles: Candle[],
  period = 14,
): IndicatorPoint[] {
  if (
    !Array.isArray(candles) ||
    candles.length === 0 ||
    !Number.isInteger(period) ||
    period < 1
  ) {
    return [];
  }

  const result = calculateRSICore(
    toCloseCandles(candles),
    period,
  );

  return result.map((point) => ({
    time: Number(point.time),
    value: point.value,
  }));
}

// ============================================================
// ATR
// ============================================================

/**
 * Average True Range.
 *
 * Menggunakan high, low, close dan previous close.
 * Tetap kompatibel dengan SubIndicatorsPane.tsx.
 */
export function calculateATR(
  candles: Candle[],
  period = 14,
): IndicatorPoint[] {
  if (
    !Array.isArray(candles) ||
    candles.length === 0 ||
    !Number.isInteger(period) ||
    period < 1
  ) {
    return [];
  }

  const result = calculateATRCore(
    toOHLCCandles(candles),
    period,
  );

  return result.map((point) => ({
    time: Number(point.time),
    value: point.value,
  }));
}

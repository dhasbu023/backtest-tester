
/**
 * ============================================================
 * INDICATOR COMPATIBILITY BRIDGE
 * ============================================================
 *
 * File ini mempertahankan kompatibilitas dengan komponen lama.
 *
 * Semua perhitungan indikator dipindahkan ke:
 *
 * src/Indikator/SMA.ts
 * src/Indikator/EMA.ts
 * src/Indikator/BollingerBands.ts
 * src/Indikator/RSI.ts
 * src/Indikator/ATR.ts
 *
 * Jangan menambahkan rumus perhitungan indikator baru di sini.
 */

import type { Candle } from '../types/index.js';

// ============================================================
// EXPORT TYPES
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
// RE-EXPORT INDICATOR FUNCTIONS
// ============================================================

export {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  calculateATR,
} from '../Indikator/index.js';

// ============================================================
// RE-EXPORT INDICATOR TYPES
// ============================================================

export type {
  SMAOptions,
} from '../Indikator/SMA.js';

export type {
  EMAOptions,
} from '../Indikator/EMA.js';

export type {
  BollingerBandsOptions,
} from '../Indikator/BollingerBands.js';

export type {
  RSIOptions,
} from '../Indikator/RSI.js';

export type {
  ATROptions,
} from '../Indikator/ATR.js';

// ============================================================
// OPTIONAL: SHARED TYPE ALIAS
// ============================================================

/**
 * Alias untuk tipe Candle yang digunakan aplikasi.
 * Dipertahankan untuk kebutuhan kompatibilitas.
 */
export type IndicatorCandle = Candle;


import type { Candle, IndicatorConfig } from '../types';

export type MomentumSignalType = 'BULLISH' | 'BEARISH';

export interface MomentumSignal {
  time: number;
  type: MomentumSignalType;
  price: number;
  candleIndex: number;
}

export interface MomentumCandleOptions {
  candles: Candle[];
  symbol: string;
  timeframe: string;
  config: IndicatorConfig;
}

interface PairSettings {
  pipSize: number;
  minBody: Record<string, number>;
}

const PAIR_SETTINGS: Record<string, PairSettings> = {
  XAUUSD: {
    pipSize: 0.1,
    minBody: {
      M5: 35,
      M15: 45,
      M30: 55,
    },
  },
  USDJPY: {
    pipSize: 0.01,
    minBody: {
      M5: 10,
      M15: 15,
      M30: 20,
    },
  },
  GBPUSD: {
    pipSize: 0.0001,
    minBody: {
      M5: 10,
      M15: 15,
      M30: 20,
    },
  },
  AUDUSD: {
    pipSize: 0.0001,
    minBody: {
      M5: 10,
      M15: 15,
      M30: 20,
    },
  },
  USDCAD: {
    pipSize: 0.0001,
    minBody: {
      M5: 10,
      M15: 15,
      M30: 20,
    },
  },
  EURUSD: {
    pipSize: 0.0001,
    minBody: {
      M5: 10,
      M15: 15,
      M30: 20,
    },
  },
  NZDUSD: {
    pipSize: 0.0001,
    minBody: {
      M5: 10,
      M15: 15,
      M30: 20,
    },
  },
  USDCHF: {
    pipSize: 0.0001,
    minBody: {
      M5: 10,
      M15: 15,
      M30: 20,
    },
  },
  BTCUSD: {
    pipSize: 1,
    minBody: {
      M5: 80,
      M15: 120,
      M30: 160,
    },
  },
};

function normalizeSymbol(symbol: string): string {
  const normalized = symbol.toUpperCase().replace(/[^A-Z]/g, '');

  // Mendukung nama broker seperti XAUUSDm, XAUUSD.pro, dan sebagainya.
  const pairs = Object.keys(PAIR_SETTINGS);

  return (
    pairs.find((pair) => normalized.startsWith(pair)) ??
    pairs.find((pair) => normalized.includes(pair)) ??
    normalized
  );
}

function getPairSettings(symbol: string): PairSettings | null {
  const normalized = normalizeSymbol(symbol);
  return PAIR_SETTINGS[normalized] ?? null;
}

function getMinimumBody(
  symbol: string,
  timeframe: string,
): number {
  const pair = getPairSettings(symbol);

  if (!pair) return 0;

  const minPips = pair.minBody[timeframe];

  if (minPips === undefined) return 0;

  return minPips * pair.pipSize;
}

function calculateBody(candle: Candle): number {
  return Math.abs(candle.close - candle.open);
}

function calculateTotalWick(candle: Candle): number {
  const upperWick =
    candle.high - Math.max(candle.open, candle.close);

  const lowerWick =
    Math.min(candle.open, candle.close) - candle.low;

  return Math.max(0, upperWick) + Math.max(0, lowerWick);
}

function isBullish(candle: Candle): boolean {
  return candle.close > candle.open;
}

function isBearish(candle: Candle): boolean {
  return candle.close < candle.open;
}

/**
 * Conservative:
 * Total wick maksimal sesuai maxWickPercent.
 *
 * Contoh:
 * Body = 70
 * Total wick = 30
 * Total candle range = 100
 * Wick percentage = 30%
 */
function passesWickFilter(
  candle: Candle,
  maxWickPercent: number,
): boolean {
  const body = calculateBody(candle);
  const totalWick = calculateTotalWick(candle);
  const totalRange = body + totalWick;

  if (totalRange <= 0) return false;

  const wickPercent = (totalWick / totalRange) * 100;

  return wickPercent <= maxWickPercent;
}

/**
 * Consolidation filter:
 * Body candle sebelumnya harus lebih kecil
 * daripada body candle momentum saat ini.
 *
 * Semua candle sebelumnya yang diperiksa harus
 * memiliki body lebih kecil.
 */
function passesConsolidationFilter(
  candles: Candle[],
  currentIndex: number,
  consolidationCount: number,
): boolean {
  if (consolidationCount <= 0) return true;

  if (currentIndex < consolidationCount) return false;

  const currentBody = calculateBody(candles[currentIndex]);

  if (currentBody <= 0) return false;

  for (
    let i = currentIndex - consolidationCount;
    i < currentIndex;
    i++
  ) {
    const previousBody = calculateBody(candles[i]);

    if (previousBody >= currentBody) {
      return false;
    }
  }

  return true;
}

/**
 * Menghitung EMA berdasarkan candle close.
 *
 * Fungsi ini digunakan jika data candle yang diberikan
 * memang sudah berada pada timeframe EMA yang dipilih.
 * Untuk timeframe EMA berbeda, agregasi timeframe
 * harus dilakukan oleh pemanggil sebelum menghitung EMA.
 */
export function calculateMomentumEMA(
  candles: Candle[],
  period: number,
): number[] {
  if (period <= 0 || candles.length === 0) return [];

  const multiplier = 2 / (period + 1);

  const result: number[] = [];

  let ema = candles[0].close;

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      ema = candles[i].close;
    } else {
      ema =
        candles[i].close * multiplier +
        ema * (1 - multiplier);
    }

    result.push(ema);
  }

  return result;
}

/**
 * Menghitung sinyal Momentum Candle.
 *
 * emaValues bersifat opsional:
 * - Jika filter EMA tidak aktif, tidak diperlukan.
 * - Jika filter EMA aktif, kirim EMA yang sudah disejajarkan
 *   dengan candle pada timeframe chart.
 *
 * Jangan mengirim EMA H1 mentah untuk chart M5 tanpa
 * proses penyelarasan timeframe terlebih dahulu.
 */
export function calculateMomentumCandleSignals(
  options: MomentumCandleOptions,
  emaValues?: number[],
): MomentumSignal[] {
  const { candles, symbol, timeframe, config } = options;

  if (!candles || candles.length === 0) return [];

  if (config.type !== 'MOMENTUM_CANDLE' || !config.visible) {
    return [];
  }

  const minimumBody = getMinimumBody(symbol, timeframe);

  const mode = config.momentumCandleMode ?? 'CONSERVATIVE';

  const maxWickPercent = Math.max(
    0,
    Math.min(100, config.maxWickPercent ?? 30),
  );

  const useConsolidationFilter =
    config.useConsolidationFilter ?? false;

  const consolidationCount = Math.max(
    1,
    Math.floor(config.consolidationCount ?? 3),
  );

  const useEmaFilter = config.useEmaFilter ?? false;

  const signals: MomentumSignal[] = [];

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];

    const body = calculateBody(candle);

    // Doji tidak dianggap sebagai momentum candle.
    if (body <= 0) continue;

    // Filter minimum body.
    if (minimumBody > 0 && body < minimumBody) continue;

    const bullish = isBullish(candle);
    const bearish = isBearish(candle);

    if (!bullish && !bearish) continue;

    // Filter wick hanya untuk mode Conservative.
    if (
      mode === 'CONSERVATIVE' &&
      !passesWickFilter(candle, maxWickPercent)
    ) {
      continue;
    }

    // Filter consolidation.
    if (
      useConsolidationFilter &&
      !passesConsolidationFilter(
        candles,
        i,
        consolidationCount,
      )
    ) {
      continue;
    }

    // Filter EMA.
    if (useEmaFilter) {
      const ema = emaValues?.[i];

      // Jangan menghasilkan sinyal jika data EMA belum tersedia.
      if (ema === undefined || !Number.isFinite(ema)) {
        continue;
      }

      if (bullish && candle.close <= ema) continue;
      if (bearish && candle.close >= ema) continue;
    }

    signals.push({
      time: candle.timestamp,
      type: bullish ? 'BULLISH' : 'BEARISH',
      price: bullish ? candle.low : candle.high,
      candleIndex: i,
    });
  }

  return signals;
}


export type MomentumCandleMode = 'Agresif' | 'Konservatif';

export type MomentumCandleTimeframe = 'M5' | 'M15' | 'M30';

export interface MomentumCandle {
  timestamp: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface PairTimeframeSettings {
  enabled: boolean;
  minBody: number;
}

export interface MomentumCandleOptions {
  modeCandle: MomentumCandleMode;
  modeAlert: MomentumCandleMode;
  wickPct: number;

  useKons: boolean;
  konsCount: number;

  useEMA: boolean;
  emaTimeframe: 'M5' | 'M15' | 'M30' | 'H1';
  emaPeriod: number;

  pairs: {
    XAUUSD: {
      enabled: boolean;
      M5: PairTimeframeSettings;
      M15: PairTimeframeSettings;
      M30: PairTimeframeSettings;
    };
    USDJPY: {
      enabled: boolean;
      M5: PairTimeframeSettings;
      M15: PairTimeframeSettings;
      M30: PairTimeframeSettings;
    };
    GBPUSD: {
      enabled: boolean;
      M5: PairTimeframeSettings;
      M15: PairTimeframeSettings;
      M30: PairTimeframeSettings;
    };
    AUDUSD: {
      enabled: boolean;
      M5: PairTimeframeSettings;
      M15: PairTimeframeSettings;
      M30: PairTimeframeSettings;
    };
    USDCAD: {
      enabled: boolean;
      M5: PairTimeframeSettings;
      M15: PairTimeframeSettings;
      M30: PairTimeframeSettings;
    };
    EURUSD: {
      enabled: boolean;
      M5: PairTimeframeSettings;
      M15: PairTimeframeSettings;
      M30: PairTimeframeSettings;
    };
    NZDUSD: {
      enabled: boolean;
      M5: PairTimeframeSettings;
      M15: PairTimeframeSettings;
      M30: PairTimeframeSettings;
    };
    USDCHF: {
      enabled: boolean;
      M5: PairTimeframeSettings;
      M15: PairTimeframeSettings;
      M30: PairTimeframeSettings;
    };
    BTCUSD: {
      enabled: boolean;
      M5: PairTimeframeSettings;
      M15: PairTimeframeSettings;
      M30: PairTimeframeSettings;
    };
  };
}

export interface MomentumCandleSignal {
  timestamp: number;
  direction: 'BULLISH' | 'BEARISH';
  open: number;
  high: number;
  low: number;
  close: number;
  bodySize: number;
  upperWick: number;
  lowerWick: number;
  minBody: number;
  emaValue: number | null;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null;
  validAlert: boolean;
}

export const DEFAULT_MOMENTUM_CANDLE_OPTIONS: MomentumCandleOptions = {
  modeCandle: 'Agresif',
  modeAlert: 'Agresif',
  wickPct: 30,

  useKons: false,
  konsCount: 3,

  useEMA: false,
  emaTimeframe: 'H1',
  emaPeriod: 50,

  pairs: {
    XAUUSD: {
      enabled: true,
      M5: { enabled: true, minBody: 35 },
      M15: { enabled: true, minBody: 45 },
      M30: { enabled: true, minBody: 55 },
    },
    USDJPY: {
      enabled: false,
      M5: { enabled: true, minBody: 10 },
      M15: { enabled: true, minBody: 15 },
      M30: { enabled: true, minBody: 20 },
    },
    GBPUSD: {
      enabled: false,
      M5: { enabled: true, minBody: 10 },
      M15: { enabled: true, minBody: 15 },
      M30: { enabled: true, minBody: 20 },
    },
    AUDUSD: {
      enabled: false,
      M5: { enabled: true, minBody: 10 },
      M15: { enabled: true, minBody: 15 },
      M30: { enabled: true, minBody: 20 },
    },
    USDCAD: {
      enabled: false,
      M5: { enabled: true, minBody: 10 },
      M15: { enabled: true, minBody: 15 },
      M30: { enabled: true, minBody: 20 },
    },
    EURUSD: {
      enabled: false,
      M5: { enabled: true, minBody: 10 },
      M15: { enabled: true, minBody: 15 },
      M30: { enabled: true, minBody: 20 },
    },
    NZDUSD: {
      enabled: false,
      M5: { enabled: true, minBody: 10 },
      M15: { enabled: true, minBody: 15 },
      M30: { enabled: true, minBody: 20 },
    },
    USDCHF: {
      enabled: false,
      M5: { enabled: true, minBody: 10 },
      M15: { enabled: true, minBody: 15 },
      M30: { enabled: true, minBody: 20 },
    },
    BTCUSD: {
      enabled: false,
      M5: { enabled: true, minBody: 80 },
      M15: { enabled: true, minBody: 120 },
      M30: { enabled: true, minBody: 160 },
    },
  },
};

const PIP_MULTIPLIERS: Record<string, number> = {
  XAUUSD: 0.1,
  USDJPY: 0.01,
  GBPUSD: 0.0001,
  AUDUSD: 0.0001,
  USDCAD: 0.0001,
  EURUSD: 0.0001,
  NZDUSD: 0.0001,
  USDCHF: 0.0001,
  BTCUSD: 1,
};

const TIMEFRAME_SECONDS: Record<string, number> = {
  M5: 5 * 60,
  M15: 15 * 60,
  M30: 30 * 60,
  H1: 60 * 60,
};

function normalizeSymbol(symbol: string): string | null {
  const normalized = symbol
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  // Mendukung nama simbol dengan suffix broker,
  // misalnya XAUUSDm atau XAUUSD.pro.
  return (
    Object.keys(PIP_MULTIPLIERS).find((pair) =>
      normalized.startsWith(pair),
    ) ?? null
  );
}

function normalizeTimeframe(
  timeframe: string,
): MomentumCandleTimeframe | null {
  const normalized = timeframe.toUpperCase();

  if (['M5', '5', '5M'].includes(normalized)) return 'M5';
  if (['M15', '15', '15M'].includes(normalized)) return 'M15';
  if (['M30', '30', '30M'].includes(normalized)) return 'M30';

  return null;
}

function calculateEMA(
  candles: MomentumCandle[],
  period: number,
): Array<{ timestamp: number; value: number }> {
  if (period < 1 || candles.length === 0) {
    return [];
  }

  const sorted = [...candles]
    .filter((candle) =>
      Number.isFinite(Number(candle.timestamp)) &&
      Number.isFinite(Number(candle.close)),
    )
    .sort(
      (a, b) =>
        Number(a.timestamp) - Number(b.timestamp),
    );

  const multiplier = 2 / (period + 1);
  const result: Array<{ timestamp: number; value: number }> = [];

  let ema = Number(sorted[0]?.close);

  for (const candle of sorted) {
    const close = Number(candle.close);

    ema = close * multiplier + ema * (1 - multiplier);

    result.push({
      timestamp: Number(candle.timestamp),
      value: ema,
    });
  }

  return result;
}

function getEMAAtTime(
  emaValues: Array<{ timestamp: number; value: number }>,
  timestamp: number,
): number | null {
  let result: number | null = null;

  for (const item of emaValues) {
    if (item.timestamp > timestamp) break;
    result = item.value;
  }

  return result;
}

function isConsolidationValid(
  candles: MomentumCandle[],
  index: number,
  currentBody: number,
  count: number,
): boolean {
  if (index < count) {
    return false;
  }

  for (let offset = 1; offset <= count; offset += 1) {
    const previous = candles[index - offset];
    const previousBody = Math.abs(
      Number(previous.close) - Number(previous.open),
    );

    if (previousBody >= currentBody) {
      return false;
    }
  }

  return true;
}

export function calculateMomentumCandleSignals(
  candles: MomentumCandle[],
  symbol: string,
  timeframe: string,
  options: MomentumCandleOptions = DEFAULT_MOMENTUM_CANDLE_OPTIONS,
  emaCandles: MomentumCandle[] = [],
  nowMs: number = Date.now(),
): MomentumCandleSignal[] {
  const pair = normalizeSymbol(symbol);
  const tf = normalizeTimeframe(timeframe);

  if (!pair || !tf || !options.pairs[pair as keyof MomentumCandleOptions['pairs']]) {
    return [];
  }

  const pairSettings =
    options.pairs[pair as keyof MomentumCandleOptions['pairs']];

  if (!pairSettings.enabled || !pairSettings[tf].enabled) {
    return [];
  }

  const pipMultiplier = PIP_MULTIPLIERS[pair];
  const minBody =
    pairSettings[tf].minBody * pipMultiplier;

  const sortedCandles = [...candles]
    .filter((candle) =>
      [
        Number(candle.timestamp),
        Number(candle.open),
        Number(candle.high),
        Number(candle.low),
        Number(candle.close),
      ].every(Number.isFinite),
    )
    .sort(
      (a, b) =>
        Number(a.timestamp) - Number(b.timestamp),
    );

  const emaValues = options.useEMA
    ? calculateEMA(emaCandles, options.emaPeriod)
    : [];

  const signals: MomentumCandleSignal[] = [];

  for (let index = 0; index < sortedCandles.length; index += 1) {
    const candle = sortedCandles[index];

    const open = Number(candle.open);
    const high = Number(candle.high);
    const low = Number(candle.low);
    const close = Number(candle.close);
    const timestamp = Number(candle.timestamp);

    const bodySize = Math.abs(close - open);
    const upperWick = high - Math.max(open, close);
    const lowerWick = Math.min(open, close) - low;
    const totalWick = upperWick + lowerWick;
    const totalSize = bodySize + totalWick;

    if (bodySize < minBody || totalSize <= 0) {
      continue;
    }

    const wickPercentage = (totalWick / totalSize) * 100;

    if (wickPercentage > options.wickPct) {
      continue;
    }

    const bullish = close > open;
    const bearish = close < open;

    if (!bullish && !bearish) {
      continue;
    }

    if (options.modeCandle === 'Konservatif') {
      if (bullish && lowerWick >= upperWick) continue;
      if (bearish && upperWick >= lowerWick) continue;
    }

    if (
      options.useKons &&
      !isConsolidationValid(
        sortedCandles,
        index,
        bodySize,
        options.konsCount,
      )
    ) {
      continue;
    }

    let emaValue: number | null = null;
    let trend: MomentumCandleSignal['trend'] = null;

    if (options.useEMA) {
      emaValue = getEMAAtTime(emaValues, timestamp);

      // Belum ada data EMA yang sesuai dengan waktu candle.
      if (emaValue === null) {
        continue;
      }

      if (close > emaValue) {
        trend = 'BULLISH';
      } else if (close < emaValue) {
        trend = 'BEARISH';
      } else {
        trend = 'NEUTRAL';
      }

      if (bullish && trend !== 'BULLISH') continue;
      if (bearish && trend !== 'BEARISH') continue;
    }

    const candleDuration =
      TIMEFRAME_SECONDS[tf] * 1000;

    const candleCloseTime =
      timestamp * 1000 + candleDuration;

    const timeLeft = candleCloseTime - nowMs;

    const alertWindow =
      timeLeft <= 90000 && timeLeft >= 20000;

    const validAlert =
      options.modeAlert === 'Agresif' || alertWindow;

    signals.push({
      timestamp,
      direction: bullish ? 'BULLISH' : 'BEARISH',
      open,
      high,
      low,
      close,
      bodySize,
      upperWick,
      lowerWick,
      minBody,
      emaValue,
      trend,
      validAlert,
    });
  }

  return signals;
}

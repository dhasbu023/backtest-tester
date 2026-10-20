import { Candle, Timeframe, TIMEFRAME_ORDER, TIMEFRAME_SECONDS } from '../types/index.js';

/**
 * Returns allowed chart timeframes for a given source timeframe.
 * Rule: Cannot choose a timeframe lower than source timeframe.
 */
export function getAllowedTimeframes(sourceTf: Timeframe): Timeframe[] {
  const sourceIndex = TIMEFRAME_ORDER.indexOf(sourceTf);
  if (sourceIndex === -1) return ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];
  return TIMEFRAME_ORDER.slice(sourceIndex);
}

/**
 * Checks if a target timeframe is valid for a given source timeframe.
 */
export function isTimeframeAllowed(sourceTf: Timeframe, targetTf: Timeframe): boolean {
  const allowed = getAllowedTimeframes(sourceTf);
  return allowed.includes(targetTf);
}

/**
 * Aggregates source candles into target timeframe without leaking future data.
 * @param sourceCandles Raw source candles from database (sorted by timestamp asc)
 * @param sourceTf The source timeframe of the dataset (e.g. 'M1')
 * @param targetTf The requested chart timeframe (e.g. 'M5', 'H1')
 * @param maxTimestamp The current replay timestamp cutoff. Any candle with timestamp > maxTimestamp is excluded.
 */
export function aggregateCandles(
  sourceCandles: Candle[],
  sourceTf: Timeframe,
  targetTf: Timeframe,
  maxTimestamp?: number
): Candle[] {
  const safeTargetTf = isTimeframeAllowed(sourceTf, targetTf) ? targetTf : sourceTf;

  // Filter out any candles beyond current replay timestamp cutoff (NO FUTURE DATA LEAK)
  const visibleSourceCandles = maxTimestamp !== undefined
    ? sourceCandles.filter((c) => c.timestamp <= maxTimestamp)
    : sourceCandles;

  if (visibleSourceCandles.length === 0) {
    return [];
  }

  // If same timeframe, return visible candles directly
  if (sourceTf === safeTargetTf) {
    return visibleSourceCandles;
  }

  const intervalSeconds = TIMEFRAME_SECONDS[safeTargetTf];
  const buckets = new Map<number, Candle[]>();

  for (const c of visibleSourceCandles) {
    // Standard UTC bucket alignment
    const bucketTime = Math.floor(c.timestamp / intervalSeconds) * intervalSeconds;
    let list = buckets.get(bucketTime);
    if (!list) {
      list = [];
      buckets.set(bucketTime, list);
    }
    list.push(c);
  }

  const aggregated: Candle[] = [];
  const sortedBucketTimes = Array.from(buckets.keys()).sort((a, b) => a - b);

  for (const bTime of sortedBucketTimes) {
    const list = buckets.get(bTime)!;
    if (list.length === 0) continue;

    const first = list[0];
    const last = list[list.length - 1];

    let high = -Infinity;
    let low = Infinity;
    let tickVol = 0;
    let realVol = 0;

    for (const item of list) {
      if (item.high > high) high = item.high;
      if (item.low < low) low = item.low;
      tickVol += item.tickVolume || 0;
      realVol += item.realVolume || 0;
    }

    aggregated.push({
      timestamp: bTime,
      open: first.open,
      high,
      low,
      close: last.close,
      tickVolume: tickVol,
      realVolume: realVol,
      spread: last.spread || 0,
    });
  }

  return aggregated;
}

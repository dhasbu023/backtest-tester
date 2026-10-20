
import {
  Candle,
  Timeframe,
  TIMEFRAME_ORDER,
  TIMEFRAME_SECONDS,
} from '../types/index.js';

/**
 * Mengembalikan timeframe yang diperbolehkan.
 * Timeframe target tidak boleh lebih kecil daripada timeframe sumber.
 */
export function getAllowedTimeframes(
  sourceTf: Timeframe
): Timeframe[] {
  const sourceIndex = TIMEFRAME_ORDER.indexOf(sourceTf);

  if (sourceIndex === -1) {
    return ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];
  }

  return TIMEFRAME_ORDER.slice(sourceIndex);
}

/**
 * Memeriksa apakah timeframe target diperbolehkan.
 */
export function isTimeframeAllowed(
  sourceTf: Timeframe,
  targetTf: Timeframe
): boolean {
  return getAllowedTimeframes(sourceTf).includes(targetTf);
}

/**
 * Mencari indeks pertama candle dengan timestamp > maxTimestamp.
 *
 * Membutuhkan sourceCandles yang terurut berdasarkan timestamp
 * secara ascending (lama ke baru).
 *
 * Binary search: O(log n).
 */
function findVisibleEndIndex(
  candles: Candle[],
  maxTimestamp: number
): number {
  let left = 0;
  let right = candles.length;

  while (left < right) {
    const middle = left + Math.floor((right - left) / 2);

    if (candles[middle].timestamp <= maxTimestamp) {
      left = middle + 1;
    } else {
      right = middle;
    }
  }

  return left;
}

/**
 * Mengagregasi candle sumber menjadi timeframe target.
 *
 * Fitur:
 * - Tidak memasukkan candle setelah batas waktu replay.
 * - Menggunakan binary search untuk mencari batas candle yang terlihat.
 * - Mengagregasi candle langsung tanpa membuat array untuk setiap bucket.
 * - Tidak memerlukan pengurutan bucket tambahan.
 *
 * CATATAN:
 * sourceCandles harus sudah terurut ascending berdasarkan timestamp.
 * Timestamp diasumsikan menggunakan satuan detik, sesuai implementasi lama.
 */
export function aggregateCandles(
  sourceCandles: Candle[],
  sourceTf: Timeframe,
  targetTf: Timeframe,
  maxTimestamp?: number
): Candle[] {
  if (sourceCandles.length === 0) {
    return [];
  }

  // Pertahankan fallback jika timeframe target tidak diperbolehkan.
  const safeTargetTf = isTimeframeAllowed(sourceTf, targetTf)
    ? targetTf
    : sourceTf;

  // Tentukan batas akhir data yang boleh digunakan.
  // Binary search menghindari filter seluruh array hanya untuk
  // menemukan candle yang terlihat pada posisi replay.
  const visibleEndIndex =
    maxTimestamp === undefined
      ? sourceCandles.length
      : findVisibleEndIndex(sourceCandles, maxTimestamp);

  if (visibleEndIndex === 0) {
    return [];
  }

  // Jika target sama dengan sumber, tidak perlu agregasi.
  if (sourceTf === safeTargetTf) {
    if (visibleEndIndex === sourceCandles.length) {
      return sourceCandles;
    }

    return sourceCandles.slice(0, visibleEndIndex);
  }

  const intervalSeconds = TIMEFRAME_SECONDS[safeTargetTf];

  if (!intervalSeconds || intervalSeconds <= 0) {
    return sourceCandles.slice(0, visibleEndIndex);
  }

  const aggregated: Candle[] = [];

  let currentBucketTime: number | null = null;
  let bucketOpen = 0;
  let bucketHigh = -Infinity;
  let bucketLow = Infinity;
  let bucketClose = 0;
  let bucketTickVolume = 0;
  let bucketRealVolume = 0;
  let bucketSpread = 0;

  // Simpan hasil satu bucket tanpa membuat array Candle[] tambahan.
  const flushBucket = () => {
    if (currentBucketTime === null) {
      return;
    }

    aggregated.push({
      timestamp: currentBucketTime,
      open: bucketOpen,
      high: bucketHigh,
      low: bucketLow,
      close: bucketClose,
      tickVolume: bucketTickVolume,
      realVolume: bucketRealVolume,
      spread: bucketSpread,
    });
  };

  for (let i = 0; i < visibleEndIndex; i++) {
    const candle = sourceCandles[i];

    // Bucket tetap mengikuti alignment UTC seperti kode sebelumnya.
    const bucketTime =
      Math.floor(candle.timestamp / intervalSeconds) *
      intervalSeconds;

    // Candle berpindah ke kelompok waktu berikutnya.
    if (bucketTime !== currentBucketTime) {
      flushBucket();

      currentBucketTime = bucketTime;
      bucketOpen = candle.open;
      bucketHigh = candle.high;
      bucketLow = candle.low;
      bucketClose = candle.close;
      bucketTickVolume = candle.tickVolume || 0;
      bucketRealVolume = candle.realVolume || 0;
      bucketSpread = candle.spread || 0;

      continue;
    }

    // Perbarui nilai OHLC dan volume pada bucket yang sama.
    if (candle.high > bucketHigh) {
      bucketHigh = candle.high;
    }

    if (candle.low < bucketLow) {
      bucketLow = candle.low;
    }

    bucketClose = candle.close;
    bucketTickVolume += candle.tickVolume || 0;
    bucketRealVolume += candle.realVolume || 0;
    bucketSpread = candle.spread || 0;
  }

  // Masukkan bucket terakhir.
  flushBucket();

  return aggregated;
}

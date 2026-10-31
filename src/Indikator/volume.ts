import type {
  Time,
  HistogramData,
} from 'lightweight-charts';

export type VolumeSource =
  | 'auto'
  | 'tickVolume'
  | 'realVolume'
  | 'volume';

export interface VolumeCandle {
  /**
   * Unix timestamp dalam detik (format yang dipakai chart aplikasi).
   * Null/NaN akan dilewati agar tidak membuat bar volume palsu.
   */
  time: number;
  open: number;
  close: number;
  volume?: number;
  tickVolume?: number;
  realVolume?: number;
}

export interface VolumeIndicatorOptions {
  source?: VolumeSource;
  bullishColor?: string;
  bearishColor?: string;
  neutralColor?: string;
}

/**
 * Bentuk candle aplikasi. Cukup mendeklarasikan field yang dibutuhkan
 * agar modul ini tidak bergantung pada tipe UI/chart.
 */
export interface ChartVolumeCandle {
  timestamp: number;
  open: number;
  close: number;
  volume?: number;
  tickVolume?: number;
  realVolume?: number;
}

const DEFAULT_OPTIONS: Required<VolumeIndicatorOptions> = {
  source: 'auto',
  bullishColor: '#26a69a',
  bearishColor: '#ef5350',
  neutralColor: '#9e9e9e',
};

/**
 * Mengambil nilai volume sesuai sumber yang diminta.
 *
 * - `tickVolume` / `realVolume` / `volume` bersifat eksplisit: tidak
 *   meminjam nilai dari jenis volume lain.
 * - `auto` memilih tick volume lebih dulu bila tersedia.
 * - Nilai `0` tetap dianggap data valid (bukan data yang hilang).
 * - Mengembalikan `null` jika field volume benar-benar tidak tersedia
 *   atau nilainya tidak valid.
 */
export function getVolumeValue(
  candle: VolumeCandle,
  source: VolumeSource = 'auto',
): number | null {
  let rawValue: number | undefined;

  switch (source) {
    case 'tickVolume':
      rawValue = candle.tickVolume;
      break;

    case 'realVolume':
      rawValue = candle.realVolume;
      break;

    case 'volume':
      rawValue = candle.volume;
      break;

    case 'auto':
    default:
      rawValue =
        candle.tickVolume ??
        candle.realVolume ??
        candle.volume;
      break;
  }

  if (rawValue === undefined || rawValue === null) {
    return null;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return value;
}

/**
 * Membentuk data histogram volume dari candle.
 *
 * Data dinormalisasi agar aman untuk lightweight-charts:
 * - hanya timestamp valid yang dipakai,
 * - timestamp duplikat diambil nilai terakhir,
 * - hasil diurutkan ascending,
 * - bar tanpa nilai volume tidak dibuat.
 */
export function buildVolumeData(
  candles: VolumeCandle[],
  options: VolumeIndicatorOptions = {},
): HistogramData<Time>[] {
  const config: Required<VolumeIndicatorOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const pointsByTime = new Map<number, HistogramData<Time>>();

  for (const candle of candles) {
    const timestamp = Math.floor(candle.time);

    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      continue;
    }

    const value = getVolumeValue(candle, config.source);

    if (value === null) {
      continue;
    }

    let color = config.neutralColor;

    if (
      Number.isFinite(candle.close) &&
      Number.isFinite(candle.open)
    ) {
      if (candle.close > candle.open) {
        color = config.bullishColor;
      } else if (candle.close < candle.open) {
        color = config.bearishColor;
      }
    }

    pointsByTime.set(timestamp, {
      time: timestamp as Time,
      value,
      color,
    });
  }

  return Array.from(pointsByTime.values()).sort(
    (a, b) => Number(a.time) - Number(b.time),
  );
}

/**
 * Adapter candle aplikasi (timestamp + OHLC + volume) menjadi data
 * histogram. Semua normalisasi volume tetap berada di modul ini agar
 * komponen chart tidak menyimpan logika volume sendiri.
 */
export function buildVolumeDataFromCandles(
  candles: readonly ChartVolumeCandle[],
  options: VolumeIndicatorOptions = {},
): HistogramData<Time>[] {
  return buildVolumeData(
    candles.map((candle) => ({
      time: candle.timestamp,
      open: candle.open,
      close: candle.close,
      volume: candle.volume,
      tickVolume: candle.tickVolume,
      realVolume: candle.realVolume,
    })),
    options,
  );
}

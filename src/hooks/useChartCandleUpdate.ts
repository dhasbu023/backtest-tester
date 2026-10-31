// ============================================================
// IMPORTS
// ============================================================

import { useEffect, type Dispatch, type SetStateAction } from 'react';

import type {
  ISeriesApi,
  Time,
  CandlestickData,
} from 'lightweight-charts';

import type { Candle } from '../types/index.js';

// ============================================================
// TYPES
// ============================================================

// Tipe ref sederhana agar bisa menerima ref dari TradingChart.
interface RefLike<T> {
  current: T;
}

// Props yang dibutuhkan oleh hook.
interface UseChartCandleUpdateProps {
  candles: Candle[];

  candlestickSeriesRef: RefLike<ISeriesApi<'Candlestick'> | null>;

  candlesRef: RefLike<Candle[]>;

  setHoveredCandle: Dispatch<SetStateAction<Candle | null>>;
}

// ============================================================
// HOOK: UPDATE CHART CANDLE DATA
// Memperbarui data candle tanpa membuat ulang chart.
// ============================================================

export function useChartCandleUpdate({
  candles,
  candlestickSeriesRef,
  candlesRef,
  setHoveredCandle,
}: UseChartCandleUpdateProps): void {
  useEffect(() => {
    // --------------------------------------------------------
    // 1. SIMPAN DATA CANDLE TERBARU KE REF
    // --------------------------------------------------------

    candlesRef.current = candles;

    // --------------------------------------------------------
    // 2. AMBIL CANDLE SERIES YANG SUDAH ADA
    // --------------------------------------------------------

    const series = candlestickSeriesRef.current;

    // Series belum tersedia, hentikan proses.
    if (!series) return;

    try {
      // ------------------------------------------------------
      // 3. TANGANI DATA CANDLE KOSONG
      // ------------------------------------------------------

      if (!candles || candles.length === 0) {
        series.setData([]);
        setHoveredCandle(null);
        return;
      }

      // ------------------------------------------------------
      // 4. VALIDASI DAN NORMALISASI DATA CANDLE
      // ------------------------------------------------------

      const uniqueCandles = new Map<number, CandlestickData<Time>>();

      candles.forEach((candle) => {
        const timestamp = Math.floor(Number(candle.timestamp));

        const open = Number(candle.open);
        const high = Number(candle.high);
        const low = Number(candle.low);
        const close = Number(candle.close);

        // Lewati candle dengan data yang tidak valid.
        if (
          !Number.isFinite(timestamp) ||
          !Number.isFinite(open) ||
          !Number.isFinite(high) ||
          !Number.isFinite(low) ||
          !Number.isFinite(close)
        ) {
          return;
        }

        // Pastikan high tidak lebih rendah dari open/close.
        const normalizedHigh = Math.max(high, open, close);

        // Pastikan low tidak lebih tinggi dari open/close.
        const normalizedLow = Math.min(low, open, close);

        // Simpan candle berdasarkan timestamp.
        // Jika timestamp sama, data terakhir akan digunakan.
        uniqueCandles.set(timestamp, {
          time: timestamp as Time,
          open,
          high: normalizedHigh,
          low: normalizedLow,
          close,
        });
      });

      // ------------------------------------------------------
      // 5. URUTKAN DATA BERDASARKAN WAKTU
      // ------------------------------------------------------

      const sortedCandles = Array.from(uniqueCandles.values()).sort(
        (a, b) => Number(a.time) - Number(b.time),
      );

      // ------------------------------------------------------
      // 6. PERBARUI DATA CANDLE PADA CHART
      // ------------------------------------------------------

      series.setData(sortedCandles);
    } catch (error) {
      // ------------------------------------------------------
      // 7. TANGANI ERROR
      // ------------------------------------------------------

      console.error('[Chart Candle Update] Gagal memperbarui candle:', error);
    }
  }, [
    candles,
    candlestickSeriesRef,
    candlesRef,
    setHoveredCandle,
  ]);
}
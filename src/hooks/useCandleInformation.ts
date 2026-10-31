import { useMemo } from 'react';

import type { Candle } from '../types/index.js';

interface UseCandleInformationResult {
  displayedCandle: Candle | null;
  candleChange: number;
  candleChangePercent: number;
}

export function useCandleInformation(
  candles: Candle[],
  hoveredCandle: Candle | null,
): UseCandleInformationResult {
  // Gunakan candle yang sedang di-hover.
  // Jika tidak ada, gunakan candle terakhir.
  const displayedCandle = useMemo<Candle | null>(() => {
    return hoveredCandle ?? candles[candles.length - 1] ?? null;
  }, [hoveredCandle, candles]);

  // Hitung perubahan harga dari candle sebelumnya.
  const candleChange = useMemo(() => {
    if (!displayedCandle) return 0;

    const currentIndex = candles.findIndex(
      (candle) =>
        Math.floor(candle.timestamp) ===
        Math.floor(displayedCandle.timestamp),
    );

    if (currentIndex <= 0) return 0;

    const previousCandle = candles[currentIndex - 1];

    if (!previousCandle) return 0;

    return displayedCandle.close - previousCandle.close;
  }, [displayedCandle, candles]);

  // Hitung persentase perubahan dari candle sebelumnya.
  const candleChangePercent = useMemo(() => {
    if (!displayedCandle) return 0;

    const currentIndex = candles.findIndex(
      (candle) =>
        Math.floor(candle.timestamp) ===
        Math.floor(displayedCandle.timestamp),
    );

    if (currentIndex <= 0) return 0;

    const previousCandle = candles[currentIndex - 1];

    if (!previousCandle || previousCandle.close === 0) {
      return 0;
    }

    return (candleChange / previousCandle.close) * 100;
  }, [displayedCandle, candles, candleChange]);

  return {
    displayedCandle,
    candleChange,
    candleChangePercent,
  };
}

import { useMemo } from 'react';

import {
  createSeriesMarkers,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';

import type { Candle, IndicatorConfig } from '../types';

import {
  calculateMomentumCandleSignals,
  calculateMomentumEMA,
} from '../Indikator/momentumCandle';

interface UseMomentumCandleProps {
  candles: Candle[];
  indicators: IndicatorConfig[];
  symbol: string;
  timeframe: string;
}

export function useMomentumCandle({
  candles,
  indicators,
  symbol,
  timeframe,
}: UseMomentumCandleProps) {
  const markers = useMemo<SeriesMarker<Time>[]>(() => {
    // Cari konfigurasi Momentum Candle.
    const config = indicators.find(
      (indicator) =>
        indicator.type === 'MOMENTUM_CANDLE' &&
        indicator.visible,
    );

    // Tidak ada indikator aktif.
    if (!config || candles.length === 0) {
      return [];
    }

    // EMA hanya dihitung dari candle yang timeframe-nya
    // sama dengan timeframe EMA yang dipilih.
    //
    // Jika berbeda, sinyal tidak ditampilkan dulu.
    // Kita akan tangani agregasi timeframe pada tahap
    // integrasi berikutnya agar hasil EMA tidak keliru.
    let emaValues: number[] | undefined;

    if (config.useEmaFilter) {
      if (config.emaTimeframe !== timeframe) {
        return [];
      }

      emaValues = calculateMomentumEMA(
        candles,
        config.emaPeriod ?? 50,
      );
    }

    // Hitung sinyal Momentum Candle.
    const signals = calculateMomentumCandleSignals(
      {
        candles,
        symbol,
        timeframe,
        config,
      },
      emaValues,
    );

    // Ubah sinyal menjadi marker Lightweight Charts.
    return signals.map((signal): SeriesMarker<Time> => {
      const isBullish = signal.type === 'BULLISH';

      return {
        time: signal.time as UTCTimestamp,
        position: isBullish ? 'belowBar' : 'aboveBar',
        color: isBullish ? '#22c55e' : '#ef4444',
        shape: isBullish ? 'arrowUp' : 'arrowDown',
        text: isBullish ? 'BUY' : 'SELL',
      };
    });
  }, [candles, indicators, symbol, timeframe]);

  return markers;
}

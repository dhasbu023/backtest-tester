
import { useEffect } from 'react';

import {
  HistogramSeries,
  type IChartApi,
  type IPaneApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts';

import type { Candle } from '../types/index.js';

import {
  buildVolumeDataFromCandles,
} from '../Indikator/volume.js';

import {
  SUB_PANE_HEIGHT,
} from '../components/Chart/utils/chartConstants.js';

type ChartRef = {
  current: IChartApi | null;
};

type VolumeSeriesRef = {
  current: ISeriesApi<'Histogram'> | null;
};

type VolumePaneRef = {
  current: IPaneApi<Time> | null;
};

interface UseVolumeSeriesProps {
  chartRef: ChartRef;
  volumeSeriesRef: VolumeSeriesRef;
  volumePaneRef: VolumePaneRef;
  candles: Candle[];
  volumeVisible: boolean;
  volumeType: 'TICK' | 'REAL';
  hasRealVolume: boolean;
  volumeColor: string;
  schedulePaneElementsSync: () => void;
}

export function useVolumeSeries({
  chartRef,
  volumeSeriesRef,
  volumePaneRef,
  candles,
  volumeVisible,
  volumeType,
  hasRealVolume,
  volumeColor,
  schedulePaneElementsSync,
}: UseVolumeSeriesProps): void {
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const realVolumeUnavailable =
      volumeType === 'REAL' && !hasRealVolume;

    const shouldShowVolume =
      volumeVisible &&
      candles.length > 0 &&
      !realVolumeUnavailable;

    // =====================================================
    // HAPUS VOLUME JIKA TIDAK DITAMPILKAN
    // =====================================================

    if (!shouldShowVolume) {
      const series = volumeSeriesRef.current;
      const pane = volumePaneRef.current;

      if (!series && !pane) return;

      volumeSeriesRef.current = null;
      volumePaneRef.current = null;

      if (series) {
        try {
          chart.removeSeries(series);
        } catch {
          // Series mungkin sudah dilepas.
        }
      }

      if (pane) {
        try {
          chart.removePane(pane.paneIndex());
        } catch {
          // Pane mungkin sudah dilepas.
        }
      }

      schedulePaneElementsSync();

      return;
    }

    // =====================================================
    // BUAT PANE VOLUME
    // =====================================================

    let pane = volumePaneRef.current;
    let paneCreated = false;

    if (!pane) {
      try {
        pane = chart.addPane(true);
        pane.setHeight(SUB_PANE_HEIGHT);

        volumePaneRef.current = pane;
        paneCreated = true;
      } catch (error) {
        console.error(
          '[useVolumeSeries] Gagal membuat pane volume:',
          error,
        );
        return;
      }
    }

    if (paneCreated) {
      schedulePaneElementsSync();
    }

    // =====================================================
    // BUAT HISTOGRAM SERIES
    // =====================================================

    let series = volumeSeriesRef.current;

    if (!series) {
      try {
        series = pane.addSeries(HistogramSeries, {
          priceFormat: {
            type: 'volume',
          },
          priceLineVisible: false,
          lastValueVisible: false,
        });

        series.priceScale().applyOptions({
          scaleMargins: {
            top: 0.1,
            bottom: 0,
          },
        });

        volumeSeriesRef.current = series;
      } catch (error) {
        console.error(
          '[useVolumeSeries] Gagal membuat seri volume:',
          error,
        );
        return;
      }
    }

    // =====================================================
    // UPDATE DATA VOLUME
    // =====================================================

    try {
      const data = buildVolumeDataFromCandles(candles, {
        source:
          volumeType === 'REAL'
            ? 'realVolume'
            : 'tickVolume',
        bullishColor: volumeColor,
        bearishColor: '#ef5350',
        neutralColor: '#94a3b8',
      });

      series.applyOptions({
        visible: true,
        color: volumeColor,
      });

      series.setData(data);
    } catch (error) {
      console.error(
        '[useVolumeSeries] Gagal memperbarui volume:',
        error,
      );

      try {
        series.setData([]);
      } catch {
        // Chart mungkin sudah dilepas.
      }
    }
  }, [
    chartRef,
    volumeSeriesRef,
    volumePaneRef,
    candles,
    volumeVisible,
    volumeType,
    hasRealVolume,
    volumeColor,
    schedulePaneElementsSync,
  ]);
}

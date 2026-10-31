import { useEffect, type MutableRefObject } from 'react';

import {
  LineSeries,
  type IChartApi,
  type IPaneApi,
  type ISeriesApi,
  type Time,
  type LineData,
} from 'lightweight-charts';

import type {
  Candle,
  IndicatorConfig,
} from '../types/index.js';

import {
  calculateRSI,
  calculateATR,
} from '../utils/indicators.js';

import { SUB_PANE_HEIGHT } from '../components/Chart/utils/chartConstants.js';

export type SubPaneType = 'RSI' | 'ATR' | 'VOLUME';

interface UseSubIndicatorSeriesParams {
  chartRef: MutableRefObject<IChartApi | null>;

  candles: Candle[];
  indicators: IndicatorConfig[];

  subIndicatorPanesRef: MutableRefObject<
    Map<SubPaneType, IPaneApi<Time>>
  >;

  subIndicatorSeriesMapRef: MutableRefObject<
    Map<string, ISeriesApi<'Line'>>
  >;

  volumePaneRef: MutableRefObject<IPaneApi<Time> | null>;

  schedulePaneElementsSync: () => void;
}

export function useSubIndicatorSeries({
  chartRef,
  candles,
  indicators,
  subIndicatorPanesRef,
  subIndicatorSeriesMapRef,
  volumePaneRef,
  schedulePaneElementsSync,
}: UseSubIndicatorSeriesParams) {
  useEffect(() => {
    const chart = chartRef.current;

    if (!chart) return;

    const active = indicators.filter(
      (indicator) =>
        indicator.pane === 'sub' &&
        indicator.visible &&
        (indicator.type === 'RSI' || indicator.type === 'ATR'),
    );

    const needed = new Set<string>();
    const activeTypes = new Set<SubPaneType>();

    const paneByType = subIndicatorPanesRef.current;

    let panesChanged = false;

    // =====================================================
    // CREATE / UPDATE SUB-INDICATOR SERIES
    // =====================================================

    for (const indicator of active) {
      const type: SubPaneType =
        indicator.type === 'RSI' ? 'RSI' : 'ATR';

      needed.add(indicator.id);
      activeTypes.add(type);

      let pane = paneByType.get(type);

      // -------------------------------------------------
      // CREATE PANE
      // -------------------------------------------------

      if (!pane) {
        try {
          pane = chart.addPane(true);

          pane.setHeight(SUB_PANE_HEIGHT);

          // Pertahankan volume di bagian paling bawah.
          const volumePane = volumePaneRef.current;

          if (volumePane) {
            try {
              pane.moveTo(volumePane.paneIndex());
            } catch {
              // Pane mungkin belum siap dipindahkan.
            }
          }

          paneByType.set(type, pane);

          panesChanged = true;
        } catch (error) {
          console.error(
            `[SubIndicatorSeries] Gagal membuat pane ${type}:`,
            error,
          );

          continue;
        }
      }

      // -------------------------------------------------
      // GET EXISTING SERIES
      // -------------------------------------------------

      let series = subIndicatorSeriesMapRef.current.get(
        indicator.id,
      );

      const lineColor =
        indicator.color ||
        (indicator.type === 'RSI' ? '#a855f7' : '#f59e0b');

      const lineWidth = Math.max(
        1,
        Math.min(4, indicator.strokeWidth || 2),
      ) as 1 | 2 | 3 | 4;

      // -------------------------------------------------
      // CREATE SERIES
      // -------------------------------------------------

      if (!series) {
        try {
          series = pane.addSeries(LineSeries, {
            color: lineColor,
            lineWidth,
            title: indicator.name || indicator.type,
            crosshairMarkerVisible: true,
            priceLineVisible: false,
            lastValueVisible: true,

            ...(indicator.type === 'RSI'
              ? {
                  autoscaleInfoProvider: () => ({
                    priceRange: {
                      minValue: 0,
                      maxValue: 100,
                    },
                    margins: {
                      above: 0,
                      below: 0,
                    },
                  }),
                }
              : {}),
          });

          subIndicatorSeriesMapRef.current.set(
            indicator.id,
            series,
          );
        } catch (error) {
          console.error(
            `[SubIndicatorSeries] Gagal membuat seri ${indicator.type}:`,
            error,
          );

          continue;
        }
      } else {
        // -------------------------------------------------
        // UPDATE EXISTING SERIES OPTIONS
        // -------------------------------------------------

        series.applyOptions({
          color: lineColor,
          lineWidth,
          title: indicator.name || indicator.type,
          visible: true,
        });
      }

      // -------------------------------------------------
      // CALCULATE INDICATOR
      // -------------------------------------------------

      const points =
        indicator.type === 'RSI'
          ? calculateRSI(candles, indicator.period || 14)
          : calculateATR(candles, indicator.period || 14);

      const data: LineData<Time>[] = points
        .filter(
          (point) =>
            Number.isFinite(point.time) &&
            Number.isFinite(point.value),
        )
        .map((point) => ({
          time: Math.floor(point.time) as Time,
          value: point.value,
        }));

      // -------------------------------------------------
      // UPDATE SERIES DATA
      // -------------------------------------------------

      try {
        series.setData(data);
      } catch (error) {
        console.error(
          `[SubIndicatorSeries] Gagal memperbarui data ${indicator.type}:`,
          error,
        );
      }
    }

    // =====================================================
    // REMOVE UNUSED SERIES
    // =====================================================

    for (const [id, series] of subIndicatorSeriesMapRef.current) {
      if (needed.has(id)) continue;

      try {
        chart.removeSeries(series);
      } catch {
        // Seri mungkin sudah dilepas.
      }

      subIndicatorSeriesMapRef.current.delete(id);
    }

    // =====================================================
    // REMOVE UNUSED PANES
    // =====================================================

    for (const [type, pane] of Array.from(paneByType.entries())) {
      if (activeTypes.has(type)) continue;

      paneByType.delete(type);

      panesChanged = true;

      try {
        chart.removePane(pane.paneIndex());
      } catch {
        // Pane mungkin sudah dilepas.
      }
    }

    // =====================================================
    // SYNC PANE ELEMENTS
    // =====================================================

    if (panesChanged) {
      schedulePaneElementsSync();
    }
  }, [
    chartRef,
    candles,
    indicators,
    subIndicatorPanesRef,
    subIndicatorSeriesMapRef,
    volumePaneRef,
    schedulePaneElementsSync,
  ]);
}
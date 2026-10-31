
import { useEffect } from 'react';

import {
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type LineData,
} from 'lightweight-charts';

import type {
  Candle,
  IndicatorConfig,
} from '../types/index.js';

import {
  calculateEMA,
  calculateSMA,
  calculateBollingerBands,
} from '../utils/indicators.js';

type ChartRef = {
  current: IChartApi | null;
};

type CandlestickSeriesRef = {
  current: ISeriesApi<'Candlestick'> | null;
};

type LineSeriesMapRef = {
  current: Map<string, ISeriesApi<'Line'>>;
};

interface UseMainIndicatorSeriesProps {
  chartRef: ChartRef;
  candlestickSeriesRef: CandlestickSeriesRef;
  lineSeriesMapRef: LineSeriesMapRef;
  candles: Candle[];
  indicators: IndicatorConfig[];
}

export function useMainIndicatorSeries({
  chartRef,
  candlestickSeriesRef,
  lineSeriesMapRef,
  candles,
  indicators,
}: UseMainIndicatorSeriesProps): void {
  useEffect(() => {
    const chart = chartRef.current;

    if (!chart || !candlestickSeriesRef.current) return;

    const activeIndicators = indicators.filter(
      (indicator) =>
        indicator.pane === 'main' && indicator.visible,
    );

    const neededSeriesIds = new Set<string>();

    for (const indicator of activeIndicators) {
      if (
        indicator.type === 'EMA' ||
        indicator.type === 'SMA'
      ) {
        neededSeriesIds.add(indicator.id);

        let series = lineSeriesMapRef.current.get(indicator.id);

        if (!series) {
          series = chart.addSeries(LineSeries, {
            color: indicator.color,
            lineWidth: indicator.strokeWidth as 1 | 2 | 3 | 4,
            title: indicator.name,
            crosshairMarkerVisible: true,
          });

          lineSeriesMapRef.current.set(indicator.id, series);
        } else {
          series.applyOptions({
            color: indicator.color,
            lineWidth: indicator.strokeWidth as 1 | 2 | 3 | 4,
            title: indicator.name,
          });
        }

        const points =
          indicator.type === 'EMA'
            ? calculateEMA(candles, indicator.period)
            : calculateSMA(candles, indicator.period);

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

        series.setData(data);
      }

      if (indicator.type === 'BOLLINGER') {
        const upperId = `${indicator.id}-upper`;
        const middleId = `${indicator.id}-middle`;
        const lowerId = `${indicator.id}-lower`;

        neededSeriesIds.add(upperId);
        neededSeriesIds.add(middleId);
        neededSeriesIds.add(lowerId);

        let upperSeries = lineSeriesMapRef.current.get(upperId);
        let middleSeries = lineSeriesMapRef.current.get(middleId);
        let lowerSeries = lineSeriesMapRef.current.get(lowerId);

        if (!upperSeries) {
          upperSeries = chart.addSeries(LineSeries, {
            color: indicator.upperColor || indicator.color,
            lineWidth: 1,
            title: 'BB Upper',
          });

          lineSeriesMapRef.current.set(upperId, upperSeries);
        } else {
          upperSeries.applyOptions({
            color: indicator.upperColor || indicator.color,
            lineWidth: 1,
            title: 'BB Upper',
          });
        }

        if (!middleSeries) {
          middleSeries = chart.addSeries(LineSeries, {
            color: indicator.color,
            lineWidth: 2,
            title: 'BB Mid',
          });

          lineSeriesMapRef.current.set(middleId, middleSeries);
        } else {
          middleSeries.applyOptions({
            color: indicator.color,
            lineWidth: 2,
            title: 'BB Mid',
          });
        }

        if (!lowerSeries) {
          lowerSeries = chart.addSeries(LineSeries, {
            color: indicator.lowerColor || indicator.color,
            lineWidth: 1,
            title: 'BB Lower',
          });

          lineSeriesMapRef.current.set(lowerId, lowerSeries);
        } else {
          lowerSeries.applyOptions({
            color: indicator.lowerColor || indicator.color,
            lineWidth: 1,
            title: 'BB Lower',
          });
        }

        const bands = calculateBollingerBands(
          candles,
          indicator.period,
          indicator.stdDev || 2,
        );

        upperSeries.setData(
          bands.upper.map((point) => ({
            time: Math.floor(point.time) as Time,
            value: point.value,
          })),
        );

        middleSeries.setData(
          bands.middle.map((point) => ({
            time: Math.floor(point.time) as Time,
            value: point.value,
          })),
        );

        lowerSeries.setData(
          bands.lower.map((point) => ({
            time: Math.floor(point.time) as Time,
            value: point.value,
          })),
        );
      }
    }

    // Hapus series yang indikatornya sudah tidak aktif.
    for (const [id, series] of lineSeriesMapRef.current) {
      if (neededSeriesIds.has(id)) continue;

      try {
        chart.removeSeries(series);
      } catch {
        // Series mungkin sudah dilepas.
      }

      lineSeriesMapRef.current.delete(id);
    }
  }, [
    chartRef,
    candlestickSeriesRef,
    lineSeriesMapRef,
    candles,
    indicators,
  ]);
}

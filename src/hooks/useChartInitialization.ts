import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type CandlestickData,
} from 'lightweight-charts';

import type { Candle, DrawingObject } from '../types/index.js';
import { formatDateTimeWithTz } from '../utils/timezone.js';
import { toUnixTimestamp } from '../components/Chart/utils/chartTimeUtils.js';

interface RefLike<T> {
  current: T;
}

interface ContainerDimensions {
  width: number;
  height: number;
}

interface UseChartInitializationProps {
  containerRef: RefLike<HTMLDivElement | null>;

  chartRef: RefLike<IChartApi | null>;
  candlestickSeriesRef: RefLike<ISeriesApi<'Candlestick'> | null>;

  candlesRef: RefLike<Candle[]>;
  isDarkModeRef: RefLike<boolean>;
  activeTimezoneRef: RefLike<string>;

  lineSeriesMapRef: RefLike<Map<string, ISeriesApi<'Line'>>>;
  subIndicatorSeriesMapRef: RefLike<Map<string, ISeriesApi<'Line'>>>;
  subIndicatorPanesRef: RefLike<Map<string, unknown>>;

  volumeSeriesRef: RefLike<ISeriesApi<'Histogram'> | null>;
  volumePaneRef: RefLike<unknown>;

  setChartInstance: Dispatch<SetStateAction<IChartApi | null>>;
  setCandlestickSeriesInstance: Dispatch<
    SetStateAction<ISeriesApi<'Candlestick'> | null>
  >;

  setContainerDimensions: Dispatch<
    SetStateAction<ContainerDimensions>
  >;

  setHoveredCandle: Dispatch<SetStateAction<Candle | null>>;
  setSelectedDrawingId: Dispatch<SetStateAction<string | null>>;
}

export function useChartInitialization({
  containerRef,
  chartRef,
  candlestickSeriesRef,
  candlesRef,
  isDarkModeRef,
  activeTimezoneRef,
  lineSeriesMapRef,
  subIndicatorSeriesMapRef,
  subIndicatorPanesRef,
  volumeSeriesRef,
  volumePaneRef,
  setChartInstance,
  setCandlestickSeriesInstance,
  setContainerDimensions,
  setHoveredCandle,
  setSelectedDrawingId,
}: UseChartInitializationProps): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initialWidth = Math.max(container.clientWidth, 1);
    const initialHeight = Math.max(container.clientHeight, 1);

    const initialDarkMode = isDarkModeRef.current;

    setContainerDimensions({
      width: initialWidth,
      height: initialHeight,
    });

    const chart = createChart(container, {
      width: initialWidth,
      height: initialHeight,

      layout: {
        background: {
          type: ColorType.Solid,
          color: initialDarkMode ? '#0b0f19' : '#ffffff',
        },
        textColor: initialDarkMode ? '#94a3b8' : '#475569',
        fontSize: 11,
        fontFamily:
          "'JetBrains Mono', monospace, -apple-system, sans-serif",
      },

      grid: {
        vertLines: {
          color: initialDarkMode
            ? 'rgba(30, 41, 59, 0.6)'
            : '#f1f5f9',
        },
        horzLines: {
          color: initialDarkMode
            ? 'rgba(30, 41, 59, 0.6)'
            : '#f1f5f9',
        },
      },

      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: initialDarkMode ? '#3b82f6' : '#2563eb',
          width: 1,
          style: 3,
          labelBackgroundColor: initialDarkMode
            ? '#1e293b'
            : '#2563eb',
        },
        horzLine: {
          color: initialDarkMode ? '#3b82f6' : '#2563eb',
          width: 1,
          style: 3,
          labelBackgroundColor: initialDarkMode
            ? '#1e293b'
            : '#2563eb',
        },
      },

      localization: {
        timeFormatter: (timeValue: number) =>
          formatDateTimeWithTz(
            timeValue,
            activeTimezoneRef.current,
          ),
      },

      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },

      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        axisDoubleClickReset: {
          time: true,
          price: true,
        },
        mouseWheel: true,
        pinch: true,
      },

      timeScale: {
        borderColor: initialDarkMode ? '#1e293b' : '#e2e8f0',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 8,
        minBarSpacing: 2,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,

        tickMarkFormatter: (
          time: Time,
          tickMarkType: TickMarkType,
        ) => {
          const timestamp = toUnixTimestamp(time);
          if (timestamp === null) return '';

          const date = new Date(timestamp * 1000);
          const timezone = activeTimezoneRef.current;

          if (tickMarkType === TickMarkType.Year) {
            return date.toLocaleDateString('en-GB', {
              year: 'numeric',
              timeZone: timezone,
            });
          }

          if (tickMarkType === TickMarkType.Month) {
            return date.toLocaleDateString('en-GB', {
              month: 'short',
              timeZone: timezone,
            });
          }

          if (tickMarkType === TickMarkType.DayOfMonth) {
            return date.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              timeZone: timezone,
            });
          }

          return date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: timezone,
          });
        },
      },

      rightPriceScale: {
        borderColor: initialDarkMode ? '#1e293b' : '#e2e8f0',
        autoScale: true,
        scaleMargins: {
          top: 0.08,
          bottom: 0.08,
        },
      },
    });

    chartRef.current = chart;
    setChartInstance(chart);

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candlestickSeriesRef.current = candlestickSeries;
    setCandlestickSeriesInstance(candlestickSeries);

    chart.subscribeCrosshairMove((param) => {
      if (
        !param.time ||
        !param.seriesData ||
        param.point === undefined
      ) {
        setHoveredCandle((previous) =>
          previous === null ? previous : null,
        );
        return;
      }

      const barData = param.seriesData.get(
        candlestickSeries,
      ) as CandlestickData<Time> | undefined;

      if (
        !barData ||
        typeof barData.open !== 'number' ||
        typeof barData.high !== 'number' ||
        typeof barData.low !== 'number' ||
        typeof barData.close !== 'number'
      ) {
        setHoveredCandle((previous) =>
          previous === null ? previous : null,
        );
        return;
      }

      const timestamp = toUnixTimestamp(param.time);
      if (timestamp === null) return;

      const matched = candlesRef.current.find(
        (candle) =>
          Math.floor(candle.timestamp) === timestamp,
      );

      setHoveredCandle((previous) => {
        if (
          previous &&
          previous.timestamp === timestamp &&
          previous.open === barData.open &&
          previous.high === barData.high &&
          previous.low === barData.low &&
          previous.close === barData.close &&
          previous.tickVolume === (matched?.tickVolume ?? 0) &&
          previous.realVolume === (matched?.realVolume ?? 0)
        ) {
          return previous;
        }

        return {
          timestamp,
          open: barData.open,
          high: barData.high,
          low: barData.low,
          close: barData.close,
          tickVolume: matched?.tickVolume ?? 0,
          realVolume: matched?.realVolume ?? 0,
        };
      });
    });

    chart.subscribeClick(() => {
      setSelectedDrawingId(null);
    });

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);

      if (width <= 0 || height <= 0) return;

      chart.applyOptions({ width, height });

      setContainerDimensions((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height },
      );
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();

      if (chartRef.current === chart) {
        chartRef.current = null;
        candlestickSeriesRef.current = null;
        setChartInstance(null);
        setCandlestickSeriesInstance(null);
      }

      lineSeriesMapRef.current.clear();
      subIndicatorSeriesMapRef.current.clear();
      subIndicatorPanesRef.current.clear();
      volumeSeriesRef.current = null;
      volumePaneRef.current = null;
    };
  }, []);
}
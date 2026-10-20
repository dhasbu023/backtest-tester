
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type CandlestickData,
  type LineData,
} from 'lightweight-charts';

import type {
  Candle,
  Timeframe,
  DrawingObject,
  DrawingToolType,
  IndicatorConfig,
} from '../../types/index.js';

import { ChartToolbar } from './ChartToolbar.js';
import { DrawingToolbar } from './DrawingToolbar.js';
import { DrawingLayer } from '../DrawingLayer.js';
import { IndicatorModal } from '../IndicatorModal.js';
import { SubIndicatorsPane } from '../SubIndicatorsPane.js';

import {
  calculateEMA,
  calculateSMA,
  calculateBollingerBands,
} from '../../utils/indicators.js';

import {
  formatDateTimeWithTz,
  formatTimeOnly,
} from '../../utils/timezone.js';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface TradingChartProps {
  candles: Candle[];
  symbol: string;
  timeframe: Timeframe;
  sourceTimeframe: Timeframe;
  onChangeTimeframe: (tf: Timeframe) => void;
  isDarkMode: boolean;
  isLoading?: boolean;
  sessionId: string;
  activeTimezone: string;
  onChangeTimezone: (tz: string) => void;

  drawings: DrawingObject[];
  onUpdateDrawings: (drawings: DrawingObject[]) => void;

  indicators: IndicatorConfig[];
  onUpdateIndicators: (indicators: IndicatorConfig[]) => void;

  // Volume controls
  showVolume: boolean;
  onToggleVolume: () => void;
  volumeType: 'TICK' | 'REAL';
  onChangeVolumeType: (type: 'TICK' | 'REAL') => void;
  hasRealVolume: boolean;

  // Replay controls
  showReplayControls: boolean;
  onToggleReplay: () => void;
}

const DEFAULT_DRAWING_COLOR = '#3b82f6';
const DEFAULT_STROKE_WIDTH = 2;

function toUnixTimestamp(time: Time): number | null {
  if (typeof time === 'number') {
    return Number.isFinite(time) ? Math.floor(time) : null;
  }

  if (typeof time === 'string') {
    const parsed = Date.parse(`${time}T00:00:00Z`);

    return Number.isFinite(parsed)
      ? Math.floor(parsed / 1000)
      : null;
  }

  if (
    typeof time === 'object' &&
    time !== null &&
    'year' in time &&
    'month' in time &&
    'day' in time
  ) {
    const businessDay = time as {
      year: number;
      month: number;
      day: number;
    };

    const parsed = Date.UTC(
      businessDay.year,
      businessDay.month - 1,
      businessDay.day,
    );

    return Math.floor(parsed / 1000);
  }

  return null;
}

function isSameDrawings(
  first: DrawingObject[],
  second: DrawingObject[],
): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

export const TradingChart: React.FC<TradingChartProps> = ({
  candles,
  symbol,
  timeframe,
  sourceTimeframe,
  onChangeTimeframe,
  isDarkMode,
  isLoading = false,
  sessionId,
  activeTimezone,
  onChangeTimezone,
  drawings,
  onUpdateDrawings,
  indicators,
  onUpdateIndicators,
  showVolume,
  onToggleVolume,
  volumeType,
  onChangeVolumeType,
  hasRealVolume,
  showReplayControls,
  onToggleReplay,
}) => {
  // =========================================================
  // REFS
  // =========================================================

  const containerRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);

  const candlestickSeriesRef =
    useRef<ISeriesApi<'Candlestick'> | null>(null);

  const lineSeriesMapRef =
    useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  const candlesRef = useRef<Candle[]>(candles);

  // =========================================================
  // STATE
  // =========================================================

  const [containerDimensions, setContainerDimensions] =
    useState({
      width: 800,
      height: 500,
    });

  const [hoveredCandle, setHoveredCandle] =
    useState<Candle | null>(null);

  const [activeTool, setActiveTool] =
    useState<DrawingToolType>('CURSOR');

  const [currentColor, setCurrentColor] = useState(
    DEFAULT_DRAWING_COLOR,
  );

  const [currentStrokeWidth, setCurrentStrokeWidth] =
    useState(DEFAULT_STROKE_WIDTH);

  const [selectedDrawingId, setSelectedDrawingId] =
    useState<string | null>(null);

  const [drawingHistory, setDrawingHistory] =
    useState<DrawingObject[][]>(() => [[...drawings]]);

  const [historyIndex, setHistoryIndex] = useState(0);

  const [isIndicatorModalOpen, setIsIndicatorModalOpen] =
    useState(false);

  // Selalu gunakan candle terbaru di callback chart.
  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  // =========================================================
  // CANDLE INFORMATION
  // =========================================================

  const latestCandle =
    candles.length > 0 ? candles[candles.length - 1] : null;

  const displayedCandle = hoveredCandle || latestCandle;

  const formatPrice = useCallback((price?: number) => {
    if (
      price === undefined ||
      price === null ||
      !Number.isFinite(price)
    ) {
      return '0.00';
    }

    return price.toFixed(price > 500 ? 2 : 4);
  }, []);

  const candleChange =
    displayedCandle &&
    typeof displayedCandle.close === 'number' &&
    typeof displayedCandle.open === 'number'
      ? displayedCandle.close - displayedCandle.open
      : 0;

  const candleChangePercent =
    displayedCandle && displayedCandle.open > 0
      ? (candleChange / displayedCandle.open) * 100
      : 0;

  // =========================================================
  // DRAWING HISTORY: UNDO / REDO
  // =========================================================

  const commitDrawingsWithHistory = useCallback(
    (newDrawings: DrawingObject[]) => {
      if (isSameDrawings(drawings, newDrawings)) {
        return;
      }

      onUpdateDrawings(newDrawings);

      const nextHistory = drawingHistory.slice(
        0,
        historyIndex + 1,
      );

      nextHistory.push([...newDrawings]);

      setDrawingHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    },
    [
      drawings,
      drawingHistory,
      historyIndex,
      onUpdateDrawings,
    ],
  );

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) {
      return;
    }

    const nextIndex = historyIndex - 1;
    const previousDrawings = drawingHistory[nextIndex];

    if (!previousDrawings) {
      return;
    }

    setHistoryIndex(nextIndex);
    onUpdateDrawings([...previousDrawings]);
    setSelectedDrawingId(null);
  }, [historyIndex, drawingHistory, onUpdateDrawings]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= drawingHistory.length - 1) {
      return;
    }

    const nextIndex = historyIndex + 1;
    const nextDrawings = drawingHistory[nextIndex];

    if (!nextDrawings) {
      return;
    }

    setHistoryIndex(nextIndex);
    onUpdateDrawings([...nextDrawings]);
    setSelectedDrawingId(null);
  }, [historyIndex, drawingHistory, onUpdateDrawings]);

  // =========================================================
  // DRAWING ACTIONS
  // =========================================================

  const handleAddDrawing = useCallback(
    (drawing: DrawingObject) => {
      const drawingWithSession = {
        ...drawing,
        sessionId,
      } as DrawingObject;

      const updated = [...drawings, drawingWithSession];

      commitDrawingsWithHistory(updated);
      setSelectedDrawingId(drawing.id);
    },
    [drawings, sessionId, commitDrawingsWithHistory],
  );

  const handleUpdateDrawing = useCallback(
    (drawing: DrawingObject) => {
      const updated = drawings.map((item) =>
        item.id === drawing.id ? drawing : item,
      );

      commitDrawingsWithHistory(updated);
    },
    [drawings, commitDrawingsWithHistory],
  );

  const handleDeleteDrawing = useCallback(
    (id: string) => {
      const updated = drawings.filter(
        (drawing) => drawing.id !== id,
      );

      commitDrawingsWithHistory(updated);

      setSelectedDrawingId((previous) =>
        previous === id ? null : previous,
      );
    },
    [drawings, commitDrawingsWithHistory],
  );

  const handleClearAllDrawings = useCallback(() => {
    if (drawings.length === 0) {
      return;
    }

    commitDrawingsWithHistory([]);
    setSelectedDrawingId(null);
  }, [drawings, commitDrawingsWithHistory]);

  const handleToggleDrawingVisible = useCallback(
    (id: string) => {
      const updated = drawings.map((drawing) =>
        drawing.id === id
          ? {
              ...drawing,
              visible: !drawing.visible,
            }
          : drawing,
      );

      commitDrawingsWithHistory(updated);
    },
    [drawings, commitDrawingsWithHistory],
  );

  const handleToggleDrawingLock = useCallback(
    (id: string) => {
      const updated = drawings.map((drawing) =>
        drawing.id === id
          ? {
              ...drawing,
              locked: !drawing.locked,
            }
          : drawing,
      );

      commitDrawingsWithHistory(updated);
    },
    [drawings, commitDrawingsWithHistory],
  );

  // Sinkronisasi drawing dari parent tanpa menambahkan
  // duplikat pada history ketika undo/redo dilakukan.
  useEffect(() => {
    setDrawingHistory((previous) => {
      const current = previous[historyIndex];

      if (
        current &&
        isSameDrawings(current, drawings)
      ) {
        return previous;
      }

      const next = previous.slice(0, historyIndex + 1);

      next.push([...drawings]);

      setHistoryIndex(next.length - 1);

      return next;
    });
  }, [drawings, historyIndex]);

  // =========================================================
  // INITIALIZE CHART
  // =========================================================

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const initialWidth = Math.max(container.clientWidth, 1);
    const initialHeight = Math.max(container.clientHeight, 1);

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
          color: isDarkMode ? '#0b0f19' : '#ffffff',
        },
        textColor: isDarkMode ? '#94a3b8' : '#475569',
        fontSize: 11,
        fontFamily:
          "'JetBrains Mono', monospace, -apple-system, sans-serif",
      },

      grid: {
        vertLines: {
          color: isDarkMode
            ? 'rgba(30, 41, 59, 0.6)'
            : '#f1f5f9',
        },
        horzLines: {
          color: isDarkMode
            ? 'rgba(30, 41, 59, 0.6)'
            : '#f1f5f9',
        },
      },

      crosshair: {
        mode: CrosshairMode.Normal,

        vertLine: {
          color: isDarkMode ? '#3b82f6' : '#2563eb',
          width: 1,
          style: 3,
          labelBackgroundColor: isDarkMode
            ? '#1e293b'
            : '#2563eb',
        },

        horzLine: {
          color: isDarkMode ? '#3b82f6' : '#2563eb',
          width: 1,
          style: 3,
          labelBackgroundColor: isDarkMode
            ? '#1e293b'
            : '#2563eb',
        },
      },

      localization: {
        timeFormatter: (timeValue: number) =>
          formatDateTimeWithTz(timeValue, activeTimezone),
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
        borderColor: isDarkMode ? '#1e293b' : '#e2e8f0',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 8,
        minBarSpacing: 2,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
        tickMarkFormatter: (time: Time) => {
          const timestamp = toUnixTimestamp(time);
          if (timestamp === null) return '';
          return formatTimeOnly(timestamp, activeTimezone);
        },
      },

      rightPriceScale: {
        borderColor: isDarkMode ? '#1e293b' : '#e2e8f0',
        autoScale: true,
        scaleMargins: {
          top: 0.08,
          bottom: 0.08,
        },
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(
      CandlestickSeries,
      {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      },
    );

    candlestickSeriesRef.current = candlestickSeries;

    chart.subscribeCrosshairMove((param) => {
      if (
        !param.time ||
        !param.seriesData ||
        param.point === undefined
      ) {
        setHoveredCandle(null);
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
        setHoveredCandle(null);
        return;
      }

      const timestamp = toUnixTimestamp(param.time);

      if (timestamp === null) {
        setHoveredCandle(null);
        return;
      }

      const matched = candlesRef.current.find(
        (candle) =>
          Math.floor(candle.timestamp) === timestamp,
      );

      setHoveredCandle({
        timestamp,
        open: barData.open,
        high: barData.high,
        low: barData.low,
        close: barData.close,
        tickVolume: matched?.tickVolume ?? 0,
        realVolume: matched?.realVolume ?? 0,
      });
    });

    chart.subscribeClick(() => {
      setSelectedDrawingId(null);
    });

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      const { width, height } = entry.contentRect;

      if (width <= 0 || height <= 0) {
        return;
      }

      chart.applyOptions({
        width: Math.floor(width),
        height: Math.floor(height),
      });

      setContainerDimensions({
        width: Math.floor(width),
        height: Math.floor(height),
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();

      if (chartRef.current === chart) {
        chartRef.current = null;
        candlestickSeriesRef.current = null;
      }

      lineSeriesMapRef.current.clear();
    };
  }, [isDarkMode, activeTimezone]);

  // =========================================================
  // UPDATE CANDLE DATA
  // =========================================================

  useEffect(() => {
    const series = candlestickSeriesRef.current;

    if (!series) {
      return;
    }

    if (!candles || candles.length === 0) {
      series.setData([]);
      setHoveredCandle(null);
      return;
    }

    try {
      const candleMap = new Map<
        number,
        CandlestickData<Time>
      >();

      for (const candle of candles) {
        if (!candle) {
          continue;
        }

        const timestamp = Math.floor(candle.timestamp);

        if (
          !Number.isFinite(timestamp) ||
          timestamp <= 0
        ) {
          continue;
        }

        if (
          !Number.isFinite(candle.open) ||
          !Number.isFinite(candle.high) ||
          !Number.isFinite(candle.low) ||
          !Number.isFinite(candle.close)
        ) {
          continue;
        }

        candleMap.set(timestamp, {
          time: timestamp as Time,
          open: candle.open,
          high: Math.max(
            candle.high,
            candle.open,
            candle.close,
          ),
          low: Math.min(
            candle.low,
            candle.open,
            candle.close,
          ),
          close: candle.close,
        });
      }

      const sortedCandles = Array.from(
        candleMap.values(),
      ).sort((a, b) => Number(a.time) - Number(b.time));

      series.setData(sortedCandles);
    } catch (error) {
      console.error(
        '[TradingChart] Error updating candle data:',
        error,
      );
    }
  }, [candles, isDarkMode, activeTimezone]);

  // =========================================================
  // UPDATE MAIN INDICATORS: EMA, SMA, BOLLINGER
  // =========================================================

  useEffect(() => {
    const chart = chartRef.current;

    if (!chart || !candlestickSeriesRef.current) {
      return;
    }

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

        let series = lineSeriesMapRef.current.get(
          indicator.id,
        );

        if (!series) {
          series = chart.addSeries(LineSeries, {
            color: indicator.color,
            lineWidth: indicator.strokeWidth as 1 | 2 | 3 | 4,
            title: indicator.name,
            crosshairMarkerVisible: true,
          });

          lineSeriesMapRef.current.set(
            indicator.id,
            series,
          );
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

        let upperSeries =
          lineSeriesMapRef.current.get(upperId);

        let middleSeries =
          lineSeriesMapRef.current.get(middleId);

        let lowerSeries =
          lineSeriesMapRef.current.get(lowerId);

        if (!upperSeries) {
          upperSeries = chart.addSeries(LineSeries, {
            color: indicator.upperColor || indicator.color,
            lineWidth: 1,
            title: 'BB Upper',
          });

          lineSeriesMapRef.current.set(
            upperId,
            upperSeries,
          );
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

          lineSeriesMapRef.current.set(
            middleId,
            middleSeries,
          );
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

          lineSeriesMapRef.current.set(
            lowerId,
            lowerSeries,
          );
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

    for (const [id, series] of lineSeriesMapRef.current) {
      if (neededSeriesIds.has(id)) {
        continue;
      }

      try {
        chart.removeSeries(series);
      } catch {
        // Series mungkin sudah tidak terdaftar.
      }

      lineSeriesMapRef.current.delete(id);
    }
  }, [candles, indicators, isDarkMode, activeTimezone]);

  // =========================================================
  // SUB-INDICATORS
  // =========================================================

  const subIndicators = useMemo(
    () =>
      indicators.filter(
        (indicator) =>
          indicator.pane === 'sub' && indicator.visible,
      ),
    [indicators],
  );

  const handleRemoveSubIndicator = useCallback(
    (id: string) => {
      onUpdateIndicators(
        indicators.map((indicator) =>
          indicator.id === id
            ? { ...indicator, visible: false }
            : indicator,
        ),
      );
    },
    [indicators, onUpdateIndicators],
  );

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white text-slate-900 dark:bg-[#0b0f19] dark:text-slate-100">
      {/* TOOLBAR ATAS */}
      <div className="relative z-20 shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0b0f19]">
        <ChartToolbar
          sourceTimeframe={sourceTimeframe}
          activeTimeframe={timeframe}
          onChangeTimeframe={onChangeTimeframe}
          activeTimezone={activeTimezone}
          onChangeTimezone={onChangeTimezone}
          showVolume={showVolume}
          onToggleVolume={onToggleVolume}
          volumeType={volumeType}
          onChangeVolumeType={onChangeVolumeType}
          hasRealVolume={hasRealVolume}
          indicators={indicators}
          onOpenIndicatorsModal={() =>
            setIsIndicatorModalOpen(true)
          }
          showReplayControls={showReplayControls}
          onToggleReplay={onToggleReplay}
        />
      </div>

      {/* SYMBOL DAN INFORMASI OHLC */}
      <div className="relative z-10 flex min-h-9 shrink-0 items-center gap-3 overflow-x-auto border-b border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-[#0b0f19]">
        <div className="flex shrink-0 items-center gap-2 font-sans text-xs font-semibold">
          <span className="text-slate-900 dark:text-white">
            {symbol}
          </span>

          <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
            {timeframe}
          </span>
        </div>

        {displayedCandle ? (
          <div className="flex min-w-0 items-center gap-2.5 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-300">
            <span className="hidden text-slate-400 lg:inline">
              {formatDateTimeWithTz(
                displayedCandle.timestamp,
                activeTimezone,
              )}
            </span>

            <span>
              O:{' '}
              <b className="text-slate-900 dark:text-white">
                {formatPrice(displayedCandle.open)}
              </b>
            </span>

            <span>
              H:{' '}
              <b className="text-emerald-600 dark:text-emerald-400">
                {formatPrice(displayedCandle.high)}
              </b>
            </span>

            <span>
              L:{' '}
              <b className="text-rose-600 dark:text-rose-400">
                {formatPrice(displayedCandle.low)}
              </b>
            </span>

            <span>
              C:{' '}
              <b className="text-slate-900 dark:text-white">
                {formatPrice(displayedCandle.close)}
              </b>
            </span>

            <span
              className={`flex items-center gap-1 font-semibold ${
                candleChange >= 0
                  ? 'text-emerald-500'
                  : 'text-rose-500'
              }`}
            >
              {candleChange >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}

              {candleChange >= 0 ? '+' : ''}
              {candleChange.toFixed(2)} (
              {candleChangePercent.toFixed(2)}%)
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">
            Menunggu data candle...
          </span>
        )}
      </div>

      {/* AREA CHART DAN DRAWING TOOLBAR */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden bg-white dark:bg-[#0b0f19]">
        {/* SIDEBAR DRAWING KIRI */}
        <div className="relative z-30 w-12 shrink-0 overflow-visible border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0b0f19]">
          <DrawingToolbar
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            currentColor={currentColor}
            onChangeColor={setCurrentColor}
            currentStrokeWidth={currentStrokeWidth}
            onChangeStrokeWidth={setCurrentStrokeWidth}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < drawingHistory.length - 1}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClearAll={handleClearAllDrawings}
            drawings={drawings}
            onToggleDrawingVisible={handleToggleDrawingVisible}
            onToggleDrawingLock={handleToggleDrawingLock}
            onDeleteDrawing={handleDeleteDrawing}
          />
        </div>

        {/* CHART UTAMA */}
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <div
            ref={containerRef}
            className="absolute inset-0 h-full w-full"
          />

          {/* LAYER GAMBARAN / DRAWING */}
          <DrawingLayer
            drawings={drawings}
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            selectedDrawingId={selectedDrawingId}
            onSelectDrawing={setSelectedDrawingId}
            onAddDrawing={handleAddDrawing}
            onUpdateDrawing={handleUpdateDrawing}
            onDeleteDrawing={handleDeleteDrawing}
            chart={chartRef.current}
            series={candlestickSeriesRef.current}
            currentColor={currentColor}
            currentStrokeWidth={currentStrokeWidth}
            activeTimezone={activeTimezone}
            isDarkMode={isDarkMode}
            containerWidth={containerDimensions.width}
            containerHeight={containerDimensions.height}
          />

          {/* LOADING OVERLAY */}
          {isLoading && (
            <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-slate-900/20">
              <div className="flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2.5 text-xs text-white shadow-xl">
                <span className="h-2 w-2 animate-ping rounded-full bg-blue-500" />
                <span>Memperbarui chart...</span>
              </div>
            </div>
          )}

          {/* EMPTY STATE */}
          {!isLoading && candles.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 p-4 text-center text-xs text-slate-400">
              <p className="font-semibold text-slate-600 dark:text-slate-300">
                Belum ada candle untuk ditampilkan.
              </p>

              <p className="max-w-sm text-[11px] text-slate-500">
                Periksa data CSV atau posisi replay yang sedang
                dipilih.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SUB-INDICATORS */}
      {subIndicators.length > 0 && (
        <div className="relative z-10 shrink-0 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0b0f19]">
          <SubIndicatorsPane
            candles={candles}
            activeSubIndicators={subIndicators}
            isDarkMode={isDarkMode}
            onRemoveIndicator={handleRemoveSubIndicator}
          />
        </div>
      )}

      {/* INDICATOR MODAL */}
      <IndicatorModal
        isOpen={isIndicatorModalOpen}
        onClose={() => setIsIndicatorModalOpen(false)}
        indicators={indicators}
        onUpdateIndicators={onUpdateIndicators}
      />
    </div>
  );
};

export default TradingChart;

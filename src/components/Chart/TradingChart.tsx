import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  useChartPanes,  
} from '../../hooks/useChartPanes.js';
import { useDrawingHistory } from '../../hooks/useDrawingHistory.js';
import { useDrawingActions } from '../../hooks/useDrawingActions.js';
import { useSubIndicatorData } from '../../hooks/useSubIndicatorData.js';
import { useMainIndicatorSeries } from '../../hooks/useMainIndicatorSeries.js';
import { useVolumeSeries } from '../../hooks/useVolumeSeries.js';
import {
  useSubIndicatorSeries,
  type SubPaneType,
} from '../../hooks/useSubIndicatorSeries.js';
import {
  getVolumeValue,
} from '../../Indikator/volume.js';
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  TickMarkType,
  type IChartApi,
  type IPaneApi,
  type ISeriesApi,
  type Time,
  type CandlestickData,
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
import { DrawingLayer } from './Drawing/DrawingLayer.js';
import IndicatorManagerModal from '../Indicators/IndicatorManagerModal.js';
import { CandleInfoBar } from './ChartHeader/CandleInfoBar.js';
import { useCandleInformation } from '../../hooks/useCandleInformation.js';
import IndicatorPropertiesModal, {
  type IndicatorProperties,
} from '../Indicators/IndicatorPropertiesModal.js';

import { formatDateTimeWithTz } from '../../utils/timezone.js';
import {
  DEFAULT_DRAWING_COLOR,
  DEFAULT_STROKE_WIDTH,
  SUB_PANE_HEIGHT,
  VOLUME_PROPERTIES_ID,
} from './utils/chartConstants.js';

import {
  formatPrice,
  formatVolumeValue,
} from './utils/chartFormatters.js';

import {
  isSameDrawings,
} from './utils/chartComparators.js';

import {
  toUnixTimestamp,
} from './utils/chartTimeUtils.js';
import {
  Sliders,
  X,
} from 'lucide-react';

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

  showVolume: boolean;
  onToggleVolume: () => void;
  volumeType: 'TICK' | 'REAL';
  onChangeVolumeType: (type: 'TICK' | 'REAL') => void;
  hasRealVolume: boolean;

  showReplayControls: boolean;
  onToggleReplay: () => void;
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
  const [chartInstance, setChartInstance] = useState<IChartApi | null>(
    null,
  );

  const candlestickSeriesRef =
    useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [candlestickSeriesInstance, setCandlestickSeriesInstance] =
    useState<ISeriesApi<'Candlestick'> | null>(null);

  const lineSeriesMapRef =
    useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  const subIndicatorSeriesMapRef =
    useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  const subIndicatorPanesRef =
    useRef<Map<SubPaneType, IPaneApi<Time>>>(new Map());

  const volumeSeriesRef =
    useRef<ISeriesApi<'Histogram'> | null>(null);

  const volumePaneRef = useRef<IPaneApi<Time> | null>(null);

  const candlesRef = useRef<Candle[]>(candles);
  const drawingsRef = useRef<DrawingObject[]>(drawings);

  const drawingDragStartRef =
    useRef<DrawingObject[] | null>(null);

  const isDarkModeRef = useRef(isDarkMode);
  const activeTimezoneRef = useRef(activeTimezone);

  candlesRef.current = candles;
  drawingsRef.current = drawings;
  isDarkModeRef.current = isDarkMode;
  activeTimezoneRef.current = activeTimezone;

  // =========================================================
  // STATE
  // =========================================================

  const [containerDimensions, setContainerDimensions] = useState({
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
  // =========================================================
  // DRAWING HISTORY: UNDO / REDO
  // =========================================================

  const {
    drawingHistory,
    historyIndex,
    canUndo,
    canRedo,
    commitDrawingsWithHistory,
    handleUndo,
    handleRedo,
    commitDragHistory,
  } = useDrawingHistory({
    drawings,
    drawingsRef,
    drawingDragStartRef,
    onUpdateDrawings,
    setSelectedDrawingId,
  });
  const {
  handleAddDrawing,
  handleUpdateDrawing,
  handleDrawingDragStart,
  handleDrawingDragEnd,
  handleDeleteDrawing,
  handleClearAllDrawings,
  handleToggleDrawingVisible,
  handleToggleDrawingLock,
} = useDrawingActions({
  sessionId,
  drawingsRef,
  drawingDragStartRef,
  commitDrawingsWithHistory,
  commitDragHistory,
  onUpdateDrawings,
  setSelectedDrawingId,
});

const {
  subIndicators,
  subIndicatorReadouts,
  subIndicatorGroups,
  handleRemoveSubIndicator,
} = useSubIndicatorData({
  candles,
  indicators,
  onUpdateIndicators,
});


  const [isIndicatorManagerModalOpen, setIsIndicatorManagerModalOpen] =
    useState(false);

  const [subPropertiesTargetId, setSubPropertiesTargetId] =
    useState<string | null>(null);

  const [volumeColorOverride, setVolumeColorOverride] =
    useState<string | null>(null);


// =========================================================
// CHART PANES
// =========================================================

const {
  subPaneElements,
  syncPaneElements,
  normalizePaneHeights,
  schedulePaneElementsSync,
} = useChartPanes(
  chartRef,
  volumePaneRef,
  subIndicatorPanesRef,
);
useSubIndicatorSeries({
  chartRef,
  candles,
  indicators,
  subIndicatorPanesRef,
  subIndicatorSeriesMapRef,
  volumePaneRef,
  schedulePaneElementsSync,
});
useMainIndicatorSeries({
  chartRef,
  candlestickSeriesRef,
  lineSeriesMapRef,
  candles,
  indicators,
});
  useEffect(() => {
    setSubPropertiesTargetId(null);
  }, [sessionId]);

// =========================================================
// CANDLE INFORMATION
// =========================================================

const {
  displayedCandle,
  candleChange,
  candleChangePercent,
} = useCandleInformation(candles, hoveredCandle);
 

  // =========================================================
  // INITIALIZE CHART
  // =========================================================

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initialWidth = Math.max(container.clientWidth, 1);
    const initialHeight = Math.max(container.clientHeight, 1);

    const initialDarkMode = isDarkModeRef.current;
    const initialTimezone = activeTimezoneRef.current;

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

  // =========================================================
  // UPDATE CHART THEME
  // =========================================================

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.applyOptions({
      layout: {
        background: {
          type: ColorType.Solid,
          color: isDarkMode ? '#0b0f19' : '#ffffff',
        },
        textColor: isDarkMode ? '#94a3b8' : '#475569',
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
        vertLine: {
          color: isDarkMode ? '#3b82f6' : '#2563eb',
          labelBackgroundColor: isDarkMode
            ? '#1e293b'
            : '#2563eb',
        },
        horzLine: {
          color: isDarkMode ? '#3b82f6' : '#2563eb',
          labelBackgroundColor: isDarkMode
            ? '#1e293b'
            : '#2563eb',
        },
      },

      timeScale: {
        borderColor: isDarkMode ? '#1e293b' : '#e2e8f0',
      },

      rightPriceScale: {
        borderColor: isDarkMode ? '#1e293b' : '#e2e8f0',
      },
    });
  }, [isDarkMode]);

  // =========================================================
  // TIMEZONE
  // =========================================================

  useEffect(() => {
    activeTimezoneRef.current = activeTimezone;

    chartRef.current?.applyOptions({
      localization: {
        timeFormatter: (timeValue: number) =>
          formatDateTimeWithTz(timeValue, activeTimezone),
      },
    });
  }, [activeTimezone]);

  // =========================================================
  // UPDATE CANDLE DATA
  // =========================================================

  useEffect(() => {
    const series = candlestickSeriesRef.current;
    if (!series) return;

    if (!candles || candles.length === 0) {
      series.setData([]);
      setHoveredCandle(null);
      return;
    }

    try {
      const candleMap = new Map<number, CandlestickData<Time>>();

      for (const candle of candles) {
        if (!candle) continue;

        const timestamp = Math.floor(candle.timestamp);

        if (
          !Number.isFinite(timestamp) ||
          timestamp <= 0 ||
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

      const sortedCandles = Array.from(candleMap.values()).sort(
        (a, b) => Number(a.time) - Number(b.time),
      );

      series.setData(sortedCandles);
    } catch (error) {
      console.error(
        '[TradingChart] Error memperbarui candle:',
        error,
      );
    }
  }, [candles]);




  
  // =========================================================
  // VOLUME CONFIGURATION
  // =========================================================

  const volumeIndicators = useMemo(
    () =>
      indicators.filter(
        (indicator) => indicator.type === 'VOLUME',
      ),
    [indicators],
  );

  const visibleVolumeIndicator = volumeIndicators.find(
    (indicator) => indicator.visible,
  );

  const volumeVisible = Boolean(visibleVolumeIndicator);

  const volumeColor =
    visibleVolumeIndicator?.color ||
    volumeColorOverride ||
    '#26a69a';

  const latestVolumeValue = useMemo(() => {
    const lastCandle = candles[candles.length - 1];

    if (!lastCandle) return null;

    return getVolumeValue(
      {
        time: lastCandle.timestamp,
        open: lastCandle.open,
        close: lastCandle.close,
        tickVolume: lastCandle.tickVolume,
        realVolume: lastCandle.realVolume,
      },
      volumeType === 'REAL' ? 'realVolume' : 'tickVolume',
    );
  }, [candles, volumeType]);


  // =========================================================
  // VOLUME SERIES
  // =========================================================

  useVolumeSeries({
    chartRef,
    volumeSeriesRef,
    volumePaneRef,
    candles,
    volumeVisible,
    volumeType,
    hasRealVolume,
    volumeColor,
    schedulePaneElementsSync,
  });

 

  // =========================================================
  // SUB-INDICATOR CONTROLS / PROPERTIES
  // =========================================================

  

  const subPropertiesTarget = indicators.find(
    (indicator) => indicator.id === subPropertiesTargetId,
  );

  const isVolumeProperties =
    subPropertiesTargetId === VOLUME_PROPERTIES_ID;

  const subPropertiesInitialValues = useMemo<IndicatorProperties | null>(() => {
    if (isVolumeProperties) {
      return {
        period: 1,
        color: volumeColor,
        strokeWidth: 1,
        stdDev: 2,
      };
    }

    if (!subPropertiesTarget) {
      return null;
    }

    return {
      period: subPropertiesTarget.period || 14,
      color: subPropertiesTarget.color || '#3b82f6',
      strokeWidth: subPropertiesTarget.strokeWidth || 2,
      stdDev: subPropertiesTarget.stdDev || 2,
    };
  }, [isVolumeProperties, subPropertiesTarget, volumeColor]);

  const handleSaveSubIndicatorProperties = useCallback(
    (values: IndicatorProperties) => {
      if (!subPropertiesTargetId) {
        return;
      }

      if (subPropertiesTargetId === VOLUME_PROPERTIES_ID) {
        setVolumeColorOverride(values.color);
        setSubPropertiesTargetId(null);
        return;
      }

      onUpdateIndicators(
        indicators.map((indicator) => {
          if (indicator.id !== subPropertiesTargetId) {
            return indicator;
          }

          const nextName =
            indicator.type === 'BOLLINGER'
              ? `BB (${values.period}, ${values.stdDev})`
              : indicator.type === 'VOLUME'
                ? 'Volume'
                : `${indicator.type} ${values.period}`;

          return {
            ...indicator,
            period:
              indicator.type === 'VOLUME'
                ? indicator.period
                : values.period,
            color: values.color,
            strokeWidth:
              indicator.type === 'VOLUME'
                ? indicator.strokeWidth
                : values.strokeWidth,
            stdDev:
              indicator.type === 'BOLLINGER'
                ? values.stdDev
                : indicator.stdDev,
            name: nextName,
          };
        }),
      );

      setSubPropertiesTargetId(null);
    },
    [indicators, onUpdateIndicators, subPropertiesTargetId],
  );

  // =========================================================
  // CHART ACTIONS
  // =========================================================

  const handleFitContent = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.timeScale().fitContent();

    chart.priceScale('right').applyOptions({
      autoScale: true,
    });
  }, []);

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white text-slate-900 dark:bg-[#0b0f19] dark:text-slate-100">
      <div className="relative z-20 shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0b0f19]">
        
      <ChartToolbar
        sourceTimeframe={sourceTimeframe}
        activeTimeframe={timeframe}
        onChangeTimeframe={onChangeTimeframe}
        activeTimezone={activeTimezone}
        onChangeTimezone={onChangeTimezone}
        indicators={indicators}
        onOpenIndicatorsModal={() =>
          setIsIndicatorManagerModalOpen(true)
        }
        onFitContent={handleFitContent}
        showReplayControls={showReplayControls}
        onToggleReplay={onToggleReplay}
      />

      </div>

      <CandleInfoBar
        symbol={symbol}
        timeframe={timeframe}
        displayedCandle={displayedCandle}
        candleChange={candleChange}
        candleChangePercent={candleChangePercent}
        activeTimezone={activeTimezone}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden bg-white dark:bg-[#0b0f19]">
        <div className="relative z-30 w-12 shrink-0 overflow-visible border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0b0f19]">
          <DrawingToolbar
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            currentColor={currentColor}
            onChangeColor={setCurrentColor}
            currentStrokeWidth={currentStrokeWidth}
            onChangeStrokeWidth={setCurrentStrokeWidth}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClearAll={handleClearAllDrawings}
            drawings={drawings}
            onToggleDrawingVisible={handleToggleDrawingVisible}
            onToggleDrawingLock={handleToggleDrawingLock}
            onDeleteDrawing={handleDeleteDrawing}
          />
        </div>

        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <div
            ref={containerRef}
            className="absolute inset-0 h-full w-full"
          />

          {(['RSI', 'ATR'] as const).map((type) => {
            const paneElement = subPaneElements[type];
            const group = subIndicatorGroups[type];

            if (
              !paneElement ||
              !group ||
              group.length === 0
            ) {
              return null;
            }

            return createPortal(
              <div
                key={type}
                className="pointer-events-none absolute left-2 top-1 z-20 flex max-w-[calc(100%-12px)] flex-col items-start gap-1"
              >
                {group.map((indicator) => {
                  const readout =
                    subIndicatorReadouts[indicator.id];

                  const color =
                    indicator.color ||
                    (indicator.type === 'RSI'
                      ? '#a855f7'
                      : '#f59e0b');

                  return (
                    <div
                      key={indicator.id}
                      className="pointer-events-auto flex items-center gap-1.5 rounded border border-slate-300/80 bg-white/90 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/90 dark:text-slate-200"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />

                      <span className="font-semibold">
                        {indicator.name || indicator.type}
                      </span>

                      <span>
                        {readout !== null &&
                        readout !== undefined
                          ? readout.toFixed(2)
                          : '—'}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setSubPropertiesTargetId(indicator.id)
                        }
                        title="Properties indikator"
                        aria-label={`Properties ${indicator.name || indicator.type}`}
                        className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                      >
                        <Sliders size={11} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveSubIndicator(indicator.id)
                        }
                        title="Hapus indikator"
                        aria-label={`Hapus ${indicator.name || indicator.type}`}
                        className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>,
              paneElement,
              `pane-${type}`,
            );
          })}

          {volumeVisible &&
            subPaneElements.VOLUME &&
            createPortal(
              <div className="pointer-events-none absolute left-2 top-1 z-20 flex max-w-[calc(100%-12px)] flex-col items-start gap-1">
                <div className="pointer-events-auto flex items-center gap-1.5 rounded border border-slate-300/80 bg-white/90 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/90 dark:text-slate-200">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: volumeColor }}
                  />

                  <span className="font-semibold">Volume</span>

                  <span className="text-[9px] uppercase text-slate-400">
                    {volumeType}
                  </span>

                  <span>{formatVolumeValue(latestVolumeValue)}</span>

                  <button
                    type="button"
                    onClick={() =>
                      setSubPropertiesTargetId(
                        VOLUME_PROPERTIES_ID,
                      )
                    }
                    title="Properties volume"
                    aria-label="Properties volume"
                    className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                  >
                    <Sliders size={11} />
                  </button>

                  <button
                    type="button"
                    onClick={onToggleVolume}
                    title="Sembunyikan volume"
                    aria-label="Sembunyikan volume"
                    className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>,
              subPaneElements.VOLUME,
              'pane-VOLUME',
            )}

          <DrawingLayer
            candles={candles}
            timeframe={timeframe}
            drawings={drawings}
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            selectedDrawingId={selectedDrawingId}
            onSelectDrawing={setSelectedDrawingId}
            onAddDrawing={handleAddDrawing}
            onUpdateDrawing={handleUpdateDrawing}
            onDeleteDrawing={handleDeleteDrawing}
            onDrawingDragStart={handleDrawingDragStart}
            onDrawingDragEnd={handleDrawingDragEnd}
            chart={chartInstance}
            series={candlestickSeriesInstance}
            currentColor={currentColor}
            currentStrokeWidth={currentStrokeWidth}
            activeTimezone={activeTimezone}
            isDarkMode={isDarkMode}
            containerWidth={containerDimensions.width}
            containerHeight={containerDimensions.height}
          />

          {isLoading && (
            <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-slate-900/20">
              <div className="flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2.5 text-xs text-white shadow-xl">
                <span className="h-2 w-2 animate-ping rounded-full bg-blue-500" />
                <span>Memperbarui chart...</span>
              </div>
            </div>
          )}

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

      <IndicatorManagerModal
        isOpen={isIndicatorManagerModalOpen}
        onClose={() => setIsIndicatorManagerModalOpen(false)}
        indicators={indicators}
        onUpdateIndicators={onUpdateIndicators}
      />

      {subPropertiesTargetId && subPropertiesInitialValues && (
        <IndicatorPropertiesModal
          isOpen
          indicatorName={
            isVolumeProperties
              ? 'Volume'
              : subPropertiesTarget?.name ||
                subPropertiesTarget?.type ||
                'Indikator'
          }
          initialValues={subPropertiesInitialValues}
          showPeriod={!isVolumeProperties}
          showStdDev={
            subPropertiesTarget?.type === 'BOLLINGER'
          }
          showStrokeWidth={!isVolumeProperties}
          onClose={() => setSubPropertiesTargetId(null)}
          onSave={handleSaveSubIndicatorProperties}
        />
      )}
    </div>
  );
};

export default TradingChart;

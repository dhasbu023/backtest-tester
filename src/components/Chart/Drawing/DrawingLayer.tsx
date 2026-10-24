
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
// flushSync removed to avoid React warning

import type {
  IChartApi,
  ISeriesApi,
  ISeriesPrimitive,
  Logical,
  Time,
} from 'lightweight-charts';

import {
  type DrawingObject,
  type DrawingPoint,
  type DrawingToolType,
  type Candle,
  type Timeframe,
  TIMEFRAME_SECONDS,
} from '../../../types/index.js';

import HorizontalLineProperties from './HorizontalLine/HorizontalLineProperties.js';
import type { HorizontalLineStyle } from './HorizontalLine/horizontalLine.defaults.js';
import { RectanglePreview } from './Rectangle/RectanglePreview.js';
import { createTextDrawing } from './Text/TextCreator.js';
import { DrawingRenderer } from './DrawingRenderer.js';
import { createFibonacciLevels } from './Fibonacci/fibonacci.utils.js';
import { FibonacciPreview } from './Fibonacci/FibonacciPreview.js';
import { FibonacciPropertiesModal } from './Fibonacci/FibonacciPropertiesModal.js';
import type { FibonacciPropertiesSettings } from './Fibonacci/FibonacciProperties.types.js';
import {
  getActiveDefaultFibonacciSettings,
  saveFibonacciDefaults,
} from './Fibonacci/fibonacci.defaults.js';
import { DrawingContextMenu } from './DrawingContextMenu.js';
import { createLongPositionDrawing } from './LongPosition/longPosition.utils.js';
import { createShortPositionDrawing } from './ShortPosition/shortPosition.utils.js';
import { PositionPropertiesModal } from './PositionPropertiesModal.js';

interface DrawingLayerProps {
  candles?: Candle[];
  timeframe?: Timeframe;
  drawings: DrawingObject[];
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  selectedDrawingId: string | null;
  onSelectDrawing: (id: string | null) => void;
  onAddDrawing: (drawing: DrawingObject) => void;
  onUpdateDrawing: (drawing: DrawingObject) => void;
  onDeleteDrawing: (id: string) => void;
  onDrawingDragStart?: () => void;
  onDrawingDragEnd?: () => void;
  chart: IChartApi | null;
  series: ISeriesApi<'Candlestick'> | null;
  currentColor: string;
  currentStrokeWidth: number;
  activeTimezone: string;
  isDarkMode: boolean;
  containerWidth: number;
  containerHeight: number;
}

interface DragPosition {
  x: number;
  y: number;
}

const DEFAULT_SHORT_TARGET_MULTIPLIER = 0.985;
const DEFAULT_SHORT_STOP_MULTIPLIER = 1.0075;

const MIN_RISK_DISTANCE = 0.0001;

const POSITION_ENTRY_HANDLE = 100;
const POSITION_TARGET_HANDLE = 101;
const POSITION_STOP_HANDLE = 102;
const POSITION_WIDTH_HANDLE = 103;
const POSITION_START_TIME_HANDLE = 104;
const POSITION_CORNER_TOP_LEFT = 105;
const POSITION_CORNER_TOP_RIGHT = 106;
const POSITION_CORNER_BOTTOM_LEFT = 107;
const POSITION_CORNER_BOTTOM_RIGHT = 108;

export const getCandleInterval = (
  candles?: Candle[],
  timeframe?: Timeframe,
): number => {
  if (timeframe && TIMEFRAME_SECONDS[timeframe]) {
    return TIMEFRAME_SECONDS[timeframe];
  }
  if (candles && candles.length > 1) {
    const last = candles[candles.length - 1].timestamp;
    const prev = candles[candles.length - 2].timestamp;
    const recentDiff = last - prev;
    if (recentDiff > 0 && Number.isFinite(recentDiff)) {
      return Math.round(recentDiff);
    }
  }
  return 60;
};

export const getProportionalPositionMetrics = (
  entryPrice: number,
  candles?: Candle[],
  timeframe?: Timeframe,
): {
  targetDistance: number;
  stopDistance: number;
  durationSeconds: number;
  minWidthSeconds: number;
} => {
  const candleInterval = getCandleInterval(candles, timeframe);
  const durationSeconds = candleInterval * 20; // 20 bar default width
  const minWidthSeconds = Math.max(60, candleInterval * 2); // Minimal 2 bar

  let avgCandleRange = 0;
  if (candles && candles.length > 0) {
    const sample = candles.slice(-30);
    const sum = sample.reduce(
      (acc, c) => acc + Math.max(0.00001, c.high - c.low),
      0,
    );
    avgCandleRange = sum / sample.length;
  }

  if (!avgCandleRange || avgCandleRange <= 0) {
    const pipMultiplier =
      timeframe === 'M1'
        ? 0.0003
        : timeframe === 'M5'
        ? 0.0008
        : timeframe === 'M15'
        ? 0.0015
        : timeframe === 'M30'
        ? 0.0025
        : timeframe === 'H1'
        ? 0.004
        : timeframe === 'H4'
        ? 0.009
        : 0.02;
    avgCandleRange = entryPrice * pipMultiplier;
  }

  // Stop loss ~ 5 candle, Target ~ 10 candle (1:2 R:R) proporsional timeframe
  const stopDistance = Math.max(0.00005, avgCandleRange * 5);
  const targetDistance = stopDistance * 2;

  return {
    targetDistance,
    stopDistance,
    durationSeconds,
    minWidthSeconds,
  };
};

const isPositionDrawing = (
  drawing: DrawingObject,
): boolean =>
  drawing.type === 'LONG_POSITION' ||
  drawing.type === 'SHORT_POSITION';

const getTimestamp = (time: unknown): number => {
  if (typeof time === 'number') return time;
  if (typeof time === 'string') {
    const parsed = Date.parse(time);
    return isNaN(parsed) ? Number(time) : Math.floor(parsed / 1000);
  }
  if (time && typeof time === 'object' && 'year' in time) {
    const bd = time as { year: number; month: number; day: number };
    return Math.floor(Date.UTC(bd.year, bd.month - 1, bd.day) / 1000);
  }
  return Number(time) || 0;
};

export function timestampToCoordinate(
  chart: IChartApi,
  candles: Candle[] | undefined,
  timestamp: number,
): number | null {
  const timeScale = chart.timeScale();

  // 1. Direct lookup from chart
  try {
    const directX = timeScale.timeToCoordinate(timestamp as Time);
    if (directX !== null && Number.isFinite(directX)) {
      return directX;
    }
  } catch {
    // ignore
  }

  if (!candles || candles.length === 0) {
    return null;
  }

  const lastIndex = candles.length - 1;
  const candle0 = candles[0];
  const candleLast = candles[lastIndex];

  // Calculate default interval between candles in seconds
  const defaultInterval =
    candles.length > 1
      ? Math.max(1, (candleLast.timestamp - candle0.timestamp) / lastIndex)
      : 60;

  // Determine logical coordinate
  let logical: number;

  if (timestamp <= candle0.timestamp) {
    const dt =
      candles.length > 1 && candles[1].timestamp > candle0.timestamp
        ? candles[1].timestamp - candle0.timestamp
        : defaultInterval;
    logical = dt > 0 ? 0 - (candle0.timestamp - timestamp) / dt : 0;
  } else if (timestamp >= candleLast.timestamp) {
    const dt =
      candles.length > 1 &&
      candleLast.timestamp > candles[lastIndex - 1].timestamp
        ? candleLast.timestamp - candles[lastIndex - 1].timestamp
        : defaultInterval;
    logical =
      dt > 0 ? lastIndex + (timestamp - candleLast.timestamp) / dt : lastIndex;
  } else {
    // Binary search between candle0 and candleLast
    let low = 0;
    let high = lastIndex;
    logical = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (candles[mid].timestamp <= timestamp) {
        if (mid === lastIndex) {
          logical = lastIndex;
          break;
        } else if (candles[mid + 1].timestamp > timestamp) {
          const c1 = candles[mid];
          const c2 = candles[mid + 1];
          const dt = c2.timestamp - c1.timestamp;
          const ratio = dt > 0 ? (timestamp - c1.timestamp) / dt : 0;
          logical = mid + ratio;
          break;
        }
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
  }

  // 2. Try direct logical coordinate conversion
  try {
    const x = timeScale.logicalToCoordinate(logical as Logical);
    if (x !== null && Number.isFinite(x)) {
      return x;
    }
  } catch {
    // ignore
  }

  // 3. Continuous linear extrapolation if logicalToCoordinate returned null
  try {
    let refX1: number | null = null;
    let refLogical1: number | null = null;
    let refX2: number | null = null;
    let refLogical2: number | null = null;

    // Check last candle
    const xLast =
      timeScale.logicalToCoordinate(lastIndex as Logical) ??
      timeScale.timeToCoordinate(candleLast.timestamp as Time);
    if (xLast !== null && Number.isFinite(xLast)) {
      refX1 = xLast;
      refLogical1 = lastIndex;
    }

    // Check previous candle
    if (lastIndex > 0) {
      const xPrev =
        timeScale.logicalToCoordinate((lastIndex - 1) as Logical) ??
        timeScale.timeToCoordinate(candles[lastIndex - 1].timestamp as Time);
      if (xPrev !== null && Number.isFinite(xPrev)) {
        refX2 = xPrev;
        refLogical2 = lastIndex - 1;
      }
    }

    // Fallback to visible logical range if last candle not in view
    if (refX1 === null || refX2 === null) {
      const vr = timeScale.getVisibleLogicalRange?.();
      if (vr && Number.isFinite(vr.from) && Number.isFinite(vr.to)) {
        const xFrom = timeScale.logicalToCoordinate(vr.from as Logical);
        const xTo = timeScale.logicalToCoordinate(vr.to as Logical);
        if (
          xFrom !== null &&
          xTo !== null &&
          Number.isFinite(xFrom) &&
          Number.isFinite(xTo) &&
          vr.to > vr.from
        ) {
          refX1 = xFrom;
          refLogical1 = vr.from;
          refX2 = xTo;
          refLogical2 = vr.to;
        }
      }
    }

    if (
      refX1 !== null &&
      refLogical1 !== null &&
      refX2 !== null &&
      refLogical2 !== null &&
      refLogical1 !== refLogical2
    ) {
      const barSpacing = (refX1 - refX2) / (refLogical1 - refLogical2);
      if (Number.isFinite(barSpacing) && barSpacing !== 0) {
        return refX1 + (logical - refLogical1) * barSpacing;
      }
    }

    if (refX1 !== null) {
      return refX1;
    }
  } catch {
    // ignore
  }

  return null;
}

export const DrawingLayer: React.FC<DrawingLayerProps> = ({
  candles,
  timeframe,
  drawings,
  activeTool,
  onSelectTool,
  selectedDrawingId,
  onSelectDrawing,
  onAddDrawing,
  onUpdateDrawing,
  onDeleteDrawing,
  onDrawingDragStart,
  onDrawingDragEnd,
  chart,
  series,
  currentColor,
  currentStrokeWidth,
  activeTimezone,
  isDarkMode,
  containerWidth,
  containerHeight,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // --------------------------------------------------
  // Drawing creation state
  // --------------------------------------------------

  const [inProgressPoints, setInProgressPoints] = useState<
    DrawingPoint[]
  >([]);

  const [currentMousePoint, setCurrentMousePoint] =
    useState<DrawingPoint | null>(null);

  const [positionCreation, setPositionCreation] = useState<{
    tool: 'LONG_POSITION' | 'SHORT_POSITION';
    startPoint: DrawingPoint;
    currentPoint: DrawingPoint;
    startPixel: { x: number; y: number };
    currentPixel: { x: number; y: number };
  } | null>(null);

  const justCreatedPositionRef = useRef<boolean>(false);

  // --------------------------------------------------
  // Horizontal line properties
  // --------------------------------------------------

  const [propertiesDrawingId, setPropertiesDrawingId] =
    useState<string | null>(null);

  const propertiesDrawing =
    drawings.find(
      (drawing) =>
        drawing.id === propertiesDrawingId &&
        drawing.type === 'HORIZONTAL_LINE',
    ) ?? null;

  // --------------------------------------------------
  // Fibonacci properties
  // --------------------------------------------------

  const [fibonacciPropertiesId, setFibonacciPropertiesId] =
    useState<string | null>(null);

  const fibonacciPropertiesDrawing =
    drawings.find(
      (drawing) =>
        drawing.id === fibonacciPropertiesId &&
        drawing.type === 'FIBO_RETRACEMENT',
    ) ?? null;

  // --------------------------------------------------
  // Position (Long/Short) properties
  // --------------------------------------------------

  const [positionPropertiesId, setPositionPropertiesId] =
    useState<string | null>(null);

  const positionPropertiesDrawing =
    drawings.find(
      (drawing) =>
        drawing.id === positionPropertiesId &&
        isPositionDrawing(drawing),
    ) ?? null;

  // --------------------------------------------------
  // Context Menu
  // --------------------------------------------------

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    drawingId: string;
  } | null>(null);

  const contextMenuDrawing =
    drawings.find((drawing) => drawing.id === contextMenu?.drawingId) ?? null;

  // --------------------------------------------------
  // Drag state
  // --------------------------------------------------

  const [isDragging, setIsDragging] = useState(false);

  const [dragAnchorIndex, setDragAnchorIndex] =
    useState<number | null>(null);

  const [dragStartMouse, setDragStartMouse] =
    useState<DragPosition | null>(null);

  const [dragInitialPoints, setDragInitialPoints] =
    useState<DrawingPoint[]>([]);

  const [dragInitialPixels, setDragInitialPixels] =
    useState<(DragPosition | null)[]>([]);

  // --------------------------------------------------
  // Refresh drawing positions synchronously with chart zoom / pan
  // --------------------------------------------------

  const [, setTick] = useState(0);

  const rafIdRef = useRef<number | null>(null);
  const activeUntilRef = useRef<number>(0);

// Rendering status tracking removed; not needed after eliminating flushSync

  // Update tick without flushSync; React will schedule re‑render safely.
  const syncPositionsNow = useCallback(() => {
    setTick((tick) => (tick + 1) % 1_000_000);
  }, []);

  // Continuous RAF loop during active wheel zoom, pan, or kinetic animation
  const triggerActiveRafLoop = useCallback(
    (durationMs = 400) => {
      activeUntilRef.current = Math.max(
        activeUntilRef.current,
        performance.now() + durationMs,
      );

      if (rafIdRef.current !== null) return;

      const loop = (time: number) => {
        syncPositionsNow();
        if (time < activeUntilRef.current) {
          rafIdRef.current = requestAnimationFrame(loop);
        } else {
          rafIdRef.current = null;
          syncPositionsNow();
        }
      };

      rafIdRef.current = requestAnimationFrame(loop);
    },
    [syncPositionsNow],
  );

  // Attach primitive to series so Lightweight Charts invokes updateAllViews synchronously on every render frame
  useEffect(() => {
    if (!series) return;

    const primitive: ISeriesPrimitive = {
      updateAllViews: () => {
        syncPositionsNow();
      },
      paneViews: () => [],
      priceAxisViews: () => [],
      timeAxisViews: () => [],
    };

    try {
      series.attachPrimitive(primitive);
      return () => {
        try {
          series.detachPrimitive(primitive);
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }
  }, [series, syncPositionsNow]);

  // Subscribe to visible logical range changes
  useEffect(() => {
    if (!chart) return;

    const handleRangeChange = () => {
      triggerActiveRafLoop(250);
    };

    chart
      .timeScale()
      .subscribeVisibleLogicalRangeChange(handleRangeChange);

    return () => {
      chart
        .timeScale()
        .unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [chart, triggerActiveRafLoop]);

  // Listen to user interactions (wheel and mouse dragging) on chart container
  useEffect(() => {
    const chartContainer =
      svgRef.current?.parentElement?.firstElementChild as HTMLElement | null;
    if (!chartContainer) return;

    let isMouseDown = false;

    const handleMouseDown = () => {
      isMouseDown = true;
      triggerActiveRafLoop(200);
    };

    const handleMouseMove = () => {
      if (isMouseDown) {
        triggerActiveRafLoop(150);
      }
    };

    const handleMouseUp = () => {
      if (isMouseDown) {
        isMouseDown = false;
        triggerActiveRafLoop(200);
      }
    };

    const handleWheel = () => {
      triggerActiveRafLoop(400);
    };

    chartContainer.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    chartContainer.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      chartContainer.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      chartContainer.removeEventListener('wheel', handleWheel);
    };
  }, [triggerActiveRafLoop]);

  useEffect(() => {
    // When candles, timeframe, or container dimensions change, force recalculation of positions on next frame
    triggerActiveRafLoop(200);
  }, [candles, timeframe, containerWidth, containerHeight, triggerActiveRafLoop]);

  // --------------------------------------------------
  // Coordinate conversion
  // --------------------------------------------------

  const pointToPixel = useCallback(
    (point: DrawingPoint): DragPosition | null => {
      if (!chart || !series) return null;

      try {
        const y = series.priceToCoordinate(point.price);
        if (y == null || !Number.isFinite(y)) {
          return null;
        }

        const x = timestampToCoordinate(chart, candles, point.timestamp);

        if (x == null || !Number.isFinite(x)) {
          return null;
        }

        return { x, y };
      } catch {
        return null;
      }
    },
    [chart, series, candles],
  );

  const pixelToPoint = useCallback(
    (x: number, y: number): DrawingPoint | null => {
      if (!chart || !series) return null;

      try {
        let time = chart.timeScale().coordinateToTime(x);
        const price = series.coordinateToPrice(y);

        if (price == null || !Number.isFinite(price)) {
          return null;
        }

        if (time == null && candles && candles.length > 0) {
          const logical = chart.timeScale().coordinateToLogical(x);
          if (logical != null && Number.isFinite(logical)) {
            const lastCandle = candles[candles.length - 1];
            const prevCandle = candles.length > 1 ? candles[candles.length - 2] : null;
            const barInterval = prevCandle
              ? Math.max(60, lastCandle.timestamp - prevCandle.timestamp)
              : 60;

            if (logical >= candles.length - 1) {
              const barsBeyond = logical - (candles.length - 1);
              time = (lastCandle.timestamp + Math.round(barsBeyond * barInterval)) as unknown as Time;
            } else if (logical < 0) {
              const candle0 = candles[0];
              const barsBefore = Math.abs(logical);
              time = (candle0.timestamp - Math.round(barsBefore * barInterval)) as unknown as Time;
            } else {
              const floorIdx = Math.floor(logical);
              const ceilIdx = Math.min(candles.length - 1, floorIdx + 1);
              const fraction = logical - floorIdx;
              const t0 = candles[floorIdx].timestamp;
              const t1 = candles[ceilIdx].timestamp;
              time = (t0 + Math.round((t1 - t0) * fraction)) as unknown as Time;
            }
          }
        }

        if (time == null) return null;

        return {
          timestamp: getTimestamp(time),
          price,
        };
      } catch {
        return null;
      }
    },
    [chart, series, candles],
  );

  // --------------------------------------------------
  // Drag controls
  // --------------------------------------------------

  const stopDragging = useCallback(() => {
    if (isDragging) {
      onDrawingDragEnd?.();
    }
    setIsDragging(false);
    setDragAnchorIndex(null);
    setDragStartMouse(null);
    setDragInitialPoints([]);
    setDragInitialPixels([]);
  }, [isDragging, onDrawingDragEnd]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        stopDragging();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, stopDragging]);

  const startDragging = useCallback(
    (
      event: React.MouseEvent,
      index: number,
      drawing: DrawingObject,
    ) => {
      // Hanya izinkan drag dengan klik tombol kiri mouse
      if (event.button !== 0) return;
      event.stopPropagation();

      if (drawing.locked || !svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();

      onDrawingDragStart?.();
      setIsDragging(true);
      setDragAnchorIndex(index);

      setDragStartMouse({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });

      setDragInitialPoints(
        drawing.points.map((point) => ({ ...point })),
      );

      // Simpan koordinat piksel awal untuk kalkulasi pergerakan yang mulus tanpa distorsi
      setDragInitialPixels(
        drawing.points.map((point) => pointToPixel(point)),
      );

      onSelectDrawing(drawing.id);
    },
    [onDrawingDragStart, onSelectDrawing, pointToPixel],
  );

  // --------------------------------------------------
  // Horizontal line properties
  // --------------------------------------------------

  const handleApplyHorizontalLineProperties = useCallback(
    (values: {
      color: string;
      strokeWidth: number;
      price: number;
      lineStyle: HorizontalLineStyle;
    }) => {
      if (!propertiesDrawing) return;

      const updatedPoints = propertiesDrawing.points.map(
        (point, index) =>
          index === 0
            ? { ...point, price: values.price }
            : point,
      );

      const updatedDrawing: DrawingObject = {
        ...propertiesDrawing,
        color: values.color,
        strokeWidth: values.strokeWidth,
        points: updatedPoints,
        lineStyle: values.lineStyle,
        updatedAt: new Date().toISOString(),
      };

      onUpdateDrawing(updatedDrawing);
      onSelectDrawing(updatedDrawing.id);
      setPropertiesDrawingId(null);
    },
    [
      propertiesDrawing,
      onUpdateDrawing,
      onSelectDrawing,
    ],
  );

  // --------------------------------------------------
  // Fibonacci properties
  // --------------------------------------------------

  const handleApplyFibonacciProperties = useCallback(
    (values: FibonacciPropertiesSettings) => {
      if (!fibonacciPropertiesDrawing) return;

      const p0 = fibonacciPropertiesDrawing.points[0];
      const p1 = fibonacciPropertiesDrawing.points[1];

      const updatedPoints: DrawingPoint[] = [
        {
          timestamp: values.firstPoint.time ?? p0?.timestamp ?? 0,
          price: values.firstPoint.price,
        },
        {
          timestamp: values.secondPoint.time ?? p1?.timestamp ?? 0,
          price: values.secondPoint.price,
        },
      ];

      const updatedDrawing: DrawingObject = {
        ...fibonacciPropertiesDrawing,
        color: values.color,
        strokeWidth: values.lineWidth,
        lineStyle: values.lineStyle,
        extendLeft: values.extendLeft,
        extendRight: values.extendRight,
        showPrice: values.showPrice,
        showRatio: values.showRatio,
        showBackground: values.showBackground,
        levels: values.levels.map((lvl) => ({
          id: lvl.id,
          ratio: lvl.ratio,
          color: lvl.color,
          enabled: lvl.enabled,
          visible: lvl.enabled,
          label: lvl.label,
        })),
        points: updatedPoints,
        visibleTimeframes: values.visibleTimeframes,
        updatedAt: new Date().toISOString(),
      };

      // Simpan sebagai default global untuk pembuatan berikutnya
      saveFibonacciDefaults(values);

      onUpdateDrawing(updatedDrawing);
      onSelectDrawing(updatedDrawing.id);
      setFibonacciPropertiesId(null);
    },
    [fibonacciPropertiesDrawing, onUpdateDrawing, onSelectDrawing],
  );

  // --------------------------------------------------
  // Delete selected drawing using Delete / Backspace
  // --------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (propertiesDrawingId) return;

      const target = event.target as HTMLElement | null;

      if (
        target &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      ) {
        return;
      }

      if (
        !selectedDrawingId ||
        (event.key !== 'Delete' &&
          event.key !== 'Backspace')
      ) {
        return;
      }

      const drawing = drawings.find(
        (item) => item.id === selectedDrawingId,
      );

      if (!drawing || drawing.locked) return;

      event.preventDefault();
      onDeleteDrawing(selectedDrawingId);
      onSelectDrawing(null);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    propertiesDrawingId,
    selectedDrawingId,
    drawings,
    onDeleteDrawing,
    onSelectDrawing,
  ]);

  // --------------------------------------------------
  // Mouse move and drawing drag
  // --------------------------------------------------

  const handleMouseMove = (
    event: React.MouseEvent<SVGSVGElement>,
  ) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    // Preview saat membuat Long/Short position
    if (positionCreation) {
      const point = pixelToPoint(x, y);
      if (point) {
        setPositionCreation((prev) =>
          prev ? { ...prev, currentPoint: point, currentPixel: { x, y } } : null,
        );
      }
      return;
    }

    // Preview hanya perlu diperbarui ketika membuat drawing baru.
    // Jangan memicu render tambahan ketika menggeser drawing yang sudah ada.
    if (inProgressPoints.length > 0 && !isDragging) {
      const point = pixelToPoint(x, y);

      if (point) {
        setCurrentMousePoint(point);
      }
    }

    if (
      !isDragging ||
      !selectedDrawingId ||
      !dragStartMouse ||
      dragInitialPoints.length === 0
    ) {
      return;
    }

    const selected = drawings.find(
      (drawing) => drawing.id === selectedDrawingId,
    );

    if (!selected || selected.locked) return;

    const deltaX = x - dragStartMouse.x;
    const deltaY = y - dragStartMouse.y;

    // ----------------------------------------------
    // Adjust position corner handles (105, 106, 107, 108)
    // ----------------------------------------------

    if (
      (dragAnchorIndex === POSITION_CORNER_TOP_LEFT ||
        dragAnchorIndex === POSITION_CORNER_TOP_RIGHT ||
        dragAnchorIndex === POSITION_CORNER_BOTTOM_LEFT ||
        dragAnchorIndex === POSITION_CORNER_BOTTOM_RIGHT) &&
      isPositionDrawing(selected)
    ) {
      const isLong = selected.type === 'LONG_POSITION';
      const isTop =
        dragAnchorIndex === POSITION_CORNER_TOP_LEFT ||
        dragAnchorIndex === POSITION_CORNER_TOP_RIGHT;
      const isLeft =
        dragAnchorIndex === POSITION_CORNER_TOP_LEFT ||
        dragAnchorIndex === POSITION_CORNER_BOTTOM_LEFT;

      const newPrice = series?.coordinateToPrice(y);
      const newTime =
        chart?.timeScale().coordinateToTime(x) ??
        pixelToPoint(x, y)?.timestamp;

      const currentPoints = [...selected.points];
      const entryPrice =
        selected.entryPrice ?? currentPoints[0]?.price ?? 0;
      let targetPrice =
        selected.targetPrice ?? currentPoints[1]?.price ?? entryPrice * 1.015;
      let stopPrice =
        selected.stopPrice ?? currentPoints[2]?.price ?? entryPrice * 0.9925;

      // Update level harga atas atau bawah
      if (newPrice != null && Number.isFinite(newPrice)) {
        if (isTop) {
          // Atas: Long = Target, Short = Stop Loss
          if (isLong) {
            targetPrice = newPrice;
          } else {
            stopPrice = newPrice;
          }
        } else {
          // Bawah: Long = Stop Loss, Short = Target
          if (isLong) {
            stopPrice = newPrice;
          } else {
            targetPrice = newPrice;
          }
        }
      }

      // Update waktu batas kiri atau kanan
      let startTime = currentPoints[0]?.timestamp ?? 0;
      let endTime = currentPoints[1]?.timestamp ?? startTime + 60;

      if (newTime != null) {
        const timestamp = getTimestamp(newTime);
        if (isLeft) {
          startTime = Math.min(timestamp, endTime - 1);
        } else {
          endTime = Math.max(timestamp, startTime + 1);
        }
      }

      const riskDist = isLong
        ? Math.abs(entryPrice - stopPrice)
        : Math.abs(stopPrice - entryPrice);
      const rewardDist = isLong
        ? Math.abs(targetPrice - entryPrice)
        : Math.abs(entryPrice - targetPrice);
      const riskReward =
        riskDist > MIN_RISK_DISTANCE ? rewardDist / riskDist : 0;

      const updatedPoints = [
        { ...(currentPoints[0] || {}), timestamp: startTime, price: entryPrice },
        { ...(currentPoints[1] || {}), timestamp: endTime, price: targetPrice },
        { ...(currentPoints[2] || {}), timestamp: endTime, price: stopPrice },
      ];

      onUpdateDrawing({
        ...selected,
        entryPrice,
        targetPrice,
        stopPrice,
        riskReward,
        points: updatedPoints,
        updatedAt: new Date().toISOString(),
      });

      return;
    }

    // ----------------------------------------------
    // Adjust position entry (handle 100)
    // ----------------------------------------------

    if (
      dragAnchorIndex === POSITION_ENTRY_HANDLE &&
      isPositionDrawing(selected)
    ) {
      const newPrice = series?.coordinateToPrice(y);

      if (
        newPrice == null ||
        !Number.isFinite(newPrice)
      ) {
        return;
      }

      const oldEntryPrice =
        selected.entryPrice ?? selected.points[0]?.price ?? 0;
      const priceDelta = newPrice - oldEntryPrice;

      const oldTargetPrice =
        selected.targetPrice ?? selected.points[1]?.price ?? oldEntryPrice;
      const oldStopPrice =
        selected.stopPrice ?? selected.points[2]?.price ?? oldEntryPrice;

      const newTargetPrice = oldTargetPrice + priceDelta;
      const newStopPrice = oldStopPrice + priceDelta;

      const updatedPoints = selected.points.map((pt, idx) => {
        if (idx === 0) return { ...pt, price: newPrice };
        if (idx === 1) return { ...pt, price: newTargetPrice };
        if (idx === 2) return { ...pt, price: newStopPrice };
        return pt;
      });

      const isLong = selected.type === 'LONG_POSITION';
      const riskDist = isLong
        ? Math.abs(newPrice - newStopPrice)
        : Math.abs(newStopPrice - newPrice);
      const rewardDist = isLong
        ? Math.abs(newTargetPrice - newPrice)
        : Math.abs(newPrice - newTargetPrice);
      const riskReward =
        riskDist > MIN_RISK_DISTANCE ? rewardDist / riskDist : 0;

      onUpdateDrawing({
        ...selected,
        entryPrice: newPrice,
        targetPrice: newTargetPrice,
        stopPrice: newStopPrice,
        riskReward,
        points: updatedPoints,
        updatedAt: new Date().toISOString(),
      });

      return;
    }

    // ----------------------------------------------
    // Adjust top level (handle 101 - Long: Target, Short: Stop Loss)
    // ----------------------------------------------

    if (
      dragAnchorIndex === POSITION_TARGET_HANDLE &&
      isPositionDrawing(selected)
    ) {
      const newPrice = series?.coordinateToPrice(y);

      if (
        newPrice == null ||
        !Number.isFinite(newPrice)
      ) {
        return;
      }

      const isLong = selected.type === 'LONG_POSITION';
      const entryPrice =
        selected.entryPrice ?? selected.points[0]?.price ?? 0;
      let targetPrice =
        selected.targetPrice ?? selected.points[1]?.price ?? entryPrice;
      let stopPrice =
        selected.stopPrice ?? selected.points[2]?.price ?? entryPrice;

      if (isLong) {
        targetPrice = newPrice;
      } else {
        stopPrice = newPrice;
      }

      const riskDist = isLong
        ? Math.abs(entryPrice - stopPrice)
        : Math.abs(stopPrice - entryPrice);
      const rewardDist = isLong
        ? Math.abs(targetPrice - entryPrice)
        : Math.abs(entryPrice - targetPrice);
      const riskReward =
        riskDist > MIN_RISK_DISTANCE ? rewardDist / riskDist : 0;

      const updatedPoints = selected.points.map((pt, idx) => {
        if (isLong && idx === 1) return { ...pt, price: targetPrice };
        if (!isLong && idx === 2) return { ...pt, price: stopPrice };
        return pt;
      });

      onUpdateDrawing({
        ...selected,
        targetPrice,
        stopPrice,
        riskReward,
        points: updatedPoints,
        updatedAt: new Date().toISOString(),
      });

      return;
    }

    // ----------------------------------------------
    // Adjust bottom level (handle 102 - Long: Stop Loss, Short: Target)
    // ----------------------------------------------

    if (
      dragAnchorIndex === POSITION_STOP_HANDLE &&
      isPositionDrawing(selected)
    ) {
      const newPrice = series?.coordinateToPrice(y);

      if (
        newPrice == null ||
        !Number.isFinite(newPrice)
      ) {
        return;
      }

      const isLong = selected.type === 'LONG_POSITION';
      const entryPrice =
        selected.entryPrice ?? selected.points[0]?.price ?? 0;
      let targetPrice =
        selected.targetPrice ?? selected.points[1]?.price ?? entryPrice;
      let stopPrice =
        selected.stopPrice ?? selected.points[2]?.price ?? entryPrice;

      if (isLong) {
        stopPrice = newPrice;
      } else {
        targetPrice = newPrice;
      }

      const riskDist = isLong
        ? Math.abs(entryPrice - stopPrice)
        : Math.abs(stopPrice - entryPrice);
      const rewardDist = isLong
        ? Math.abs(targetPrice - entryPrice)
        : Math.abs(entryPrice - targetPrice);
      const riskReward =
        riskDist > MIN_RISK_DISTANCE ? rewardDist / riskDist : 0;

      const updatedPoints = selected.points.map((pt, idx) => {
        if (isLong && idx === 2) return { ...pt, price: stopPrice };
        if (!isLong && idx === 1) return { ...pt, price: targetPrice };
        return pt;
      });

      onUpdateDrawing({
        ...selected,
        targetPrice,
        stopPrice,
        riskReward,
        points: updatedPoints,
        updatedAt: new Date().toISOString(),
      });

      return;
    }

    // ----------------------------------------------
    // Adjust position right time boundary (handle 103)
    // ----------------------------------------------

    if (
      dragAnchorIndex === POSITION_WIDTH_HANDLE &&
      isPositionDrawing(selected)
    ) {
      const newTime =
        chart?.timeScale().coordinateToTime(x) ??
        pixelToPoint(x, y)?.timestamp;

      if (newTime == null) return;

      const timestamp = getTimestamp(newTime);
      const entryTimestamp = selected.points[0]?.timestamp ?? 0;
      const safeEndTime = Math.max(timestamp, entryTimestamp + 1);

      const updatedPoints = selected.points.map((pt, idx) => {
        if (idx === 1 || idx === 2) {
          return { ...pt, timestamp: safeEndTime };
        }
        return pt;
      });

      onUpdateDrawing({
        ...selected,
        points: updatedPoints,
        updatedAt: new Date().toISOString(),
      });

      return;
    }

    // ----------------------------------------------
    // Adjust position left time boundary (handle 104)
    // ----------------------------------------------

    if (
      dragAnchorIndex === POSITION_START_TIME_HANDLE &&
      isPositionDrawing(selected)
    ) {
      const newTime =
        chart?.timeScale().coordinateToTime(x) ??
        pixelToPoint(x, y)?.timestamp;

      if (newTime == null) return;

      const timestamp = getTimestamp(newTime);
      const endTimestamp = selected.points[1]?.timestamp ?? 0;
      const safeStartTime = Math.min(timestamp, endTimestamp - 1);

      const updatedPoints = selected.points.map((pt, idx) => {
        if (idx === 0) {
          return { ...pt, timestamp: safeStartTime };
        }
        return pt;
      });

      onUpdateDrawing({
        ...selected,
        points: updatedPoints,
        updatedAt: new Date().toISOString(),
      });

      return;
    }

    // ----------------------------------------------
    // Move entire drawing (body drag: handle -1)
    // ----------------------------------------------

    if (dragAnchorIndex === -1) {
      if (isPositionDrawing(selected)) {
        const p0 = dragInitialPoints[0];
        const p1 = dragInitialPoints[1];
        const p2 = dragInitialPoints[2];

        const pixel0 = dragInitialPixels[0] || pointToPixel(p0);
        if (pixel0 && p0 && p1 && p2) {
          const newPoint0 = pixelToPoint(pixel0.x + deltaX, pixel0.y + deltaY);
          if (newPoint0) {
            const priceDelta = newPoint0.price - p0.price;
            const timeDelta = newPoint0.timestamp - p0.timestamp;

            const newEntry = p0.price + priceDelta;
            const newTarget = p1.price + priceDelta;
            const newStop = p2.price + priceDelta;

            const updatedPoints = [
              { ...p0, timestamp: p0.timestamp + timeDelta, price: newEntry },
              { ...p1, timestamp: p1.timestamp + timeDelta, price: newTarget },
              { ...p2, timestamp: p2.timestamp + timeDelta, price: newStop },
            ];

            onUpdateDrawing({
              ...selected,
              entryPrice: newEntry,
              targetPrice: newTarget,
              stopPrice: newStop,
              points: updatedPoints,
              updatedAt: new Date().toISOString(),
            });
            return;
          }
        }
      }

      const updatedPoints = dragInitialPoints.map(
        (initialPoint, idx) => {
          const initialPixel =
            dragInitialPixels[idx] || pointToPixel(initialPoint);

          if (!initialPixel) return initialPoint;

          const newPixel = {
            x: initialPixel.x + deltaX,
            y: initialPixel.y + deltaY,
          };

          return (
            pixelToPoint(newPixel.x, newPixel.y) ??
            initialPoint
          );
        },
      );

      onUpdateDrawing({
        ...selected,
        points: updatedPoints,
        updatedAt: new Date().toISOString(),
      });

      return;
    }

    // ----------------------------------------------
    // Move individual anchor
    // ----------------------------------------------

    if (
      dragAnchorIndex !== null &&
      dragAnchorIndex >= 0 &&
      dragAnchorIndex < selected.points.length
    ) {
      const initialPoint =
        dragInitialPoints[dragAnchorIndex];

      if (!initialPoint) return;

      const initialPixel =
        dragInitialPixels[dragAnchorIndex] ||
        pointToPixel(initialPoint);

      if (!initialPixel) return;

      const newPixel = {
        x: initialPixel.x + deltaX,
        y: initialPixel.y + deltaY,
      };

      const newPoint = pixelToPoint(
        newPixel.x,
        newPixel.y,
      );

      if (!newPoint) return;

      const updatedPoints = [...selected.points];

      updatedPoints[dragAnchorIndex] = newPoint;

      onUpdateDrawing({
        ...selected,
        points: updatedPoints,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // --------------------------------------------------
  // Create drawing: Mouse down, up, and click handlers
  // --------------------------------------------------

  const handleSvgMouseDown = (
    event: React.MouseEvent<SVGSVGElement>,
  ) => {
    if (event.button !== 0 || !svgRef.current) return;
    if (activeTool !== 'LONG_POSITION' && activeTool !== 'SHORT_POSITION') return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const point = pixelToPoint(x, y);
    if (!point) return;

    setPositionCreation({
      tool: activeTool,
      startPoint: point,
      currentPoint: point,
      startPixel: { x, y },
      currentPixel: { x, y },
    });
  };

  const handleSvgMouseUp = (
    event: React.MouseEvent<SVGSVGElement>,
  ) => {
    if (positionCreation && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const endPoint = pixelToPoint(x, y) || positionCreation.currentPoint;

      const { startPoint, startPixel, tool } = positionCreation;
      const dragDistX = Math.abs(x - startPixel.x);
      const dragDistY = Math.abs(y - startPixel.y);
      const isDrag = dragDistX >= 8 || dragDistY >= 8;

      const candleInterval = getCandleInterval(candles, timeframe);
      const now = new Date().toISOString();
      const id = `draw-${Date.now()}`;

      let startTime = startPoint.timestamp;
      let endTime = startPoint.timestamp + candleInterval * 15;
      const entryPrice = startPoint.price;
      let targetPrice: number;
      let stopPrice: number;

      if (isDrag && endPoint) {
        startTime = Math.min(startPoint.timestamp, endPoint.timestamp);
        endTime = Math.max(startPoint.timestamp, endPoint.timestamp);
        if (endTime <= startTime) {
          endTime = startTime + candleInterval * 5;
        }

        if (tool === 'LONG_POSITION') {
          if (endPoint.price > entryPrice) {
            targetPrice = endPoint.price;
            stopPrice = entryPrice - (targetPrice - entryPrice) / 2;
          } else if (endPoint.price < entryPrice) {
            stopPrice = endPoint.price;
            targetPrice = entryPrice + (entryPrice - stopPrice) * 2;
          } else {
            targetPrice = entryPrice * 1.015;
            stopPrice = entryPrice * 0.9925;
          }
        } else {
          // SHORT_POSITION
          if (endPoint.price < entryPrice) {
            targetPrice = endPoint.price;
            stopPrice = entryPrice + (entryPrice - targetPrice) / 2;
          } else if (endPoint.price > entryPrice) {
            stopPrice = endPoint.price;
            targetPrice = entryPrice - (stopPrice - entryPrice) * 2;
          } else {
            targetPrice = entryPrice * 0.985;
            stopPrice = entryPrice * 1.0075;
          }
        }
      } else {
        // Single click: proporsional terhadap timeframe aktif (15 bar)
        if (tool === 'LONG_POSITION') {
          targetPrice = entryPrice * 1.015;
          stopPrice = entryPrice * 0.9925;
        } else {
          targetPrice = entryPrice * 0.985;
          stopPrice = entryPrice * 1.0075;
        }
      }

      const riskDist =
        tool === 'LONG_POSITION'
          ? Math.abs(entryPrice - stopPrice)
          : Math.abs(stopPrice - entryPrice);
      const rewardDist =
        tool === 'LONG_POSITION'
          ? Math.abs(targetPrice - entryPrice)
          : Math.abs(entryPrice - targetPrice);
      const riskReward =
        riskDist > MIN_RISK_DISTANCE ? rewardDist / riskDist : 0;

      const newDrawing: DrawingObject = {
        id,
        sessionId: '',
        type: tool,
        points: [
          { timestamp: startTime, price: entryPrice },
          { timestamp: endTime, price: targetPrice },
          { timestamp: endTime, price: stopPrice },
        ],
        entryPrice,
        targetPrice,
        stopPrice,
        riskReward,
        color: tool === 'LONG_POSITION' ? '#10b981' : '#ef4444',
        profitColor: '#10b981',
        lossColor: '#ef4444',
        strokeWidth: 2,
        locked: false,
        visible: true,
        showLabels: true,
        showPrice: true,
        showStats: true,
        opacity: 0.22,
        createdAt: now,
        updatedAt: now,
      };

      onAddDrawing(newDrawing);
      onSelectTool('CURSOR');
      onSelectDrawing(newDrawing.id);
      setPositionCreation(null);
      justCreatedPositionRef.current = true;
      return;
    }

    stopDragging();
  };

  const handleSvgClick = (
    event: React.MouseEvent<SVGSVGElement>,
  ) => {
    if (justCreatedPositionRef.current) {
      justCreatedPositionRef.current = false;
      return;
    }

    if (isDragging || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const point = pixelToPoint(x, y);

    if (!point) return;

    if (activeTool === 'CURSOR') {
      onSelectDrawing(null);
      return;
    }

    const now = new Date().toISOString();
    const id = `draw-${Date.now()}`;

    // ----------------------------------------------
    // Long position (Click fallback: 15 candle proporsional)
    // ----------------------------------------------

    if (activeTool === 'LONG_POSITION') {
      const candleInterval = getCandleInterval(candles, timeframe);
      const startTime = point.timestamp;
      const endTime = startTime + candleInterval * 15;
      const entryPrice = point.price;
      const targetPrice = entryPrice * 1.015;
      const stopPrice = entryPrice * 0.9925;
      const riskDist = Math.abs(entryPrice - stopPrice);
      const rewardDist = Math.abs(targetPrice - entryPrice);
      const riskReward =
        riskDist > MIN_RISK_DISTANCE ? rewardDist / riskDist : 0;

      const newDrawing: DrawingObject = {
        id,
        sessionId: '',
        type: 'LONG_POSITION',
        points: [
          { timestamp: startTime, price: entryPrice },
          { timestamp: endTime, price: targetPrice },
          { timestamp: endTime, price: stopPrice },
        ],
        entryPrice,
        targetPrice,
        stopPrice,
        riskReward,
        color: '#10b981',
        profitColor: '#10b981',
        lossColor: '#ef4444',
        strokeWidth: 2,
        locked: false,
        visible: true,
        showLabels: true,
        showPrice: true,
        showStats: true,
        opacity: 0.22,
        createdAt: now,
        updatedAt: now,
      };

      onAddDrawing(newDrawing);
      onSelectTool('CURSOR');
      onSelectDrawing(newDrawing.id);

      return;
    }

    // ----------------------------------------------
    // Short position (Click fallback: 15 candle proporsional)
    // ----------------------------------------------

    if (activeTool === 'SHORT_POSITION') {
      const candleInterval = getCandleInterval(candles, timeframe);
      const startTime = point.timestamp;
      const endTime = startTime + candleInterval * 15;
      const entryPrice = point.price;
      const targetPrice = entryPrice * 0.985;
      const stopPrice = entryPrice * 1.0075;
      const riskDist = Math.abs(stopPrice - entryPrice);
      const rewardDist = Math.abs(entryPrice - targetPrice);
      const riskReward =
        riskDist > MIN_RISK_DISTANCE ? rewardDist / riskDist : 0;

      const newDrawing: DrawingObject = {
        id,
        sessionId: '',
        type: 'SHORT_POSITION',
        points: [
          { timestamp: startTime, price: entryPrice },
          { timestamp: endTime, price: targetPrice },
          { timestamp: endTime, price: stopPrice },
        ],
        entryPrice,
        targetPrice,
        stopPrice,
        riskReward,
        color: '#ef4444',
        profitColor: '#10b981',
        lossColor: '#ef4444',
        strokeWidth: 2,
        locked: false,
        visible: true,
        showLabels: true,
        showPrice: true,
        showStats: true,
        opacity: 0.22,
        createdAt: now,
        updatedAt: now,
      };

      onAddDrawing(newDrawing);
      onSelectTool('CURSOR');
      onSelectDrawing(newDrawing.id);

      return;
    }


    // ----------------------------------------------
    // Horizontal line
    // ----------------------------------------------

    if (activeTool === 'HORIZONTAL_LINE') {
      const newDrawing: DrawingObject = {
        id,
        sessionId: '',
        type: 'HORIZONTAL_LINE',
        points: [point],
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        locked: false,
        visible: true,
        createdAt: now,
        updatedAt: now,
      };

      onAddDrawing(newDrawing);
      onSelectTool('CURSOR');
      onSelectDrawing(newDrawing.id);

      return;
    }

    // ----------------------------------------------
    // Vertical line
    // ----------------------------------------------

    if (activeTool === 'VERTICAL_LINE') {
      const newDrawing: DrawingObject = {
        id,
        sessionId: '',
        type: 'VERTICAL_LINE',
        points: [point],
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        locked: false,
        visible: true,
        createdAt: now,
        updatedAt: now,
      };

      onAddDrawing(newDrawing);
      onSelectTool('CURSOR');
      onSelectDrawing(newDrawing.id);

      return;
    }

    // ----------------------------------------------
    // Text label
    // ----------------------------------------------

    if (activeTool === 'TEXT') {
      const newDrawing = createTextDrawing({
        point,
        color: currentColor,
        strokeWidth: currentStrokeWidth,
      });

      if (newDrawing) {
        onAddDrawing(newDrawing);
        onSelectTool('CURSOR');
        onSelectDrawing(newDrawing.id);
      }

      return;
    }

    // ----------------------------------------------
    // Trend line, rectangle, Fibonacci
    // ----------------------------------------------

    if (activeTool === 'FIBO_RETRACEMENT') {
      if (inProgressPoints.length === 0) {
        setInProgressPoints([point]);
        return;
      }

      const firstPoint = inProgressPoints[0];
      if (!firstPoint) return;

      const defaults = getActiveDefaultFibonacciSettings(currentColor);

      const newDrawing: DrawingObject = {
        id,
        sessionId: '',
        type: 'FIBO_RETRACEMENT',
        points: [firstPoint, point],
        color: defaults.color || currentColor,
        strokeWidth: defaults.lineWidth || currentStrokeWidth,
        lineStyle: defaults.lineStyle || 'dashed',
        extendLeft: defaults.extendLeft,
        extendRight: defaults.extendRight,
        showLabels: true,
        showPrice: defaults.showPrice,
        showRatio: defaults.showRatio,
        showBackground: defaults.showBackground,
        levels: defaults.levels.map((lvl) => ({ ...lvl })),
        visibleTimeframes: defaults.visibleTimeframes,
        locked: false,
        visible: true,
        createdAt: now,
        updatedAt: now,
      };

      onAddDrawing(newDrawing);
      setInProgressPoints([]);
      onSelectTool('CURSOR');
      onSelectDrawing(newDrawing.id);
      return;
    }

    if (activeTool === 'TREND_LINE' || activeTool === 'RECTANGLE') {
      // Titik pertama: mulai drawing.
      if (inProgressPoints.length === 0) {
        setInProgressPoints([point]);
        return;
      }

      const firstPoint = inProgressPoints[0];

      if (!firstPoint) return;

      const newDrawing: DrawingObject = {
        id,
        sessionId: '',
        type: activeTool,
        points: [firstPoint, point],
        color: currentColor,
        strokeWidth: currentStrokeWidth,

        fillColor:
          activeTool === 'RECTANGLE'
            ? currentColor
            : undefined,

        opacity:
          activeTool === 'RECTANGLE'
            ? 0.18
            : undefined,

        extendRight: false,
        showLabels: true,

        locked: false,
        visible: true,
        createdAt: now,
        updatedAt: now,
      };

      onAddDrawing(newDrawing);

      setInProgressPoints([]);
      onSelectTool('CURSOR');
      onSelectDrawing(newDrawing.id);
      return;
    }
  };

  // --------------------------------------------------
  // Preview for drawings not yet confirmed
  // --------------------------------------------------

  const renderPreview = () => {
    // ----------------------------------------------
    // Position preview (drag-to-create real-time preview)
    // ----------------------------------------------

    if (positionCreation && series) {
      const { tool, startPixel, currentPixel, startPoint, currentPoint } =
        positionCreation;

      const x1 = startPixel.x;
      const x2 = currentPixel.x;
      const leftX = Math.min(x1, x2);
      const rightX = Math.max(x1, x2);
      const width = Math.max(6, rightX - leftX);
      const centerX = leftX + width / 2;

      const entryY = startPixel.y;
      const entryPrice = startPoint.price;
      const currentPrice = currentPoint.price;

      let targetPrice: number;
      let stopPrice: number;

      if (tool === 'LONG_POSITION') {
        if (currentPrice > entryPrice) {
          targetPrice = currentPrice;
          stopPrice = entryPrice - (targetPrice - entryPrice) / 2;
        } else if (currentPrice < entryPrice) {
          stopPrice = currentPrice;
          targetPrice = entryPrice + (entryPrice - stopPrice) * 2;
        } else {
          targetPrice = entryPrice * 1.015;
          stopPrice = entryPrice * 0.9925;
        }
      } else {
        if (currentPrice < entryPrice) {
          targetPrice = currentPrice;
          stopPrice = entryPrice + (entryPrice - targetPrice) / 2;
        } else if (currentPrice > entryPrice) {
          stopPrice = currentPrice;
          targetPrice = entryPrice - (stopPrice - entryPrice) * 2;
        } else {
          targetPrice = entryPrice * 0.985;
          stopPrice = entryPrice * 1.0075;
        }
      }

      const targetY = series.priceToCoordinate(targetPrice) ?? entryY - 50;
      const stopY = series.priceToCoordinate(stopPrice) ?? entryY + 30;

      const topY = Math.min(targetY, stopY);
      const bottomY = Math.max(targetY, stopY);

      const profitY = tool === 'LONG_POSITION' ? topY : entryY;
      const profitHeight = Math.max(
        1,
        tool === 'LONG_POSITION' ? entryY - topY : bottomY - entryY,
      );
      const lossY = tool === 'LONG_POSITION' ? entryY : topY;
      const lossHeight = Math.max(
        1,
        tool === 'LONG_POSITION' ? bottomY - entryY : entryY - topY,
      );

      const riskDist =
        tool === 'LONG_POSITION'
          ? Math.abs(entryPrice - stopPrice)
          : Math.abs(stopPrice - entryPrice);
      const rewardDist =
        tool === 'LONG_POSITION'
          ? Math.abs(targetPrice - entryPrice)
          : Math.abs(entryPrice - targetPrice);
      const rr =
        riskDist > MIN_RISK_DISTANCE
          ? (rewardDist / riskDist).toFixed(2)
          : '0.00';

      const profitColor = '#10b981';
      const lossColor = '#ef4444';
      const entryColor = '#3b82f6';

      return (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={leftX}
            y={profitY}
            width={width}
            height={profitHeight}
            fill={profitColor}
            fillOpacity={0.25}
            stroke={profitColor}
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
          <rect
            x={leftX}
            y={lossY}
            width={width}
            height={lossHeight}
            fill={lossColor}
            fillOpacity={0.25}
            stroke={lossColor}
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
          <line
            x1={leftX}
            y1={entryY}
            x2={rightX}
            y2={entryY}
            stroke={entryColor}
            strokeWidth={2}
          />
          <rect
            x={centerX - 56}
            y={entryY - 18}
            width={112}
            height={36}
            rx={6}
            fill={
              isDarkMode
                ? 'rgba(15, 23, 42, 0.90)'
                : 'rgba(255, 255, 255, 0.94)'
            }
            stroke={entryColor}
            strokeWidth={1.5}
          />
          <text
            x={centerX}
            y={entryY - 4}
            textAnchor="middle"
            fill={tool === 'LONG_POSITION' ? '#38bdf8' : '#fb7185'}
            fontSize={10}
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            {tool === 'LONG_POSITION' ? 'Long Position' : 'Short Position'}
          </text>
          <text
            x={centerX}
            y={entryY + 11}
            textAnchor="middle"
            fill={isDarkMode ? '#f8fafc' : '#0f172a'}
            fontSize={11}
            fontWeight="bold"
            fontFamily="monospace"
          >
            {`RR 1 : ${rr}`}
          </text>
        </g>
      );
    }

    if (
      inProgressPoints.length === 0 ||
      !currentMousePoint
    ) {
      return null;
    }

    const firstPoint = inProgressPoints[0];

    if (!firstPoint) return null;

    const firstPixel = pointToPixel(firstPoint);
    const currentPixel = pointToPixel(currentMousePoint);

    if (!firstPixel || !currentPixel) return null;

    // ----------------------------------------------
    // Trend line preview
    // ----------------------------------------------

    if (activeTool === 'TREND_LINE') {
      return (
        <line
          x1={firstPixel.x}
          y1={firstPixel.y}
          x2={currentPixel.x}
          y2={currentPixel.y}
          stroke={currentColor}
          strokeWidth={currentStrokeWidth}
          strokeDasharray="4 4"
        />
      );
    }

    // ----------------------------------------------
    // Rectangle preview
    // ----------------------------------------------

    if (activeTool === 'RECTANGLE') {
      return (
        <RectanglePreview
          firstPoint={firstPixel}
          currentPoint={currentPixel}
          color={currentColor}
          strokeWidth={currentStrokeWidth}
        />
      );
    }

    // ----------------------------------------------
    // Fibonacci preview
    // ----------------------------------------------

    if (activeTool === 'FIBO_RETRACEMENT') {
      const defaults = getActiveDefaultFibonacciSettings(currentColor);
      return (
        <FibonacciPreview
          firstPoint={firstPoint}
          currentPoint={currentMousePoint}
          firstPixel={firstPixel}
          currentPixel={currentPixel}
          containerWidth={containerWidth}
          currentColor={defaults.color || currentColor}
          series={series}
          levels={defaults.levels}
          lineStyle={defaults.lineStyle}
          strokeWidth={defaults.lineWidth}
        />
      );
    }

    return null;
  };

  // --------------------------------------------------
  // Forward wheel events to the chart
  // --------------------------------------------------

  const forwardWheelToChart = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      triggerActiveRafLoop(400);

      const chartContainer =
        svgRef.current?.parentElement?.firstElementChild as HTMLElement | null;
      if (!chartContainer) return;

      const target =
        chartContainer.querySelector('.tv-lightweight-charts') ||
        chartContainer.querySelector('canvas') ||
        chartContainer;

      target.dispatchEvent(
        new WheelEvent('wheel', {
          clientX: event.clientX,
          clientY: event.clientY,
          screenX: event.screenX,
          screenY: event.screenY,
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          deltaZ: event.deltaZ,
          deltaMode: event.deltaMode,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    [triggerActiveRafLoop],
  );

  const handleSvgMouseLeave = () => {
    if (positionCreation) {
      setPositionCreation(null);
    }
    stopDragging();
  };

  const isDrawingMode = activeTool !== 'CURSOR';

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <>
      <svg
        ref={svgRef}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleMouseMove}
        onClick={handleSvgClick}
        onMouseUp={handleSvgMouseUp}
        onMouseLeave={handleSvgMouseLeave}
        onWheel={forwardWheelToChart}
        className={`absolute inset-0 z-15 h-full w-full ${
          isDrawingMode ? 'cursor-crosshair' : ''
        }`}
        style={{
          width: '100%',
          height: '100%',
          pointerEvents: isDrawingMode ? 'auto' : 'none',
        }}
      >
        <DrawingRenderer
          drawings={drawings}
          selectedDrawingId={selectedDrawingId}
          pointToPixel={pointToPixel}
          series={series}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          activeTimezone={activeTimezone}
          isDarkMode={isDarkMode}
          onSelectDrawing={onSelectDrawing}
          onStartDragging={startDragging}
          onUpdateDrawing={onUpdateDrawing}
          onOpenHorizontalLineProperties={(id) => {
            stopDragging();
            setPropertiesDrawingId(id);
          }}
          onOpenProperties={(id) => {
            stopDragging();
            const target = drawings.find((d) => d.id === id);
            if (target?.type === 'FIBO_RETRACEMENT') {
              setFibonacciPropertiesId(id);
            } else if (target?.type === 'HORIZONTAL_LINE') {
              setPropertiesDrawingId(id);
            } else if (
              target?.type === 'LONG_POSITION' ||
              target?.type === 'SHORT_POSITION'
            ) {
              setPositionPropertiesId(id);
            }
          }}
          onContextMenu={(event, id) => {
            stopDragging();
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              drawingId: id,
            });
          }}
        />

        {renderPreview()}
      </svg>

      {/* Horizontal line properties modal */}
      {propertiesDrawing && (
        <HorizontalLineProperties
          drawing={propertiesDrawing}
          isDarkMode={isDarkMode}
          onApply={handleApplyHorizontalLineProperties}
          onClose={() => setPropertiesDrawingId(null)}
        />
      )}

      {/* Fibonacci properties modal */}
      {fibonacciPropertiesDrawing && (
        <FibonacciPropertiesModal
          open={Boolean(fibonacciPropertiesDrawing)}
          initialSettings={{
            color: fibonacciPropertiesDrawing.color,
            lineWidth: fibonacciPropertiesDrawing.strokeWidth || 1,
            lineStyle: fibonacciPropertiesDrawing.lineStyle || 'dashed',
            extendLeft: fibonacciPropertiesDrawing.extendLeft ?? false,
            extendRight: fibonacciPropertiesDrawing.extendRight ?? true,
            showPrice: fibonacciPropertiesDrawing.showPrice ?? true,
            showRatio: fibonacciPropertiesDrawing.showRatio ?? true,
            showBackground: fibonacciPropertiesDrawing.showBackground ?? true,
            levels: (fibonacciPropertiesDrawing.levels && fibonacciPropertiesDrawing.levels.length > 0
              ? fibonacciPropertiesDrawing.levels
              : getActiveDefaultFibonacciSettings(fibonacciPropertiesDrawing.color).levels
            ).map((l) => ({
              id: l.id || `fibo-${l.ratio}`,
              ratio: l.ratio,
              color: l.color || fibonacciPropertiesDrawing.color,
              enabled: l.enabled !== false && l.visible !== false,
              label: l.label !== undefined ? l.label : String(l.ratio),
            })),
            firstPoint: {
              price: fibonacciPropertiesDrawing.points[0]?.price ?? 0,
              time: fibonacciPropertiesDrawing.points[0]?.timestamp,
            },
            secondPoint: {
              price: fibonacciPropertiesDrawing.points[1]?.price ?? 0,
              time: fibonacciPropertiesDrawing.points[1]?.timestamp,
            },
            visibleTimeframes:
              fibonacciPropertiesDrawing.visibleTimeframes &&
              fibonacciPropertiesDrawing.visibleTimeframes.length > 0
                ? fibonacciPropertiesDrawing.visibleTimeframes
                : ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'],
          }}
          onClose={() => setFibonacciPropertiesId(null)}
          onApply={handleApplyFibonacciProperties}
        />
      )}

      {/* Position properties modal */}
      {positionPropertiesDrawing && (
        <PositionPropertiesModal
          drawing={positionPropertiesDrawing}
          isDarkMode={isDarkMode}
          onApply={(values) => {
            if (!positionPropertiesDrawing) return;

            const updatedPoints = [...positionPropertiesDrawing.points];
            if (updatedPoints[0]) {
              updatedPoints[0] = { ...updatedPoints[0], price: values.entryPrice };
            }
            if (updatedPoints[1]) {
              updatedPoints[1] = { ...updatedPoints[1], price: values.targetPrice };
            }
            if (updatedPoints[2]) {
              updatedPoints[2] = { ...updatedPoints[2], price: values.stopPrice };
            }

            const riskDist = Math.abs(values.entryPrice - values.stopPrice);
            const rewardDist = Math.abs(values.targetPrice - values.entryPrice);
            const riskReward = riskDist > MIN_RISK_DISTANCE
              ? rewardDist / riskDist
              : 0;

            onUpdateDrawing({
              ...positionPropertiesDrawing,
              points: updatedPoints,
              entryPrice: values.entryPrice,
              targetPrice: values.targetPrice,
              stopPrice: values.stopPrice,
              riskReward,
              color: values.color,
              profitColor: values.profitColor,
              lossColor: values.lossColor,
              opacity: values.opacity,
              showLabels: values.showLabels,
              showPrice: values.showPrice,
              showStats: values.showStats,
              updatedAt: new Date().toISOString(),
            });
            onSelectDrawing(positionPropertiesDrawing.id);
            setPositionPropertiesId(null);
          }}
          onClose={() => setPositionPropertiesId(null)}
        />
      )}

      {/* Drawing context menu */}
      {contextMenu && contextMenuDrawing && (
        <DrawingContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          drawing={contextMenuDrawing}
          onClose={() => setContextMenu(null)}
          onOpenProperties={(id) => {
            setContextMenu(null);
            const target = drawings.find((d) => d.id === id);
            if (target?.type === 'FIBO_RETRACEMENT') {
              setFibonacciPropertiesId(id);
            } else if (target?.type === 'HORIZONTAL_LINE') {
              setPropertiesDrawingId(id);
            } else if (
              target?.type === 'LONG_POSITION' ||
              target?.type === 'SHORT_POSITION'
            ) {
              setPositionPropertiesId(id);
            }
          }}
          onDuplicate={(drawing) => {
            setContextMenu(null);
            const newDrawing: DrawingObject = {
              ...drawing,
              id: `draw-${Date.now()}`,
              points: drawing.points.map((p) => ({
                ...p,
                price: p.price * 1.001,
              })),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            onAddDrawing(newDrawing);
            onSelectDrawing(newDrawing.id);
          }}
          onToggleLock={(id) => {
            setContextMenu(null);
            const target = drawings.find((d) => d.id === id);
            if (target) {
              onUpdateDrawing({
                ...target,
                locked: !target.locked,
                updatedAt: new Date().toISOString(),
              });
            }
          }}
          onToggleVisibility={(id) => {
            setContextMenu(null);
            const target = drawings.find((d) => d.id === id);
            if (target) {
              onUpdateDrawing({
                ...target,
                visible: !target.visible,
                updatedAt: new Date().toISOString(),
              });
            }
          }}
          onDelete={(id) => {
            setContextMenu(null);
            onDeleteDrawing(id);
            onSelectDrawing(null);
          }}
        />
      )}
    </>
  );
};

export default DrawingLayer;

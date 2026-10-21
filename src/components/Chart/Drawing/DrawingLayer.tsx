
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  IChartApi,
  ISeriesApi,
  Time,
} from 'lightweight-charts';

import type {
  DrawingObject,
  DrawingPoint,
  DrawingToolType,
  Candle,
  Timeframe,
} from '../../../types/index.js';

import HorizontalLineProperties from './HorizontalLine/HorizontalLineProperties.js';
import type { HorizontalLineStyle } from './HorizontalLine/horizontalLine.defaults.js';
import { RectanglePreview } from './Rectangle/RectanglePreview.js';
import { createTextDrawing } from './Text/TextCreator.js';
import { DrawingRenderer } from './DrawingRenderer.js';
import { createFibonacciLevels } from './Fibonacci/fibonacci.utils.js';
import { FibonacciPreview } from './Fibonacci/FibonacciPreview.js';
import { createLongPositionDrawing } from './LongPosition/longPosition.utils.js';
import { createShortPositionDrawing } from './ShortPosition/shortPosition.utils.js';

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

const POSITION_WIDTH_DAYS = 3;
const MIN_RISK_DISTANCE = 0.0001;

const POSITION_TARGET_HANDLE = 101;
const POSITION_STOP_HANDLE = 102;
const POSITION_WIDTH_HANDLE = 103;

const isPositionDrawing = (
  drawing: DrawingObject,
): boolean =>
  drawing.type === 'LONG_POSITION' ||
  drawing.type === 'SHORT_POSITION';

const getTimestamp = (time: Time): number =>
  typeof time === 'number' ? time : Number(time);

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

  // 2. Before first candle
  if (timestamp <= candles[0].timestamp) {
    const x0 = timeScale.timeToCoordinate(candles[0].timestamp as Time);
    if (x0 === null || !Number.isFinite(x0)) return null;
    if (candles.length > 1) {
      const x1 = timeScale.timeToCoordinate(candles[1].timestamp as Time);
      if (x1 !== null && Number.isFinite(x1)) {
        const dt = candles[1].timestamp - candles[0].timestamp;
        if (dt > 0) {
          const dxPerSec = (x1 - x0) / dt;
          return x0 - (candles[0].timestamp - timestamp) * dxPerSec;
        }
      }
    }
    return x0;
  }

  // 3. After last candle
  const lastIndex = candles.length - 1;
  if (timestamp >= candles[lastIndex].timestamp) {
    const xLast = timeScale.timeToCoordinate(candles[lastIndex].timestamp as Time);
    if (xLast === null || !Number.isFinite(xLast)) return null;
    if (candles.length > 1) {
      const xPrev = timeScale.timeToCoordinate(candles[lastIndex - 1].timestamp as Time);
      if (xPrev !== null && Number.isFinite(xPrev)) {
        const dt = candles[lastIndex].timestamp - candles[lastIndex - 1].timestamp;
        if (dt > 0) {
          const dxPerSec = (xLast - xPrev) / dt;
          return xLast + (timestamp - candles[lastIndex].timestamp) * dxPerSec;
        }
      }
    }
    return xLast;
  }

  // 4. Binary search for candle interval
  let low = 0;
  let high = lastIndex;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (candles[mid].timestamp <= timestamp) {
      if (mid === lastIndex || candles[mid + 1].timestamp > timestamp) {
        const c1 = candles[mid];
        const c2 = candles[mid + 1];
        const x1 = timeScale.timeToCoordinate(c1.timestamp as Time);
        const x2 = timeScale.timeToCoordinate(c2.timestamp as Time);

        if (x1 !== null && x2 !== null && Number.isFinite(x1) && Number.isFinite(x2)) {
          const dt = c2.timestamp - c1.timestamp;
          const ratio = dt > 0 ? (timestamp - c1.timestamp) / dt : 0;
          return x1 + (x2 - x1) * ratio;
        }
        if (x1 !== null && Number.isFinite(x1)) return x1;
        if (x2 !== null && Number.isFinite(x2)) return x2;
        return null;
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
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
  // Drag state
  // --------------------------------------------------

  const [isDragging, setIsDragging] = useState(false);

  const [dragAnchorIndex, setDragAnchorIndex] =
    useState<number | null>(null);

  const [dragStartMouse, setDragStartMouse] =
    useState<DragPosition | null>(null);

  const [dragInitialPoints, setDragInitialPoints] =
    useState<DrawingPoint[]>([]);

  // --------------------------------------------------
  // Refresh drawing positions when the chart moves or timeframe changes
  // --------------------------------------------------

  const [, setTick] = useState(0);

  useEffect(() => {
    if (!chart) return;

    const handleRangeChange = () => {
      setTick((tick) => (tick + 1) % 1_000_000);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(
      handleRangeChange,
    );

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(
        handleRangeChange,
      );
    };
  }, [chart]);

  useEffect(() => {
    // When candles, timeframe, or container dimensions change, force recalculation of positions on next frame
    const raf = requestAnimationFrame(() => {
      setTick((tick) => (tick + 1) % 1_000_000);
    });
    return () => cancelAnimationFrame(raf);
  }, [candles, timeframe, containerWidth, containerHeight]);

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

        // Fallback x for drawings (like Horizontal Line) that only need y
        if (x == null || !Number.isFinite(x)) {
          return { x: 0, y };
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
            const barsBeyond = logical - (candles.length - 1);
            time = (lastCandle.timestamp + Math.round(barsBeyond * barInterval)) as unknown as Time;
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

      onSelectDrawing(drawing.id);
    },
    [onDrawingDragStart, onSelectDrawing],
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
    // Adjust position target
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

      const entryPrice =
        selected.entryPrice ?? selected.points[0].price;

      const stopPrice =
        selected.stopPrice ?? entryPrice;

      const riskReward =
        Math.abs(newPrice - entryPrice) /
        Math.max(
          MIN_RISK_DISTANCE,
          Math.abs(entryPrice - stopPrice),
        );

      const updatedPoints = [...selected.points];

      if (updatedPoints[1]) {
        updatedPoints[1] = {
          ...updatedPoints[1],
          price: newPrice,
        };
      }

      onUpdateDrawing({
        ...selected,
        targetPrice: newPrice,
        riskReward,
        points: updatedPoints,
        updatedAt: new Date().toISOString(),
      });

      return;
    }

    // ----------------------------------------------
    // Adjust position stop loss
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

      const entryPrice =
        selected.entryPrice ?? selected.points[0].price;

      const targetPrice =
        selected.targetPrice ?? entryPrice;

      const riskReward =
        Math.abs(targetPrice - entryPrice) /
        Math.max(
          MIN_RISK_DISTANCE,
          Math.abs(entryPrice - newPrice),
        );

      const updatedPoints = [...selected.points];

      if (updatedPoints[2]) {
        updatedPoints[2] = {
          ...updatedPoints[2],
          price: newPrice,
        };
      }

      onUpdateDrawing({
        ...selected,
        stopPrice: newPrice,
        riskReward,
        points: updatedPoints,
        updatedAt: new Date().toISOString(),
      });

      return;
    }

    // ----------------------------------------------
    // Adjust position width
    // ----------------------------------------------

    if (
      dragAnchorIndex === POSITION_WIDTH_HANDLE &&
      isPositionDrawing(selected)
    ) {
      const newTime = chart
        ?.timeScale()
        .coordinateToTime(x);

      if (newTime == null) return;

      const timestamp = getTimestamp(newTime);
      const updatedPoints = [...selected.points];

      if (updatedPoints[1]) {
        updatedPoints[1] = {
          ...updatedPoints[1],
          timestamp,
        };
      }

      if (updatedPoints[2]) {
        updatedPoints[2] = {
          ...updatedPoints[2],
          timestamp,
        };
      }

      onUpdateDrawing({
        ...selected,
        points: updatedPoints,
        updatedAt: new Date().toISOString(),
      });

      return;
    }

    // ----------------------------------------------
    // Move entire drawing
    // ----------------------------------------------

    if (dragAnchorIndex === -1) {
      const updatedPoints = dragInitialPoints.map(
        (initialPoint) => {
          const initialPixel = pointToPixel(initialPoint);

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

      let extraUpdates: Partial<DrawingObject> = {};

      if (isPositionDrawing(selected)) {
        const originalPoint = dragInitialPoints[0];
        const newPoint = updatedPoints[0];

        if (originalPoint && newPoint) {
          const priceDelta =
            newPoint.price - originalPoint.price;

          extraUpdates = {
            entryPrice:
              (selected.entryPrice ?? originalPoint.price) +
              priceDelta,

            targetPrice:
              (selected.targetPrice ?? originalPoint.price) +
              priceDelta,

            stopPrice:
              (selected.stopPrice ?? originalPoint.price) +
              priceDelta,
          };
        }
      }

      onUpdateDrawing({
        ...selected,
        ...extraUpdates,
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

      const initialPixel = pointToPixel(initialPoint);

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
  // Create drawing on canvas click
  // --------------------------------------------------

  const handleSvgClick = (
    event: React.MouseEvent<SVGSVGElement>,
  ) => {
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
    // Long position
    // ----------------------------------------------

    if (activeTool === 'LONG_POSITION') {
      const newDrawing = createLongPositionDrawing({
        point,
        id,
        now,
        sessionId: '',
        widthDays: POSITION_WIDTH_DAYS,
      });

      onAddDrawing(newDrawing);
      onSelectTool('CURSOR');
      onSelectDrawing(newDrawing.id);

      return;
    }

    

  
    // ----------------------------------------------
    // Short position
    // ----------------------------------------------

    if (activeTool === 'SHORT_POSITION') {
      const newDrawing = createShortPositionDrawing({
        point,
        id,
        now,
        sessionId: '',
        widthDays: POSITION_WIDTH_DAYS,
      });

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

    if (
      activeTool === 'TREND_LINE' ||
      activeTool === 'RECTANGLE' ||
      activeTool === 'FIBO_RETRACEMENT'
    ) {
      // Titik pertama: mulai drawing.
      if (inProgressPoints.length === 0) {
        setInProgressPoints([point]);
        return;
      }

      const firstPoint = inProgressPoints[0];

      if (!firstPoint) return;

      // Level Fibonacci sekarang dibuat oleh modul Fibonacci.
      const levels =
        activeTool === 'FIBO_RETRACEMENT'
          ? createFibonacciLevels(currentColor)
          : undefined;

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
        levels,

        locked: false,
        visible: true,
        createdAt: now,
        updatedAt: now,
      };

      onAddDrawing(newDrawing);

      setInProgressPoints([]);
      onSelectTool('CURSOR');
      onSelectDrawing(newDrawing.id);
    }
  };

  // --------------------------------------------------
  // Preview for drawings not yet confirmed
  // --------------------------------------------------

  const renderPreview = () => {
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
      return (
        <FibonacciPreview
          firstPoint={firstPoint}
          currentPoint={currentMousePoint}
          firstPixel={firstPixel}
          currentPixel={currentPixel}
          containerWidth={containerWidth}
          currentColor={currentColor}
          series={series}
          levels={createFibonacciLevels(currentColor)}
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
      const chartContainer =
        svgRef.current?.parentElement?.firstElementChild;

      const canvas =
        chartContainer?.querySelector('canvas') ??
        chartContainer;

      if (!canvas) return;

      canvas.dispatchEvent(
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
    [],
  );

  const isDrawingMode = activeTool !== 'CURSOR';

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <>
      <svg
        ref={svgRef}
        onMouseMove={handleMouseMove}
        onClick={handleSvgClick}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
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
    </>
  );
};

export default DrawingLayer;

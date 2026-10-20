import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import {
  DrawingObject,
  DrawingToolType,
  DrawingPoint,
} from '../types/index.js';
import { formatDateTimeWithTz } from '../utils/timezone.js';
import { HorizontalLineRenderer } from './Chart/Drawing/HorizontalLine/HorizontalLineRenderer.js';
import HorizontalLineProperties from './Chart/Drawing/HorizontalLine/HorizontalLineProperties.js';
import type { HorizontalLineStyle } from './Chart/Drawing/HorizontalLine/horizontalLine.defaults.js';
import { VerticalLineRenderer } from './Chart/Drawing/VerticalLine/VerticalLineRenderer.js';
import { TrendLineRenderer } from './Chart/Drawing/TrendLine/TrendLineRenderer.js';

interface DrawingLayerProps {
  drawings: DrawingObject[];
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  selectedDrawingId: string | null;
  onSelectDrawing: (id: string | null) => void;
  onAddDrawing: (drawing: DrawingObject) => void;
  onUpdateDrawing: (drawing: DrawingObject) => void;
  onDeleteDrawing: (id: string) => void;
  chart: IChartApi | null;
  series: ISeriesApi<'Candlestick'> | null;
  currentColor: string;
  currentStrokeWidth: number;
  activeTimezone: string;
  isDarkMode: boolean;
  containerWidth: number;
  containerHeight: number;
}

export const DrawingLayer: React.FC<DrawingLayerProps> = ({
  drawings,
  activeTool,
  onSelectTool,
  selectedDrawingId,
  onSelectDrawing,
  onAddDrawing,
  onUpdateDrawing,
  onDeleteDrawing,
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

  // In-progress drawing anchors
  const [inProgressPoints, setInProgressPoints] = useState<DrawingPoint[]>([]);
  const [currentMousePoint, setCurrentMousePoint] =
    useState<DrawingPoint | null>(null);

  // Horizontal Line Properties
  const [propertiesDrawingId, setPropertiesDrawingId] = useState<string | null>(
    null,
  );

  const propertiesDrawing =
    drawings.find(
      (drawing) =>
        drawing.id === propertiesDrawingId &&
        drawing.type === 'HORIZONTAL_LINE',
    ) ?? null;

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragAnchorIndex, setDragAnchorIndex] = useState<number | null>(null);
  const [dragStartMouse, setDragStartMouse] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [dragInitialPoints, setDragInitialPoints] = useState<DrawingPoint[]>([]);

  // Force re-render on chart pan/zoom
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!chart) return;

    const handleRangeChange = () => {
      setTick((tick) => (tick + 1) % 1000000);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
    };
  }, [chart]);

  // Coordinate conversion helpers
  const pointToPixel = useCallback(
    (pt: DrawingPoint): { x: number; y: number } | null => {
      if (!chart || !series) return null;

      try {
        const x = chart.timeScale().timeToCoordinate(pt.timestamp as Time);
        const y = series.priceToCoordinate(pt.price);

        if (x === null || y === null || !Number.isFinite(x) || !Number.isFinite(y)) {
          return null;
        }

        return { x, y };
      } catch {
        return null;
      }
    },
    [chart, series],
  );

  const pixelToPoint = useCallback(
    (x: number, y: number): DrawingPoint | null => {
      if (!chart || !series) return null;

      try {
        const time = chart.timeScale().coordinateToTime(x);
        const price = series.coordinateToPrice(y);

        if (time === null || price === null || !Number.isFinite(price)) {
          return null;
        }

        const timestamp = typeof time === 'number' ? time : Number(time);

        return { timestamp, price };
      } catch {
        return null;
      }
    },
    [chart, series],
  );

  // Stop dragging
  const stopDragging = useCallback(() => {
    setIsDragging(false);
    setDragAnchorIndex(null);
    setDragStartMouse(null);
    setDragInitialPoints([]);
  }, []);

  // Apply Horizontal Line Properties
  const handleApplyHorizontalLineProperties = (values: {
    color: string;
    strokeWidth: number;
    price: number;
    lineStyle: HorizontalLineStyle;
  }) => {
    if (!propertiesDrawing) return;

    const updatedPoints = propertiesDrawing.points.map((point, index) =>
      index === 0 ? { ...point, price: values.price } : point,
    );

    const updatedDrawing = {
      ...propertiesDrawing,
      color: values.color,
      strokeWidth: values.strokeWidth,
      points: updatedPoints,
      lineStyle: values.lineStyle,
      updatedAt: new Date().toISOString(),
    } as DrawingObject;

    onUpdateDrawing(updatedDrawing);
    onSelectDrawing(updatedDrawing.id);
    setPropertiesDrawingId(null);
  };

  // Keydown listener for deleting selected drawing
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
        selectedDrawingId &&
        (event.key === 'Delete' || event.key === 'Backspace')
      ) {
        const drawing = drawings.find((item) => item.id === selectedDrawingId);

        if (drawing && !drawing.locked) {
          event.preventDefault();
          onDeleteDrawing(selectedDrawingId);
          onSelectDrawing(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    propertiesDrawingId,
    selectedDrawingId,
    drawings,
    onDeleteDrawing,
    onSelectDrawing,
  ]);

  // Mouse move handler
  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const point = pixelToPoint(x, y);

    if (point) setCurrentMousePoint(point);

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

    // Drag target handle for Long/Short Position
    if (
      dragAnchorIndex === 101 &&
      (selected.type === 'LONG_POSITION' ||
        selected.type === 'SHORT_POSITION')
    ) {
      const newPrice = series?.coordinateToPrice(y);

      if (newPrice == null || !Number.isFinite(newPrice)) return;

      const entryPrice = selected.entryPrice ?? selected.points[0].price;
      const stopPrice = selected.stopPrice ?? entryPrice;
      const riskReward =
        Math.abs(newPrice - entryPrice) /
        Math.max(0.0001, Math.abs(entryPrice - stopPrice));

      const updatedPoints = [...selected.points];

      if (updatedPoints[1]) {
        updatedPoints[1] = { ...updatedPoints[1], price: newPrice };
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

    // Drag Stop Loss handle for Long/Short Position
    if (
      dragAnchorIndex === 102 &&
      (selected.type === 'LONG_POSITION' ||
        selected.type === 'SHORT_POSITION')
    ) {
      const newPrice = series?.coordinateToPrice(y);

      if (newPrice == null || !Number.isFinite(newPrice)) return;

      const entryPrice = selected.entryPrice ?? selected.points[0].price;
      const targetPrice = selected.targetPrice ?? entryPrice;
      const riskReward =
        Math.abs(targetPrice - entryPrice) /
        Math.max(0.0001, Math.abs(entryPrice - newPrice));

      const updatedPoints = [...selected.points];

      if (updatedPoints[2]) {
        updatedPoints[2] = { ...updatedPoints[2], price: newPrice };
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

    // Drag width handle for Long/Short Position
    if (
      dragAnchorIndex === 103 &&
      (selected.type === 'LONG_POSITION' ||
        selected.type === 'SHORT_POSITION')
    ) {
      const newTime = chart?.timeScale().coordinateToTime(x);

      if (newTime == null) return;

      const timestamp =
        typeof newTime === 'number' ? newTime : Number(newTime);

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

    // Move entire drawing
    if (dragAnchorIndex === -1) {
      const updatedPoints = dragInitialPoints.map((initialPoint) => {
        const initialPixel = pointToPixel(initialPoint);

        if (!initialPixel) return initialPoint;

        const newPixel = {
          x: initialPixel.x + deltaX,
          y: initialPixel.y + deltaY,
        };

        return pixelToPoint(newPixel.x, newPixel.y) ?? initialPoint;
      });

      let extraUpdates: Partial<DrawingObject> = {};

      if (
        selected.type === 'LONG_POSITION' ||
        selected.type === 'SHORT_POSITION'
      ) {
        const originalPoint = dragInitialPoints[0];
        const newPoint = updatedPoints[0];

        if (originalPoint && newPoint) {
          const priceDelta = newPoint.price - originalPoint.price;

          extraUpdates = {
            entryPrice:
              (selected.entryPrice ?? originalPoint.price) + priceDelta,
            targetPrice:
              (selected.targetPrice ?? originalPoint.price) + priceDelta,
            stopPrice:
              (selected.stopPrice ?? originalPoint.price) + priceDelta,
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

    // Move a specific anchor handle
    if (
      dragAnchorIndex !== null &&
      dragAnchorIndex >= 0 &&
      dragAnchorIndex < selected.points.length
    ) {
      const initialPoint = dragInitialPoints[dragAnchorIndex];
      const initialPixel = pointToPixel(initialPoint);

      if (!initialPixel) return;

      const newPixel = {
        x: initialPixel.x + deltaX,
        y: initialPixel.y + deltaY,
      };

      const newPoint = pixelToPoint(newPixel.x, newPixel.y);

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

  // Click handler on canvas
  const handleSvgClick = (event: React.MouseEvent<SVGSVGElement>) => {
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

  
    // LONG POSITION
    if (activeTool === 'LONG_POSITION') {
      const entryPrice = point.price;
      const targetPrice = entryPrice * 1.015;
      const stopPrice = entryPrice * 0.9925;
      const endTimestamp = point.timestamp + 86400 * 3;

      const newDrawing: DrawingObject = {
        id: `draw-${Date.now()}`,
        sessionId: '',
        type: 'LONG_POSITION',
        points: [
          point,
          { timestamp: endTimestamp, price: targetPrice },
          { timestamp: endTimestamp, price: stopPrice },
        ],
        entryPrice,
        targetPrice,
        stopPrice,
        riskReward:
          (targetPrice - entryPrice) / (entryPrice - stopPrice),
        color: '#10b981',
        strokeWidth: 2,
        locked: false,
        visible: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onAddDrawing(newDrawing);
      onSelectTool('CURSOR');
      onSelectDrawing(newDrawing.id);
      return;
    }

    // SHORT POSITION
    if (activeTool === 'SHORT_POSITION') {
      const entryPrice = point.price;
      const targetPrice = entryPrice * 0.985;
      const stopPrice = entryPrice * 1.0075;
      const endTimestamp = point.timestamp + 86400 * 3;

      const newDrawing: DrawingObject = {
        id: `draw-${Date.now()}`,
        sessionId: '',
        type: 'SHORT_POSITION',
        points: [
          point,
          { timestamp: endTimestamp, price: targetPrice },
          { timestamp: endTimestamp, price: stopPrice },
        ],
        entryPrice,
        targetPrice,
        stopPrice,
        riskReward:
          (entryPrice - targetPrice) / (stopPrice - entryPrice),
        color: '#ef4444',
        strokeWidth: 2,
        locked: false,
        visible: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onAddDrawing(newDrawing);
      onSelectTool('CURSOR');
      onSelectDrawing(newDrawing.id);
      return;
    }

    // HORIZONTAL LINE
    if (activeTool === 'HORIZONTAL_LINE') {
      const newDrawing: DrawingObject = {
        id: `draw-${Date.now()}`,
        sessionId: '',
        type: 'HORIZONTAL_LINE',
        points: [point],
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        locked: false,
        visible: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onAddDrawing(newDrawing);
      onSelectTool('CURSOR');
      onSelectDrawing(newDrawing.id);
      return;
    }

    // VERTICAL LINE
      if (activeTool === 'VERTICAL_LINE') {
        const newDrawing: DrawingObject = {
          id: `draw-${Date.now()}`,
          sessionId: '',
          type: 'VERTICAL_LINE',
          points: [point],
          color: currentColor,
          strokeWidth: currentStrokeWidth,
          locked: false,
          visible: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        onAddDrawing(newDrawing);
        onSelectTool('CURSOR');
        onSelectDrawing(newDrawing.id);
        return;
      }

    // TEXT
    if (activeTool === 'TEXT') {
      const text = window.prompt(
        'Masukkan teks / catatan analisis:',
        'Support Level',
      );

      if (text?.trim()) {
        const newDrawing: DrawingObject = {
          id: `draw-${Date.now()}`,
          sessionId: '',
          type: 'TEXT',
          points: [point],
          color: currentColor,
          strokeWidth: currentStrokeWidth,
          text: text.trim(),
          fontSize: 12,
          locked: false,
          visible: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        onAddDrawing(newDrawing);
        onSelectTool('CURSOR');
        onSelectDrawing(newDrawing.id);
      }

      return;
    }

    // TREND LINE, RECTANGLE, FIBONACCI
    if (
      ['TREND_LINE', 'RECTANGLE', 'FIBO_RETRACEMENT'].includes(activeTool)
    ) {
      if (inProgressPoints.length === 0) {
        setInProgressPoints([point]);
      } else {
        const firstPoint = inProgressPoints[0];

        const newDrawing: DrawingObject = {
          id: `draw-${Date.now()}`,
          sessionId: '',
          type: activeTool,
          points: [firstPoint, point],
          color: currentColor,
          strokeWidth: currentStrokeWidth,
          fillColor: activeTool === 'RECTANGLE' ? currentColor : undefined,
          opacity: activeTool === 'RECTANGLE' ? 0.18 : undefined,
          extendRight: false,
          showLabels: true,
          levels:
            activeTool === 'FIBO_RETRACEMENT'
              ? [
                  { ratio: 0, color: currentColor },
                  { ratio: 0.236, color: '#f59e0b' },
                  { ratio: 0.382, color: '#10b981' },
                  { ratio: 0.5, color: '#3b82f6' },
                  { ratio: 0.618, color: '#8b5cf6' },
                  { ratio: 0.786, color: '#ec4899' },
                  { ratio: 1, color: currentColor },
                ]
              : undefined,
          locked: false,
          visible: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        onAddDrawing(newDrawing);
        setInProgressPoints([]);
        onSelectTool('CURSOR');
        onSelectDrawing(newDrawing.id);
      }

      return;
    }
  };

  const startDragging = (
    event: React.MouseEvent,
    index: number,
    drawing: DrawingObject,
  ) => {
    event.stopPropagation();

    if (drawing.locked || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();

    setIsDragging(true);
    setDragAnchorIndex(index);
    setDragStartMouse({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    setDragInitialPoints([...drawing.points]);

    onSelectDrawing(drawing.id);
  };

  // Render preview for in-progress drawing
  const renderPreview = () => {
    if (inProgressPoints.length === 0 || !currentMousePoint) return null;

    const firstPixel = pointToPixel(inProgressPoints[0]);
    const currentPixel = pointToPixel(currentMousePoint);

    if (!firstPixel || !currentPixel) return null;

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

    if (activeTool === 'RECTANGLE') {
      return (
        <rect
          x={Math.min(firstPixel.x, currentPixel.x)}
          y={Math.min(firstPixel.y, currentPixel.y)}
          width={Math.abs(firstPixel.x - currentPixel.x)}
          height={Math.abs(firstPixel.y - currentPixel.y)}
          fill={currentColor}
          fillOpacity={0.15}
          stroke={currentColor}
          strokeWidth={currentStrokeWidth}
          strokeDasharray="4 4"
        />
      );
    }

    if (activeTool === 'FIBO_RETRACEMENT') {
      const startPrice = inProgressPoints[0].price;
      const endPrice = currentMousePoint.price;
      const diff = endPrice - startPrice;
      const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

      return (
        <g opacity={0.75}>
          <line
            x1={firstPixel.x}
            y1={firstPixel.y}
            x2={currentPixel.x}
            y2={currentPixel.y}
            stroke={currentColor}
            strokeDasharray="3 3"
          />

          {ratios.map((ratio) => {
            const levelPrice = startPrice + diff * ratio;
            const levelY = series?.priceToCoordinate(levelPrice);

            if (levelY == null || !Number.isFinite(levelY)) return null;

            return (
              <g key={ratio}>
                <line
                  x1={Math.min(firstPixel.x, currentPixel.x)}
                  y1={levelY}
                  x2={containerWidth}
                  y2={levelY}
                  stroke={currentColor}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
                <text
                  x={containerWidth - 95}
                  y={levelY - 3}
                  fill={currentColor}
                  fontSize={9}
                  fontFamily="monospace"
                >
                  {(ratio * 100).toFixed(1)}% ({levelPrice.toFixed(2)})
                </text>
              </g>
            );
          })}
        </g>
      );
    }

    return null;
  };

  // Forward wheel events to the chart canvas
  const forwardWheelToChart = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      const chartContainer = svgRef.current?.parentElement?.firstElementChild;
      const canvas = chartContainer?.querySelector('canvas') || chartContainer;

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
        {/* Render all confirmed drawings */}
        {drawings
          .filter((drawing) => drawing.visible)
          .map((drawing) => {
            const isSelected = selectedDrawingId === drawing.id;
            const pixelCoords = drawing.points.map(pointToPixel);

            // Horizontal Line
            if (drawing.type === 'HORIZONTAL_LINE') {
              const point = pixelCoords[0];

              if (!point) return null;

              return (
                <HorizontalLineRenderer
                  key={drawing.id}
                  drawing={drawing}
                  isSelected={isSelected}
                  y={point.y}
                  containerWidth={containerWidth}
                  onSelect={onSelectDrawing}
                  onStartDragging={startDragging}
                  onOpenProperties={(id) => {
                    stopDragging();
                    setPropertiesDrawingId(id);
                  }}
                />
              );
            }

            // Vertical Line
            if (drawing.type === 'VERTICAL_LINE') {
              const point = pixelCoords[0];

              if (!point) return null;

              const timestamp = drawing.points[0]?.timestamp || 0;

              return (
                <g
                  key={drawing.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectDrawing(drawing.id);
                  }}
                  onMouseDown={(event) => startDragging(event, -1, drawing)}
                  className="group cursor-move"
                  style={{ pointerEvents: 'auto' }}
                >
                  <line
                    x1={point.x}
                    y1={0}
                    x2={point.x}
                    y2={containerHeight}
                    stroke={drawing.color}
                    strokeWidth={
                      isSelected
                        ? drawing.strokeWidth + 1
                        : drawing.strokeWidth
                    }
                    strokeDasharray="4 4"
                  />
                  <rect
                    x={point.x - 45}
                    y={containerHeight - 22}
                    width={90}
                    height={18}
                    rx={4}
                    fill={drawing.color}
                  />
                  <text
                    x={point.x}
                    y={containerHeight - 10}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={9}
                    fontWeight="bold"
                    fontFamily="monospace"
                    style={{ pointerEvents: 'none' }}
                  >
                    {formatDateTimeWithTz(timestamp, activeTimezone)}
                  </text>
                </g>
              );
            }

            // Trend Line
            if (drawing.type === 'TREND_LINE') {
              const [firstPoint, secondPoint] = pixelCoords;

              if (!firstPoint || !secondPoint) return null;

              return (
                <TrendLineRenderer
                  key={drawing.id}
                  drawing={drawing}
                  isSelected={isSelected}
                  firstPoint={firstPoint}
                  secondPoint={secondPoint}
                  onSelect={onSelectDrawing}
                  onStartDragging={startDragging}
                />
              );
            }

            // Rectangle
            if (drawing.type === 'RECTANGLE') {
              const [firstPoint, secondPoint] = pixelCoords;

              if (!firstPoint || !secondPoint) return null;

              const minX = Math.min(firstPoint.x, secondPoint.x);
              const minY = Math.min(firstPoint.y, secondPoint.y);
              const width = Math.abs(firstPoint.x - secondPoint.x);
              const height = Math.abs(firstPoint.y - secondPoint.y);

              return (
                <g
                  key={drawing.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectDrawing(drawing.id);
                  }}
                  className="cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                >
                  <rect
                    x={minX}
                    y={minY}
                    width={width}
                    height={height}
                    fill={drawing.fillColor || drawing.color}
                    fillOpacity={drawing.opacity ?? 0.18}
                    stroke={drawing.color}
                    strokeWidth={drawing.strokeWidth}
                    onMouseDown={(event) =>
                      startDragging(event, -1, drawing)
                    }
                  />

                  {isSelected && (
                    <>
                      <circle
                        cx={firstPoint.x}
                        cy={firstPoint.y}
                        r={4.5}
                        fill="#ffffff"
                        stroke={drawing.color}
                        strokeWidth={2}
                        onMouseDown={(event) =>
                          startDragging(event, 0, drawing)
                        }
                      />
                      <circle
                        cx={secondPoint.x}
                        cy={secondPoint.y}
                        r={4.5}
                        fill="#ffffff"
                        stroke={drawing.color}
                        strokeWidth={2}
                        onMouseDown={(event) =>
                          startDragging(event, 1, drawing)
                        }
                      />
                    </>
                  )}
                </g>
              );
            }

            // Fibonacci Retracement
            if (drawing.type === 'FIBO_RETRACEMENT') {
              const [firstPoint, secondPoint] = pixelCoords;

              if (!firstPoint || !secondPoint) return null;

              const startPrice = drawing.points[0].price;
              const endPrice = drawing.points[1].price;
              const diff = endPrice - startPrice;

              const levels = drawing.levels || [
                { ratio: 0, color: drawing.color },
                { ratio: 0.236, color: '#f59e0b' },
                { ratio: 0.382, color: '#10b981' },
                { ratio: 0.5, color: '#3b82f6' },
                { ratio: 0.618, color: '#8b5cf6' },
                { ratio: 0.786, color: '#ec4899' },
                { ratio: 1, color: drawing.color },
              ];

              const leftX = Math.min(firstPoint.x, secondPoint.x);
              const rightX = drawing.extendRight
                ? containerWidth - 10
                : Math.max(firstPoint.x, secondPoint.x);

              return (
                <g
                  key={drawing.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectDrawing(drawing.id);
                  }}
                  onMouseDown={(event) =>
                    startDragging(event, -1, drawing)
                  }
                  className="cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                >
                  <line
                    x1={firstPoint.x}
                    y1={firstPoint.y}
                    x2={secondPoint.x}
                    y2={secondPoint.y}
                    stroke={drawing.color}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    opacity={0.6}
                  />

                  {levels.map((level) => {
                    const levelPrice = startPrice + diff * level.ratio;
                    const levelY = series?.priceToCoordinate(levelPrice);

                    if (levelY == null || !Number.isFinite(levelY)) {
                      return null;
                    }

                    const levelColor = level.color || drawing.color;

                    return (
                      <g key={level.ratio}>
                        <line
                          x1={leftX}
                          y1={levelY}
                          x2={rightX}
                          y2={levelY}
                          stroke={levelColor}
                          strokeWidth={
                            level.ratio === 0.5 || level.ratio === 0.618
                              ? 2
                              : 1
                          }
                          strokeDasharray={
                            level.ratio === 0 || level.ratio === 1
                              ? undefined
                              : '4 4'
                          }
                          opacity={0.85}
                        />
                        <rect
                          x={rightX - 90}
                          y={levelY - 8}
                          width={85}
                          height={16}
                          rx={3}
                          fill={isDarkMode ? '#0f172a' : '#ffffff'}
                          stroke={levelColor}
                          strokeWidth={1}
                          opacity={0.9}
                        />
                        <text
                          x={rightX - 48}
                          y={levelY + 3.5}
                          textAnchor="middle"
                          fill={levelColor}
                          fontSize={9}
                          fontWeight="bold"
                          fontFamily="monospace"
                          style={{ pointerEvents: 'none' }}
                        >
                          {(level.ratio * 100).toFixed(1)}%{' '}
                          {levelPrice.toFixed(2)}
                        </text>
                      </g>
                    );
                  })}

                  {isSelected && (
                    <g
                      className="cursor-pointer select-none"
                      onClick={(event) => {
                        event.stopPropagation();
                        onUpdateDrawing({
                          ...drawing,
                          extendRight: !drawing.extendRight,
                          updatedAt: new Date().toISOString(),
                        });
                      }}
                    >
                      <rect
                        x={leftX}
                        y={Math.min(firstPoint.y, secondPoint.y) - 26}
                        width={125}
                        height={20}
                        rx={4}
                        fill={isDarkMode ? '#1e293b' : '#ffffff'}
                        stroke={drawing.color}
                        strokeWidth={1}
                      />
                      <text
                        x={leftX + 62}
                        y={Math.min(firstPoint.y, secondPoint.y) - 12}
                        textAnchor="middle"
                        fill={drawing.color}
                        fontSize={10}
                        fontWeight="bold"
                        style={{ pointerEvents: 'none' }}
                      >
                        {drawing.extendRight
                          ? '➔ Kanan: ON'
                          : '➔ Kanan: OFF'}
                      </text>
                    </g>
                  )}

                  {isSelected && (
                    <>
                      <circle
                        cx={firstPoint.x}
                        cy={firstPoint.y}
                        r={5}
                        fill="#ffffff"
                        stroke={drawing.color}
                        strokeWidth={2}
                        onMouseDown={(event) =>
                          startDragging(event, 0, drawing)
                        }
                      />
                      <circle
                        cx={secondPoint.x}
                        cy={secondPoint.y}
                        r={5}
                        fill="#ffffff"
                        stroke={drawing.color}
                        strokeWidth={2}
                        onMouseDown={(event) =>
                          startDragging(event, 1, drawing)
                        }
                      />
                    </>
                  )}
                </g>
              );
            }

            // Cross
            if (drawing.type === 'CROSS') {
              const point = pixelCoords[0];

              if (!point) return null;

              const size = 11;
              const price = drawing.points[0]?.price ?? 0;

              return (
                <g
                  key={drawing.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectDrawing(drawing.id);
                  }}
                  onMouseDown={(event) =>
                    startDragging(event, -1, drawing)
                  }
                  className="group cursor-move"
                  style={{ pointerEvents: 'auto' }}
                >
                  <line
                    x1={point.x - size}
                    y1={point.y}
                    x2={point.x + size}
                    y2={point.y}
                    stroke={drawing.color}
                    strokeWidth={
                      isSelected
                        ? drawing.strokeWidth + 1.5
                        : drawing.strokeWidth
                    }
                  />
                  <line
                    x1={point.x}
                    y1={point.y - size}
                    x2={point.x}
                    y2={point.y + size}
                    stroke={drawing.color}
                    strokeWidth={
                      isSelected
                        ? drawing.strokeWidth + 1.5
                        : drawing.strokeWidth
                    }
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={2.5}
                    fill={drawing.color}
                  />

                  {isSelected && (
                    <>
                      <rect
                        x={point.x + size + 4}
                        y={point.y - 9}
                        width={56}
                        height={18}
                        rx={3}
                        fill={isDarkMode ? '#0f172a' : '#ffffff'}
                        stroke={drawing.color}
                        strokeWidth={1}
                      />
                      <text
                        x={point.x + size + 32}
                        y={point.y + 3.5}
                        textAnchor="middle"
                        fill={drawing.color}
                        fontSize={10}
                        fontWeight="bold"
                        fontFamily="monospace"
                        style={{ pointerEvents: 'none' }}
                      >
                        {price.toFixed(2)}
                      </text>
                    </>
                  )}
                </g>
              );
            }

            // Long Position
            if (drawing.type === 'LONG_POSITION') {
              const entryPoint = pixelCoords[0];

              if (!entryPoint) return null;

              const entryPrice =
                drawing.entryPrice ?? drawing.points[0].price;
              const targetPrice = drawing.targetPrice ?? entryPrice * 1.015;
              const stopPrice = drawing.stopPrice ?? entryPrice * 0.9925;

              const targetY =
                series?.priceToCoordinate(targetPrice) ??
                entryPoint.y - 60;
              const stopY =
                series?.priceToCoordinate(stopPrice) ??
                entryPoint.y + 40;

              const rightPoint = pixelCoords[1];
              const startX = entryPoint.x;
              const endX = rightPoint
                ? Math.max(startX + 60, rightPoint.x)
                : startX + 140;
              const width = endX - startX;

              const profitHeight = Math.abs(entryPoint.y - targetY);
              const lossHeight = Math.abs(stopY - entryPoint.y);
              const topProfitY = Math.min(entryPoint.y, targetY);
              const topLossY = Math.min(entryPoint.y, stopY);

              const riskReward =
                Math.abs(targetPrice - entryPrice) /
                Math.max(0.0001, Math.abs(entryPrice - stopPrice));
              const targetPct =
                ((targetPrice - entryPrice) / entryPrice) * 100;
              const stopPct =
                ((entryPrice - stopPrice) / entryPrice) * 100;
              const pipMultiplier = entryPrice > 500 ? 10 : 10000;
              const targetPips =
                Math.abs(targetPrice - entryPrice) * pipMultiplier;
              const stopPips =
                Math.abs(entryPrice - stopPrice) * pipMultiplier;

              return (
                <g
                  key={drawing.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectDrawing(drawing.id);
                  }}
                  className="group cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                >
                  <rect
                    x={startX}
                    y={topProfitY}
                    width={width}
                    height={profitHeight}
                    fill="rgba(16, 185, 129, 0.22)"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    onMouseDown={(event) =>
                      startDragging(event, -1, drawing)
                    }
                  />
                  <rect
                    x={startX}
                    y={topLossY}
                    width={width}
                    height={lossHeight}
                    fill="rgba(239, 68, 68, 0.22)"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    onMouseDown={(event) =>
                      startDragging(event, -1, drawing)
                    }
                  />
                  <line
                    x1={startX}
                    y1={entryPoint.y}
                    x2={endX}
                    y2={entryPoint.y}
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                  <text
                    x={startX + 6}
                    y={topProfitY + 14}
                    fill="#10b981"
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    style={{ pointerEvents: 'none' }}
                  >
                    Target: {targetPrice.toFixed(2)} (+
                    {targetPips.toFixed(1)} pips / +{targetPct.toFixed(2)}%)
                  </text>
                  <text
                    x={startX + 6}
                    y={topLossY + lossHeight - 6}
                    fill="#ef4444"
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    style={{ pointerEvents: 'none' }}
                  >
                    Stop: {stopPrice.toFixed(2)} (-
                    {stopPips.toFixed(1)} pips / -{stopPct.toFixed(2)}%)
                  </text>
                  <rect
                    x={startX + width / 2 - 45}
                    y={entryPoint.y - 11}
                    width={90}
                    height={22}
                    rx={4}
                    fill={isDarkMode ? '#0f172a' : '#ffffff'}
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                  />
                  <text
                    x={startX + width / 2}
                    y={entryPoint.y + 4}
                    textAnchor="middle"
                    fill={isDarkMode ? '#93c5fd' : '#1d4ed8'}
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="monospace"
                    style={{ pointerEvents: 'none' }}
                  >
                    R:R 1 : {riskReward.toFixed(2)}
                  </text>

                  {isSelected && (
                    <>
                      <circle
                        cx={startX + width / 2}
                        cy={targetY}
                        r={5}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-ns-resize"
                        onMouseDown={(event) =>
                          startDragging(event, 101, drawing)
                        }
                      />
                      <circle
                        cx={startX + width / 2}
                        cy={stopY}
                        r={5}
                        fill="#ef4444"
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-ns-resize"
                        onMouseDown={(event) =>
                          startDragging(event, 102, drawing)
                        }
                      />
                      <circle
                        cx={endX}
                        cy={entryPoint.y}
                        r={5}
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-ew-resize"
                        onMouseDown={(event) =>
                          startDragging(event, 103, drawing)
                        }
                      />
                    </>
                  )}
                </g>
              );
            }

            // Short Position
            if (drawing.type === 'SHORT_POSITION') {
              const entryPoint = pixelCoords[0];

              if (!entryPoint) return null;

              const entryPrice =
                drawing.entryPrice ?? drawing.points[0].price;
              const targetPrice = drawing.targetPrice ?? entryPrice * 0.985;
              const stopPrice = drawing.stopPrice ?? entryPrice * 1.0075;

              const targetY =
                series?.priceToCoordinate(targetPrice) ??
                entryPoint.y + 60;
              const stopY =
                series?.priceToCoordinate(stopPrice) ??
                entryPoint.y - 40;

              const rightPoint = pixelCoords[1];
              const startX = entryPoint.x;
              const endX = rightPoint
                ? Math.max(startX + 60, rightPoint.x)
                : startX + 140;
              const width = endX - startX;

              const profitHeight = Math.abs(targetY - entryPoint.y);
              const lossHeight = Math.abs(entryPoint.y - stopY);
              const topProfitY = Math.min(entryPoint.y, targetY);
              const topLossY = Math.min(entryPoint.y, stopY);

              const riskReward =
                Math.abs(entryPrice - targetPrice) /
                Math.max(0.0001, Math.abs(stopPrice - entryPrice));
              const targetPct =
                ((entryPrice - targetPrice) / entryPrice) * 100;
              const stopPct =
                ((stopPrice - entryPrice) / entryPrice) * 100;
              const pipMultiplier = entryPrice > 500 ? 10 : 10000;
              const targetPips =
                Math.abs(entryPrice - targetPrice) * pipMultiplier;
              const stopPips =
                Math.abs(stopPrice - entryPrice) * pipMultiplier;

              return (
                <g
                  key={drawing.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectDrawing(drawing.id);
                  }}
                  className="group cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                >
                  <rect
                    x={startX}
                    y={topLossY}
                    width={width}
                    height={lossHeight}
                    fill="rgba(239, 68, 68, 0.22)"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    onMouseDown={(event) =>
                      startDragging(event, -1, drawing)
                    }
                  />
                  <rect
                    x={startX}
                    y={topProfitY}
                    width={width}
                    height={profitHeight}
                    fill="rgba(16, 185, 129, 0.22)"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    onMouseDown={(event) =>
                      startDragging(event, -1, drawing)
                    }
                  />
                  <line
                    x1={startX}
                    y1={entryPoint.y}
                    x2={endX}
                    y2={entryPoint.y}
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                  <text
                    x={startX + 6}
                    y={topLossY + 14}
                    fill="#ef4444"
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    style={{ pointerEvents: 'none' }}
                  >
                    Stop: {stopPrice.toFixed(2)} (-
                    {stopPips.toFixed(1)} pips / -{stopPct.toFixed(2)}%)
                  </text>
                  <text
                    x={startX + 6}
                    y={topProfitY + profitHeight - 6}
                    fill="#10b981"
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    style={{ pointerEvents: 'none' }}
                  >
                    Target: {targetPrice.toFixed(2)} (+
                    {targetPips.toFixed(1)} pips / +{targetPct.toFixed(2)}%)
                  </text>
                  <rect
                    x={startX + width / 2 - 45}
                    y={entryPoint.y - 11}
                    width={90}
                    height={22}
                    rx={4}
                    fill={isDarkMode ? '#0f172a' : '#ffffff'}
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                  />
                  <text
                    x={startX + width / 2}
                    y={entryPoint.y + 4}
                    textAnchor="middle"
                    fill={isDarkMode ? '#93c5fd' : '#1d4ed8'}
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="monospace"
                    style={{ pointerEvents: 'none' }}
                  >
                    R:R 1 : {riskReward.toFixed(2)}
                  </text>

                  {isSelected && (
                    <>
                      <circle
                        cx={startX + width / 2}
                        cy={targetY}
                        r={5}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-ns-resize"
                        onMouseDown={(event) =>
                          startDragging(event, 101, drawing)
                        }
                      />
                      <circle
                        cx={startX + width / 2}
                        cy={stopY}
                        r={5}
                        fill="#ef4444"
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-ns-resize"
                        onMouseDown={(event) =>
                          startDragging(event, 102, drawing)
                        }
                      />
                      <circle
                        cx={endX}
                        cy={entryPoint.y}
                        r={5}
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-ew-resize"
                        onMouseDown={(event) =>
                          startDragging(event, 103, drawing)
                        }
                      />
                    </>
                  )}
                </g>
              );
            }

            // Text / Label
            if (drawing.type === 'TEXT') {
              const point = pixelCoords[0];

              if (!point) return null;

              return (
                <g
                  key={drawing.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectDrawing(drawing.id);
                  }}
                  onMouseDown={(event) =>
                    startDragging(event, -1, drawing)
                  }
                  className="cursor-move"
                  style={{ pointerEvents: 'auto' }}
                >
                  <rect
                    x={point.x - 4}
                    y={point.y - 14}
                    width={(drawing.text?.length || 10) * 7.5 + 12}
                    height={22}
                    rx={4}
                    fill={
                      isDarkMode
                        ? 'rgba(15, 23, 42, 0.9)'
                        : 'rgba(255, 255, 255, 0.95)'
                    }
                    stroke={drawing.color}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  <text
                    x={point.x + 3}
                    y={point.y + 1}
                    fill={drawing.color}
                    fontSize={drawing.fontSize || 12}
                    fontWeight="600"
                    fontFamily="sans-serif"
                    style={{ pointerEvents: 'none' }}
                  >
                    {drawing.text || ''}
                  </text>
                </g>
              );
            }

            return null;
          })}

        {/* Render in-progress preview */}
        {renderPreview()}
      </svg>

      {/* Horizontal Line Properties Modal */}
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
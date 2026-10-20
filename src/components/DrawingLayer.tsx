import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { DrawingObject, DrawingToolType, DrawingPoint } from '../types/index.js';
import { formatDateTimeWithTz } from '../utils/timezone.js';

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
  const [currentMousePoint, setCurrentMousePoint] = useState<DrawingPoint | null>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragAnchorIndex, setDragAnchorIndex] = useState<number | null>(null); // -1 = whole object, 0+ = anchor index
  const [dragStartMouse, setDragStartMouse] = useState<{ x: number; y: number } | null>(null);
  const [dragInitialPoints, setDragInitialPoints] = useState<DrawingPoint[]>([]);

  // Force re-render on chart pan/zoom
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!chart) return;
    const handleRangeChange = () => {
      setTick((t) => (t + 1) % 1000000);
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
        if (x === null || y === null || isNaN(x) || isNaN(y)) return null;
        return { x, y };
      } catch {
        return null;
      }
    },
    [chart, series]
  );

  const pixelToPoint = useCallback(
    (x: number, y: number): DrawingPoint | null => {
      if (!chart || !series) return null;
      try {
        const time = chart.timeScale().coordinateToTime(x);
        const price = series.coordinateToPrice(y);
        if (time === null || price === null || isNaN(price)) return null;
        const timestamp = typeof time === 'number' ? time : Number(time);
        return { timestamp, price };
      } catch {
        return null;
      }
    },
    [chart, series]
  );

  // Keydown listener for deleting selected drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (selectedDrawingId && (e.key === 'Delete' || e.key === 'Backspace')) {
        const drawing = drawings.find((d) => d.id === selectedDrawingId);
        if (drawing && !drawing.locked) {
          e.preventDefault();
          onDeleteDrawing(selectedDrawingId);
          onSelectDrawing(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawingId, drawings, onDeleteDrawing, onSelectDrawing]);

  // Mouse move handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pt = pixelToPoint(x, y);
    if (pt) setCurrentMousePoint(pt);

    // Handle Dragging
    if (isDragging && selectedDrawingId && dragStartMouse && dragInitialPoints.length > 0) {
      const selected = drawings.find((d) => d.id === selectedDrawingId);
      if (!selected || selected.locked) return;

      const deltaX = x - dragStartMouse.x;
      const deltaY = y - dragStartMouse.y;

      if (dragAnchorIndex === 101 && (selected.type === 'LONG_POSITION' || selected.type === 'SHORT_POSITION')) {
        // Drag Target handle
        const newPrice = series?.coordinateToPrice(y);
        if (newPrice !== null && newPrice !== undefined && Number.isFinite(newPrice)) {
          const entryPrice = selected.entryPrice ?? selected.points[0].price;
          const stopPrice = selected.stopPrice ?? entryPrice;
          const rrr = Math.abs(newPrice - entryPrice) / Math.max(0.0001, Math.abs(entryPrice - stopPrice));
          const updatedPoints = [...selected.points];
          if (updatedPoints[1]) {
            updatedPoints[1] = { ...updatedPoints[1], price: newPrice };
          }
          onUpdateDrawing({
            ...selected,
            targetPrice: newPrice,
            riskReward: rrr,
            points: updatedPoints,
            updatedAt: new Date().toISOString(),
          });
        }
      } else if (dragAnchorIndex === 102 && (selected.type === 'LONG_POSITION' || selected.type === 'SHORT_POSITION')) {
        // Drag Stop Loss handle
        const newPrice = series?.coordinateToPrice(y);
        if (newPrice !== null && newPrice !== undefined && Number.isFinite(newPrice)) {
          const entryPrice = selected.entryPrice ?? selected.points[0].price;
          const targetPrice = selected.targetPrice ?? entryPrice;
          const rrr = Math.abs(targetPrice - entryPrice) / Math.max(0.0001, Math.abs(entryPrice - newPrice));
          const updatedPoints = [...selected.points];
          if (updatedPoints[2]) {
            updatedPoints[2] = { ...updatedPoints[2], price: newPrice };
          }
          onUpdateDrawing({
            ...selected,
            stopPrice: newPrice,
            riskReward: rrr,
            points: updatedPoints,
            updatedAt: new Date().toISOString(),
          });
        }
      } else if (dragAnchorIndex === 103 && (selected.type === 'LONG_POSITION' || selected.type === 'SHORT_POSITION')) {
        // Drag Width handle
        const newTime = chart?.timeScale().coordinateToTime(x);
        if (newTime !== null && newTime !== undefined) {
          const ts = typeof newTime === 'number' ? newTime : Number(newTime);
          const updatedPoints = [...selected.points];
          if (updatedPoints[1]) updatedPoints[1] = { ...updatedPoints[1], timestamp: ts };
          if (updatedPoints[2]) updatedPoints[2] = { ...updatedPoints[2], timestamp: ts };
          onUpdateDrawing({
            ...selected,
            points: updatedPoints,
            updatedAt: new Date().toISOString(),
          });
        }
      } else if (dragAnchorIndex === -1) {
        // Move whole object
        const updatedPoints = dragInitialPoints.map((initPt) => {
          const initPix = pointToPixel(initPt);
          if (!initPix) return initPt;
          const newPix = { x: initPix.x + deltaX, y: initPix.y + deltaY };
          const newPoint = pixelToPoint(newPix.x, newPix.y);
          return newPoint || initPt;
        });

        // Also shift targetPrice and stopPrice for positions
        let extraUpdates: Partial<DrawingObject> = {};
        if (selected.type === 'LONG_POSITION' || selected.type === 'SHORT_POSITION') {
          const pOrig = dragInitialPoints[0];
          const pNew = updatedPoints[0];
          if (pOrig && pNew) {
            const priceDelta = pNew.price - pOrig.price;
            extraUpdates = {
              entryPrice: (selected.entryPrice ?? pOrig.price) + priceDelta,
              targetPrice: (selected.targetPrice ?? pOrig.price) + priceDelta,
              stopPrice: (selected.stopPrice ?? pOrig.price) + priceDelta,
            };
          }
        }

        onUpdateDrawing({ ...selected, ...extraUpdates, points: updatedPoints, updatedAt: new Date().toISOString() });
      } else if (dragAnchorIndex !== null && dragAnchorIndex >= 0 && dragAnchorIndex < selected.points.length) {
        // Move specific anchor handle
        const initPt = dragInitialPoints[dragAnchorIndex];
        const initPix = pointToPixel(initPt);
        if (initPix) {
          const newPix = { x: initPix.x + deltaX, y: initPix.y + deltaY };
          const newPoint = pixelToPoint(newPix.x, newPix.y);
          if (newPoint) {
            const updatedPoints = [...selected.points];
            updatedPoints[dragAnchorIndex] = newPoint;
            onUpdateDrawing({ ...selected, points: updatedPoints, updatedAt: new Date().toISOString() });
          }
        }
      }
    }
  };

  // Click handler on canvas
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) return;
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pt = pixelToPoint(x, y);
    if (!pt) return;

    // In Cursor Mode: deselect if clicking blank canvas
    if (activeTool === 'CURSOR') {
      onSelectDrawing(null);
      return;
    }

    // 1-Point Tools (Cross, Long Position, Short Position, Horizontal Line, Vertical Line, Text)
    if (activeTool === 'CROSS') {
      const newDrawing: DrawingObject = {
        id: `draw-${Date.now()}`,
        sessionId: '',
        type: 'CROSS',
        points: [pt],
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

    if (activeTool === 'LONG_POSITION') {
      const entryPrice = pt.price;
      const targetOffset = entryPrice * 0.015; // 1.5% profit target
      const stopOffset = entryPrice * 0.0075;  // 0.75% stop loss (2.0 R:R)
      const targetPrice = entryPrice + targetOffset;
      const stopPrice = entryPrice - stopOffset;
      const timeWidth = 86400 * 3;
      const endTimestamp = pt.timestamp + timeWidth;

      const newDrawing: DrawingObject = {
        id: `draw-${Date.now()}`,
        sessionId: '',
        type: 'LONG_POSITION',
        points: [
          pt,
          { timestamp: endTimestamp, price: targetPrice },
          { timestamp: endTimestamp, price: stopPrice },
        ],
        entryPrice,
        targetPrice,
        stopPrice,
        riskReward: (targetPrice - entryPrice) / (entryPrice - stopPrice),
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

    if (activeTool === 'SHORT_POSITION') {
      const entryPrice = pt.price;
      const targetOffset = entryPrice * 0.015; // 1.5% profit target (below)
      const stopOffset = entryPrice * 0.0075;  // 0.75% stop loss (above)
      const targetPrice = entryPrice - targetOffset;
      const stopPrice = entryPrice + stopOffset;
      const timeWidth = 86400 * 3;
      const endTimestamp = pt.timestamp + timeWidth;

      const newDrawing: DrawingObject = {
        id: `draw-${Date.now()}`,
        sessionId: '',
        type: 'SHORT_POSITION',
        points: [
          pt,
          { timestamp: endTimestamp, price: targetPrice },
          { timestamp: endTimestamp, price: stopPrice },
        ],
        entryPrice,
        targetPrice,
        stopPrice,
        riskReward: (entryPrice - targetPrice) / (stopPrice - entryPrice),
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

    if (activeTool === 'HORIZONTAL_LINE') {
      const newDrawing: DrawingObject = {
        id: `draw-${Date.now()}`,
        sessionId: '',
        type: 'HORIZONTAL_LINE',
        points: [pt],
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

    if (activeTool === 'VERTICAL_LINE') {
      const newDrawing: DrawingObject = {
        id: `draw-${Date.now()}`,
        sessionId: '',
        type: 'VERTICAL_LINE',
        points: [pt],
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

    if (activeTool === 'TEXT') {
      const text = window.prompt('Masukkan teks / catatan analisis:', 'Support Level');
      if (text && text.trim()) {
        const newDrawing: DrawingObject = {
          id: `draw-${Date.now()}`,
          sessionId: '',
          type: 'TEXT',
          points: [pt],
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

    // 2-Point Tools (Trend Line, Rectangle, Fibo Retracement)
    if (['TREND_LINE', 'RECTANGLE', 'FIBO_RETRACEMENT'].includes(activeTool)) {
      if (inProgressPoints.length === 0) {
        setInProgressPoints([pt]);
      } else {
        const p1 = inProgressPoints[0];
        const newDrawing: DrawingObject = {
          id: `draw-${Date.now()}`,
          sessionId: '',
          type: activeTool,
          points: [p1, pt],
          color: currentColor,
          strokeWidth: currentStrokeWidth,
          fillColor: activeTool === 'RECTANGLE' ? currentColor : undefined,
          opacity: activeTool === 'RECTANGLE' ? 0.18 : undefined,
          extendRight: false, // JANGAN full ke kanan secara default
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
                  { ratio: 1.0, color: currentColor },
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

  const startDragging = (e: React.MouseEvent, index: number, drawing: DrawingObject) => {
    e.stopPropagation();
    if (drawing.locked) return;
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragAnchorIndex(index);
    setDragStartMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragInitialPoints([...drawing.points]);
    onSelectDrawing(drawing.id);
  };

  const stopDragging = () => {
    setIsDragging(false);
    setDragAnchorIndex(null);
    setDragStartMouse(null);
    setDragInitialPoints([]);
  };

  // Render preview for in-progress drawing
  const renderPreview = () => {
    if (inProgressPoints.length === 0 || !currentMousePoint) return null;
    const p1 = pointToPixel(inProgressPoints[0]);
    const pCurrent = pointToPixel(currentMousePoint);
    if (!p1 || !pCurrent) return null;

    if (activeTool === 'TREND_LINE') {
      return (
        <line
          x1={p1.x}
          y1={p1.y}
          x2={pCurrent.x}
          y2={pCurrent.y}
          stroke={currentColor}
          strokeWidth={currentStrokeWidth}
          strokeDasharray="4 4"
        />
      );
    }

    if (activeTool === 'RECTANGLE') {
      const minX = Math.min(p1.x, pCurrent.x);
      const minY = Math.min(p1.y, pCurrent.y);
      const w = Math.abs(p1.x - pCurrent.x);
      const h = Math.abs(p1.y - pCurrent.y);
      return (
        <rect
          x={minX}
          y={minY}
          width={w}
          height={h}
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
      const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];

      return (
        <g opacity={0.75}>
          <line x1={p1.x} y1={p1.y} x2={pCurrent.x} y2={pCurrent.y} stroke={currentColor} strokeDasharray="3 3" />
          {ratios.map((r) => {
            const lvlPrice = startPrice + diff * r;
            const lvlY = series?.priceToCoordinate(lvlPrice);
            if (lvlY === null || lvlY === undefined || isNaN(lvlY)) return null;
            return (
              <g key={r}>
                <line x1={Math.min(p1.x, pCurrent.x)} y1={lvlY} x2={containerWidth} y2={lvlY} stroke={currentColor} strokeWidth={1} strokeDasharray="2 2" />
                <text x={containerWidth - 95} y={lvlY - 3} fill={currentColor} fontSize={9} fontFamily="monospace">
                  {(r * 100).toFixed(1)}% ({lvlPrice.toFixed(2)})
                </text>
              </g>
            );
          })}
        </g>
      );
    }

    return null;
  };

  // Forward wheel events to the chart canvas so zooming always works
  const forwardWheelToChart = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    const chartContainer = svgRef.current?.parentElement?.firstElementChild;
    const canvas = chartContainer?.querySelector('canvas') || chartContainer;
    if (canvas) {
      canvas.dispatchEvent(
        new WheelEvent('wheel', {
          clientX: e.clientX,
          clientY: e.clientY,
          screenX: e.screenX,
          screenY: e.screenY,
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          deltaZ: e.deltaZ,
          deltaMode: e.deltaMode,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
          bubbles: true,
          cancelable: true,
        })
      );
    }
  }, []);

  const isDrawingMode = activeTool !== 'CURSOR';

  return (
    <svg
      ref={svgRef}
      onMouseMove={handleMouseMove}
      onClick={handleSvgClick}
      onMouseUp={stopDragging}
      onWheel={forwardWheelToChart}
      className={`absolute inset-0 w-full h-full z-15 ${
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
        .filter((d) => d.visible)
        .map((drawing) => {
          const isSelected = selectedDrawingId === drawing.id;
          const pixelCoords = drawing.points.map(pointToPixel);

          // Render Horizontal Line
          if (drawing.type === 'HORIZONTAL_LINE') {
            const pt = pixelCoords[0];
            if (!pt) return null;
            const price = drawing.points[0]?.price || 0;

            return (
              <g
                key={drawing.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDrawing(drawing.id);
                }}
                onMouseDown={(e) => startDragging(e, -1, drawing)}
                className="cursor-move group"
                style={{ pointerEvents: 'auto' }}
              >
                <line
                  x1={0}
                  y1={pt.y}
                  x2={containerWidth}
                  y2={pt.y}
                  stroke={drawing.color}
                  strokeWidth={isSelected ? drawing.strokeWidth + 1 : drawing.strokeWidth}
                  className={isSelected ? 'drop-shadow-sm' : ''}
                />
                {/* Price tag badge */}
                <rect
                  x={containerWidth - 65}
                  y={pt.y - 9}
                  width={60}
                  height={18}
                  rx={4}
                  fill={drawing.color}
                />
                <text
                  x={containerWidth - 35}
                  y={pt.y + 3.5}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={10}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {price.toFixed(2)}
                </text>
              </g>
            );
          }

          // Render Vertical Line
          if (drawing.type === 'VERTICAL_LINE') {
            const pt = pixelCoords[0];
            if (!pt) return null;
            const ts = drawing.points[0]?.timestamp || 0;

            return (
              <g
                key={drawing.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDrawing(drawing.id);
                }}
                onMouseDown={(e) => startDragging(e, -1, drawing)}
                className="cursor-move group"
                style={{ pointerEvents: 'auto' }}
              >
                <line
                  x1={pt.x}
                  y1={0}
                  x2={pt.x}
                  y2={containerHeight}
                  stroke={drawing.color}
                  strokeWidth={isSelected ? drawing.strokeWidth + 1 : drawing.strokeWidth}
                  strokeDasharray="4 4"
                />
                <rect
                  x={pt.x - 45}
                  y={containerHeight - 22}
                  width={90}
                  height={18}
                  rx={4}
                  fill={drawing.color}
                />
                <text
                  x={pt.x}
                  y={containerHeight - 10}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={9}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {formatDateTimeWithTz(ts, activeTimezone)}
                </text>
              </g>
            );
          }

          // Render Trend Line
          if (drawing.type === 'TREND_LINE') {
            const [p1, p2] = pixelCoords;
            if (!p1 || !p2) return null;

            return (
              <g
                key={drawing.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDrawing(drawing.id);
                }}
                className="cursor-pointer"
                style={{ pointerEvents: 'auto' }}
              >
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={drawing.color}
                  strokeWidth={drawing.strokeWidth}
                  className="hover:stroke-blue-400 transition-colors"
                  onMouseDown={(e) => startDragging(e, -1, drawing)}
                />
                {isSelected && (
                  <>
                    <circle
                      cx={p1.x}
                      cy={p1.y}
                      r={5}
                      fill="#ffffff"
                      stroke={drawing.color}
                      strokeWidth={2}
                      className="cursor-pointer"
                      onMouseDown={(e) => startDragging(e, 0, drawing)}
                    />
                    <circle
                      cx={p2.x}
                      cy={p2.y}
                      r={5}
                      fill="#ffffff"
                      stroke={drawing.color}
                      strokeWidth={2}
                      className="cursor-pointer"
                      onMouseDown={(e) => startDragging(e, 1, drawing)}
                    />
                  </>
                )}
              </g>
            );
          }

          // Render Rectangle (Supply & Demand Zone)
          if (drawing.type === 'RECTANGLE') {
            const [p1, p2] = pixelCoords;
            if (!p1 || !p2) return null;

            const minX = Math.min(p1.x, p2.x);
            const minY = Math.min(p1.y, p2.y);
            const w = Math.abs(p1.x - p2.x);
            const h = Math.abs(p1.y - p2.y);

            return (
              <g
                key={drawing.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDrawing(drawing.id);
                }}
                className="cursor-pointer"
                style={{ pointerEvents: 'auto' }}
              >
                <rect
                  x={minX}
                  y={minY}
                  width={w}
                  height={h}
                  fill={drawing.fillColor || drawing.color}
                  fillOpacity={drawing.opacity ?? 0.18}
                  stroke={drawing.color}
                  strokeWidth={drawing.strokeWidth}
                  onMouseDown={(e) => startDragging(e, -1, drawing)}
                />
                {isSelected && (
                  <>
                    <circle cx={p1.x} cy={p1.y} r={4.5} fill="#fff" stroke={drawing.color} strokeWidth={2} onMouseDown={(e) => startDragging(e, 0, drawing)} />
                    <circle cx={p2.x} cy={p2.y} r={4.5} fill="#fff" stroke={drawing.color} strokeWidth={2} onMouseDown={(e) => startDragging(e, 1, drawing)} />
                  </>
                )}
              </g>
            );
          }

          // Render Fibonacci Retracement
          if (drawing.type === 'FIBO_RETRACEMENT') {
            const [p1, p2] = pixelCoords;
            if (!p1 || !p2) return null;

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
              { ratio: 1.0, color: drawing.color },
            ];

            const leftX = Math.min(p1.x, p2.x);
            // Defaultnya JANGAN full ke kanan, hanya rentang p1..p2 kecuali extendRight aktif
            const rightX = drawing.extendRight
              ? containerWidth - 10
              : Math.max(p1.x, p2.x);

            return (
              <g
                key={drawing.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDrawing(drawing.id);
                }}
                onMouseDown={(e) => startDragging(e, -1, drawing)}
                className="cursor-pointer"
                style={{ pointerEvents: 'auto' }}
              >
                {/* Diagonal anchor guide */}
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={drawing.color} strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />

                {levels.map((lvl) => {
                  const lvlPrice = startPrice + diff * lvl.ratio;
                  const lvlY = series?.priceToCoordinate(lvlPrice);
                  if (lvlY === null || lvlY === undefined || isNaN(lvlY)) return null;

                  return (
                    <g key={lvl.ratio}>
                      <line
                        x1={leftX}
                        y1={lvlY}
                        x2={rightX}
                        y2={lvlY}
                        stroke={lvl.color || drawing.color}
                        strokeWidth={lvl.ratio === 0.5 || lvl.ratio === 0.618 ? 2 : 1}
                        strokeDasharray={lvl.ratio === 0 || lvl.ratio === 1 ? '' : '4 4'}
                        opacity={0.85}
                      />
                      <rect
                        x={rightX - 90}
                        y={lvlY - 8}
                        width={85}
                        height={16}
                        rx={3}
                        fill={isDarkMode ? '#0f172a' : '#ffffff'}
                        stroke={lvl.color || drawing.color}
                        strokeWidth={1}
                        opacity={0.9}
                      />
                      <text
                        x={rightX - 48}
                        y={lvlY + 3.5}
                        textAnchor="middle"
                        fill={lvl.color || drawing.color}
                        fontSize={9}
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {(lvl.ratio * 100).toFixed(1)}% {lvlPrice.toFixed(2)}
                      </text>
                    </g>
                  );
                })}

                {/* Floating control bar for Fibonacci when selected */}
                {isSelected && (
                  <g
                    className="cursor-pointer select-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateDrawing({
                        ...drawing,
                        extendRight: !drawing.extendRight,
                        updatedAt: new Date().toISOString(),
                      });
                    }}
                  >
                    <rect
                      x={leftX}
                      y={Math.min(p1.y, p2.y) - 26}
                      width={125}
                      height={20}
                      rx={4}
                      fill={isDarkMode ? '#1e293b' : '#ffffff'}
                      stroke={drawing.color}
                      strokeWidth={1}
                      className="shadow-sm"
                    />
                    <text
                      x={leftX + 62}
                      y={Math.min(p1.y, p2.y) - 12}
                      textAnchor="middle"
                      fill={drawing.color}
                      fontSize={10}
                      fontWeight="bold"
                    >
                      {drawing.extendRight ? '➔ Kanan: ON' : '➔ Kanan: OFF'}
                    </text>
                  </g>
                )}

                {isSelected && (
                  <>
                    <circle cx={p1.x} cy={p1.y} r={5} fill="#fff" stroke={drawing.color} strokeWidth={2} onMouseDown={(e) => startDragging(e, 0, drawing)} />
                    <circle cx={p2.x} cy={p2.y} r={5} fill="#fff" stroke={drawing.color} strokeWidth={2} onMouseDown={(e) => startDragging(e, 1, drawing)} />
                  </>
                )}
              </g>
            );
          }

          // Render Cross (Tanda Silang)
          if (drawing.type === 'CROSS') {
            const pt = pixelCoords[0];
            if (!pt) return null;
            const size = 11;
            const price = drawing.points[0]?.price || 0;

            return (
              <g
                key={drawing.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDrawing(drawing.id);
                }}
                onMouseDown={(e) => startDragging(e, -1, drawing)}
                className="cursor-move group"
                style={{ pointerEvents: 'auto' }}
              >
                <line
                  x1={pt.x - size}
                  y1={pt.y}
                  x2={pt.x + size}
                  y2={pt.y}
                  stroke={drawing.color}
                  strokeWidth={isSelected ? drawing.strokeWidth + 1.5 : drawing.strokeWidth}
                />
                <line
                  x1={pt.x}
                  y1={pt.y - size}
                  x2={pt.x}
                  y2={pt.y + size}
                  stroke={drawing.color}
                  strokeWidth={isSelected ? drawing.strokeWidth + 1.5 : drawing.strokeWidth}
                />
                <circle cx={pt.x} cy={pt.y} r={2.5} fill={drawing.color} />
                {isSelected && (
                  <rect
                    x={pt.x + size + 4}
                    y={pt.y - 9}
                    width={56}
                    height={18}
                    rx={3}
                    fill={isDarkMode ? '#0f172a' : '#ffffff'}
                    stroke={drawing.color}
                    strokeWidth={1}
                  />
                )}
                {isSelected && (
                  <text
                    x={pt.x + size + 32}
                    y={pt.y + 3.5}
                    textAnchor="middle"
                    fill={drawing.color}
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {price.toFixed(2)}
                  </text>
                )}
              </g>
            );
          }

          // Render Long Position (TradingView Style)
          if (drawing.type === 'LONG_POSITION') {
            const pEntry = pixelCoords[0];
            if (!pEntry) return null;

            const entryPrice = drawing.entryPrice ?? drawing.points[0].price;
            const targetPrice = drawing.targetPrice ?? (entryPrice * 1.015);
            const stopPrice = drawing.stopPrice ?? (entryPrice * 0.9925);

            const targetY = series?.priceToCoordinate(targetPrice) ?? (pEntry.y - 60);
            const stopY = series?.priceToCoordinate(stopPrice) ?? (pEntry.y + 40);

            const pRight = pixelCoords[1];
            const startX = pEntry.x;
            const endX = pRight ? Math.max(startX + 60, pRight.x) : (startX + 140);
            const width = endX - startX;

            const profitHeight = Math.abs(pEntry.y - targetY);
            const lossHeight = Math.abs(stopY - pEntry.y);
            const topProfitY = Math.min(pEntry.y, targetY);
            const topLossY = Math.min(pEntry.y, stopY);

            const rrr = Math.abs(targetPrice - entryPrice) / Math.max(0.0001, Math.abs(entryPrice - stopPrice));
            const targetPct = ((targetPrice - entryPrice) / entryPrice) * 100;
            const stopPct = ((entryPrice - stopPrice) / entryPrice) * 100;
            const targetPips = Math.abs(targetPrice - entryPrice) * (entryPrice > 500 ? 10 : 10000);
            const stopPips = Math.abs(entryPrice - stopPrice) * (entryPrice > 500 ? 10 : 10000);

            return (
              <g
                key={drawing.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDrawing(drawing.id);
                }}
                className="cursor-pointer group"
                style={{ pointerEvents: 'auto' }}
              >
                {/* Profit Target Zone (Green) */}
                <rect
                  x={startX}
                  y={topProfitY}
                  width={width}
                  height={profitHeight}
                  fill="rgba(16, 185, 129, 0.22)"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  onMouseDown={(e) => startDragging(e, -1, drawing)}
                />

                {/* Stop Loss Zone (Red) */}
                <rect
                  x={startX}
                  y={topLossY}
                  width={width}
                  height={lossHeight}
                  fill="rgba(239, 68, 68, 0.22)"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  onMouseDown={(e) => startDragging(e, -1, drawing)}
                />

                {/* Entry Line */}
                <line
                  x1={startX}
                  y1={pEntry.y}
                  x2={endX}
                  y2={pEntry.y}
                  stroke="#3b82f6"
                  strokeWidth={2}
                />

                {/* Target badge text */}
                <text
                  x={startX + 6}
                  y={topProfitY + 14}
                  fill="#10b981"
                  fontSize={10}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  Target: {targetPrice.toFixed(2)} (+{targetPips.toFixed(1)} pips / +{targetPct.toFixed(2)}%)
                </text>

                {/* Stop badge text */}
                <text
                  x={startX + 6}
                  y={topLossY + lossHeight - 6}
                  fill="#ef4444"
                  fontSize={10}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  Stop: {stopPrice.toFixed(2)} (-{stopPips.toFixed(1)} pips / -{stopPct.toFixed(2)}%)
                </text>

                {/* Center Risk/Reward badge */}
                <rect
                  x={startX + width / 2 - 45}
                  y={pEntry.y - 11}
                  width={90}
                  height={22}
                  rx={4}
                  fill={isDarkMode ? '#0f172a' : '#ffffff'}
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  className="shadow"
                />
                <text
                  x={startX + width / 2}
                  y={pEntry.y + 4}
                  textAnchor="middle"
                  fill={isDarkMode ? '#93c5fd' : '#1d4ed8'}
                  fontSize={10}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  R:R 1 : {rrr.toFixed(2)}
                </text>

                {/* Interactive Anchor Handles when selected */}
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
                      onMouseDown={(e) => startDragging(e, 101, drawing)}
                    />
                    <circle
                      cx={startX + width / 2}
                      cy={stopY}
                      r={5}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth={2}
                      className="cursor-ns-resize"
                      onMouseDown={(e) => startDragging(e, 102, drawing)}
                    />
                    <circle
                      cx={endX}
                      cy={pEntry.y}
                      r={5}
                      fill="#3b82f6"
                      stroke="#ffffff"
                      strokeWidth={2}
                      className="cursor-ew-resize"
                      onMouseDown={(e) => startDragging(e, 103, drawing)}
                    />
                  </>
                )}
              </g>
            );
          }

          // Render Short Position (TradingView Style)
          if (drawing.type === 'SHORT_POSITION') {
            const pEntry = pixelCoords[0];
            if (!pEntry) return null;

            const entryPrice = drawing.entryPrice ?? drawing.points[0].price;
            const targetPrice = drawing.targetPrice ?? (entryPrice * 0.985);
            const stopPrice = drawing.stopPrice ?? (entryPrice * 1.0075);

            const targetY = series?.priceToCoordinate(targetPrice) ?? (pEntry.y + 60);
            const stopY = series?.priceToCoordinate(stopPrice) ?? (pEntry.y - 40);

            const pRight = pixelCoords[1];
            const startX = pEntry.x;
            const endX = pRight ? Math.max(startX + 60, pRight.x) : (startX + 140);
            const width = endX - startX;

            const profitHeight = Math.abs(targetY - pEntry.y);
            const lossHeight = Math.abs(pEntry.y - stopY);
            const topProfitY = Math.min(pEntry.y, targetY);
            const topLossY = Math.min(pEntry.y, stopY);

            const rrr = Math.abs(entryPrice - targetPrice) / Math.max(0.0001, Math.abs(stopPrice - entryPrice));
            const targetPct = ((entryPrice - targetPrice) / entryPrice) * 100;
            const stopPct = ((stopPrice - entryPrice) / entryPrice) * 100;
            const targetPips = Math.abs(entryPrice - targetPrice) * (entryPrice > 500 ? 10 : 10000);
            const stopPips = Math.abs(stopPrice - entryPrice) * (entryPrice > 500 ? 10 : 10000);

            return (
              <g
                key={drawing.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDrawing(drawing.id);
                }}
                className="cursor-pointer group"
                style={{ pointerEvents: 'auto' }}
              >
                {/* Stop Loss Zone (Red - on top for Short) */}
                <rect
                  x={startX}
                  y={topLossY}
                  width={width}
                  height={lossHeight}
                  fill="rgba(239, 68, 68, 0.22)"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  onMouseDown={(e) => startDragging(e, -1, drawing)}
                />

                {/* Profit Target Zone (Green - on bottom for Short) */}
                <rect
                  x={startX}
                  y={topProfitY}
                  width={width}
                  height={profitHeight}
                  fill="rgba(16, 185, 129, 0.22)"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  onMouseDown={(e) => startDragging(e, -1, drawing)}
                />

                {/* Entry Line */}
                <line
                  x1={startX}
                  y1={pEntry.y}
                  x2={endX}
                  y2={pEntry.y}
                  stroke="#3b82f6"
                  strokeWidth={2}
                />

                {/* Stop badge text */}
                <text
                  x={startX + 6}
                  y={topLossY + 14}
                  fill="#ef4444"
                  fontSize={10}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  Stop: {stopPrice.toFixed(2)} (-{stopPips.toFixed(1)} pips / -{stopPct.toFixed(2)}%)
                </text>

                {/* Target badge text */}
                <text
                  x={startX + 6}
                  y={topProfitY + profitHeight - 6}
                  fill="#10b981"
                  fontSize={10}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  Target: {targetPrice.toFixed(2)} (+{targetPips.toFixed(1)} pips / +{targetPct.toFixed(2)}%)
                </text>

                {/* Center Risk/Reward badge */}
                <rect
                  x={startX + width / 2 - 45}
                  y={pEntry.y - 11}
                  width={90}
                  height={22}
                  rx={4}
                  fill={isDarkMode ? '#0f172a' : '#ffffff'}
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  className="shadow"
                />
                <text
                  x={startX + width / 2}
                  y={pEntry.y + 4}
                  textAnchor="middle"
                  fill={isDarkMode ? '#93c5fd' : '#1d4ed8'}
                  fontSize={10}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  R:R 1 : {rrr.toFixed(2)}
                </text>

                {/* Interactive Anchor Handles when selected */}
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
                      onMouseDown={(e) => startDragging(e, 101, drawing)}
                    />
                    <circle
                      cx={startX + width / 2}
                      cy={stopY}
                      r={5}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth={2}
                      className="cursor-ns-resize"
                      onMouseDown={(e) => startDragging(e, 102, drawing)}
                    />
                    <circle
                      cx={endX}
                      cy={pEntry.y}
                      r={5}
                      fill="#3b82f6"
                      stroke="#ffffff"
                      strokeWidth={2}
                      className="cursor-ew-resize"
                      onMouseDown={(e) => startDragging(e, 103, drawing)}
                    />
                  </>
                )}
              </g>
            );
          }

          // Render Text / Label
          if (drawing.type === 'TEXT') {
            const pt = pixelCoords[0];
            if (!pt) return null;

            return (
              <g
                key={drawing.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDrawing(drawing.id);
                }}
                onMouseDown={(e) => startDragging(e, -1, drawing)}
                className="cursor-move"
                style={{ pointerEvents: 'auto' }}
              >
                <rect
                  x={pt.x - 4}
                  y={pt.y - 14}
                  width={(drawing.text?.length || 10) * 7.5 + 12}
                  height={22}
                  rx={4}
                  fill={isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)'}
                  stroke={drawing.color}
                  strokeWidth={isSelected ? 2 : 1}
                />
                <text
                  x={pt.x + 3}
                  y={pt.y + 1}
                  fill={drawing.color}
                  fontSize={drawing.fontSize || 12}
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {drawing.text || ''}
                </text>
              </g>
            );
          }

          return null;
        })}

      {/* Render In-Progress Preview */}
      {renderPreview()}
    </svg>
  );
};

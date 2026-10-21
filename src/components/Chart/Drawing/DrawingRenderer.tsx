import React from 'react';
import type { ISeriesApi } from 'lightweight-charts';

import type {
  DrawingObject,
  DrawingPoint,
} from '../../../types/index.js';

import { formatDateTimeWithTz } from '../../../utils/timezone.js';

import { HorizontalLineRenderer } from './HorizontalLine/HorizontalLineRenderer.js';
import { TrendLineRenderer } from './TrendLine/TrendLineRenderer.js';
import { RectangleRenderer } from './Rectangle/RectangleRenderer.js';
import { TextRenderer } from './Text/TextRenderer.js';
import { FibonacciRenderer } from './Fibonacci/FibonacciRenderer.js';
import { LongPositionRenderer } from './LongPosition/LongPositionRenderer.js';
import { ShortPositionRenderer } from './ShortPosition/ShortPositionRenderer.js';

interface PixelPoint {
  x: number;
  y: number;
}

type StartDraggingHandler = (
  event: React.MouseEvent,
  index: number,
  drawing: DrawingObject,
) => void;

interface DrawingRendererProps {
  drawings: DrawingObject[];
  selectedDrawingId: string | null;
  pointToPixel: (point: DrawingPoint) => PixelPoint | null;
  series: ISeriesApi<'Candlestick'> | null;
  containerWidth: number;
  containerHeight: number;
  activeTimezone: string;
  isDarkMode: boolean;
  timeframe?: string;
  onSelectDrawing: (id: string | null) => void;
  onStartDragging: StartDraggingHandler;
  onUpdateDrawing: (drawing: DrawingObject) => void;
  onOpenHorizontalLineProperties: (id: string) => void;
  onOpenProperties?: (id: string) => void;
  onContextMenu?: (event: React.MouseEvent, id: string) => void;
}

export const DrawingRenderer: React.FC<DrawingRendererProps> = ({
  drawings,
  selectedDrawingId,
  pointToPixel,
  series,
  containerWidth,
  containerHeight,
  activeTimezone,
  isDarkMode,
  timeframe,
  onSelectDrawing,
  onStartDragging,
  onUpdateDrawing,
  onOpenHorizontalLineProperties,
  onOpenProperties,
  onContextMenu,
}) => {
  return (
    <>
      {drawings
        .filter((drawing) => {
          if (!drawing.visible) return false;
          if (
            drawing.visibleTimeframes &&
            drawing.visibleTimeframes.length > 0 &&
            timeframe
          ) {
            return drawing.visibleTimeframes.includes(timeframe);
          }
          return true;
        })
        .map((drawing) => {
          const isSelected = selectedDrawingId === drawing.id;
          const pixelCoords = drawing.points.map(pointToPixel);

          // Horizontal Line
          if (drawing.type === 'HORIZONTAL_LINE') {
            const point = pixelCoords[0];

            if (!point) return null;

            return (
              <g
                key={drawing.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectDrawing(drawing.id);
                  onContextMenu?.(e, drawing.id);
                }}
              >
                <HorizontalLineRenderer
                  drawing={drawing}
                  isSelected={isSelected}
                  y={point.y}
                  containerWidth={containerWidth}
                  onSelect={onSelectDrawing}
                  onStartDragging={onStartDragging}
                  onOpenProperties={onOpenHorizontalLineProperties}
                />
              </g>
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
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelectDrawing(drawing.id);
                  onContextMenu?.(event, drawing.id);
                }}
                onMouseDown={(event) =>
                  onStartDragging(event, -1, drawing)
                }
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
              <g
                key={drawing.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectDrawing(drawing.id);
                  onContextMenu?.(e, drawing.id);
                }}
              >
                <TrendLineRenderer
                  drawing={drawing}
                  isSelected={isSelected}
                  firstPoint={firstPoint}
                  secondPoint={secondPoint}
                  onSelect={onSelectDrawing}
                  onStartDragging={onStartDragging}
                />
              </g>
            );
          }

          // Rectangle
          if (drawing.type === 'RECTANGLE') {
            const [firstPoint, secondPoint] = pixelCoords;

            if (!firstPoint || !secondPoint) return null;

            return (
              <g
                key={drawing.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectDrawing(drawing.id);
                  onContextMenu?.(e, drawing.id);
                }}
              >
                <RectangleRenderer
                  drawing={drawing}
                  firstPoint={firstPoint}
                  secondPoint={secondPoint}
                  isSelected={isSelected}
                  onSelect={onSelectDrawing}
                  onStartDragging={onStartDragging}
                />
              </g>
            );
          }

          // Fibonacci Retracement
          if (drawing.type === 'FIBO_RETRACEMENT') {
            const [firstPoint, secondPoint] = pixelCoords;

            if (!firstPoint || !secondPoint) return null;

            return (
              <FibonacciRenderer
                key={drawing.id}
                drawing={drawing}
                isSelected={isSelected}
                firstPoint={firstPoint}
                secondPoint={secondPoint}
                series={series}
                containerWidth={containerWidth}
                isDarkMode={isDarkMode}
                onSelect={onSelectDrawing}
                onStartDragging={onStartDragging}
                onUpdateDrawing={onUpdateDrawing}
                onOpenProperties={onOpenProperties}
                onContextMenu={onContextMenu}
              />
            );
          }

          // Long Position
          if (drawing.type === 'LONG_POSITION') {
            const entryPoint = pixelCoords[0];

            if (!entryPoint) return null;

            return (
              <LongPositionRenderer
                key={drawing.id}
                drawing={drawing}
                isSelected={isSelected}
                entryPoint={entryPoint}
                rightPoint={pixelCoords[1] ?? null}
                series={series}
                isDarkMode={isDarkMode}
                onSelect={onSelectDrawing}
                onStartDragging={onStartDragging}
                onOpenProperties={onOpenProperties}
                onContextMenu={onContextMenu}
              />
            );
          }

          // Short Position
          if (drawing.type === 'SHORT_POSITION') {
            const entryPoint = pixelCoords[0];

            if (!entryPoint) return null;

            return (
              <ShortPositionRenderer
                key={drawing.id}
                drawing={drawing}
                isSelected={isSelected}
                entryPoint={entryPoint}
                rightPoint={pixelCoords[1] ?? null}
                series={series}
                isDarkMode={isDarkMode}
                onSelect={onSelectDrawing}
                onStartDragging={onStartDragging}
                onOpenProperties={onOpenProperties}
                onContextMenu={onContextMenu}
              />
            );
          }

          // Text / Label
          if (drawing.type === 'TEXT') {
            const point = pixelCoords[0];

            if (!point) return null;

            return (
              <g
                key={drawing.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectDrawing(drawing.id);
                  onContextMenu?.(e, drawing.id);
                }}
              >
                <TextRenderer
                  drawing={drawing}
                  point={point}
                  isSelected={isSelected}
                  isDarkMode={isDarkMode}
                  onSelect={onSelectDrawing}
                  onStartDragging={onStartDragging}
                />
              </g>
            );
          }

          // Tipe gambar tidak dikenali
          return null;
        })}
    </>
  );
};

export default DrawingRenderer;
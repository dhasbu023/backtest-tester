
import React from 'react';
import type { ISeriesApi } from 'lightweight-charts';

import type {
  DrawingObject,
} from '../../../../types/index.js';

interface PixelPoint {
  x: number;
  y: number;
}

type StartDraggingHandler = (
  event: React.MouseEvent,
  index: number,
  drawing: DrawingObject,
) => void;

interface FibonacciRendererProps {
  drawing: DrawingObject;
  isSelected: boolean;
  firstPoint: PixelPoint;
  secondPoint: PixelPoint;
  series: ISeriesApi<'Candlestick'> | null;
  containerWidth: number;
  isDarkMode: boolean;
  onSelect: (id: string | null) => void;
  onStartDragging: StartDraggingHandler;
  onUpdateDrawing: (drawing: DrawingObject) => void;
}

interface FibonacciLevel {
  ratio: number;
  color: string;
}

const DEFAULT_FIBONACCI_LEVELS: FibonacciLevel[] = [
  { ratio: 0, color: '#3b82f6' },
  { ratio: 0.236, color: '#f59e0b' },
  { ratio: 0.382, color: '#10b981' },
  { ratio: 0.5, color: '#3b82f6' },
  { ratio: 0.618, color: '#8b5cf6' },
  { ratio: 0.786, color: '#ec4899' },
  { ratio: 1, color: '#3b82f6' },
];

export const FibonacciRenderer: React.FC<FibonacciRendererProps> = ({
  drawing,
  isSelected,
  firstPoint,
  secondPoint,
  series,
  containerWidth,
  isDarkMode,
  onSelect,
  onStartDragging,
  onUpdateDrawing,
}) => {
  const startPrice = drawing.points[0]?.price;
  const endPrice = drawing.points[1]?.price;

  if (startPrice == null || endPrice == null) {
    return null;
  }

  const diff = endPrice - startPrice;

  const levels: FibonacciLevel[] =
    drawing.levels?.map((level) => ({
      ratio: level.ratio,
      color: level.color || drawing.color,
    })) ?? DEFAULT_FIBONACCI_LEVELS;

  const leftX = Math.min(firstPoint.x, secondPoint.x);

  const rightX = drawing.extendRight
    ? containerWidth - 10
    : Math.max(firstPoint.x, secondPoint.x);

  const topY = Math.min(firstPoint.y, secondPoint.y);

  return (
    <g
      onClick={(event) => {
        event.stopPropagation();
        onSelect(drawing.id);
      }}
      onMouseDown={(event) => {
        onStartDragging(event, -1, drawing);
      }}
      className="cursor-pointer"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Garis penghubung dua anchor Fibonacci */}
      <line
        x1={firstPoint.x}
        y1={firstPoint.y}
        x2={secondPoint.x}
        y2={secondPoint.y}
        stroke={drawing.color}
        strokeWidth={1}
        strokeDasharray="3 3"
        opacity={0.6}
        style={{ pointerEvents: 'none' }}
      />

      {/* Level-level Fibonacci */}
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
              style={{ pointerEvents: 'none' }}
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
              style={{ pointerEvents: 'none' }}
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

      {/* Kontrol memperpanjang Fibonacci ke kanan */}
      {isSelected && (
        <g
          className="cursor-pointer select-none"
          onMouseDown={(event) => {
            // Jangan sampai klik kontrol memulai drag seluruh drawing.
            event.stopPropagation();
          }}
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
            y={topY - 26}
            width={125}
            height={20}
            rx={4}
            fill={isDarkMode ? '#1e293b' : '#ffffff'}
            stroke={drawing.color}
            strokeWidth={1}
          />

          <text
            x={leftX + 62}
            y={topY - 12}
            textAnchor="middle"
            fill={drawing.color}
            fontSize={10}
            fontWeight="bold"
            style={{ pointerEvents: 'none' }}
          >
            {drawing.extendRight ? '➔ Kanan: ON' : '➔ Kanan: OFF'}
          </text>
        </g>
      )}

      {/* Anchor untuk mengubah titik awal dan akhir */}
      {isSelected && (
        <>
          <circle
            cx={firstPoint.x}
            cy={firstPoint.y}
            r={5}
            fill="#ffffff"
            stroke={drawing.color}
            strokeWidth={2}
            className="cursor-move"
            onMouseDown={(event) => {
              event.stopPropagation();
              onStartDragging(event, 0, drawing);
            }}
          />

          <circle
            cx={secondPoint.x}
            cy={secondPoint.y}
            r={5}
            fill="#ffffff"
            stroke={drawing.color}
            strokeWidth={2}
            className="cursor-move"
            onMouseDown={(event) => {
              event.stopPropagation();
              onStartDragging(event, 1, drawing);
            }}
          />
        </>
      )}
    </g>
  );
};

export default FibonacciRenderer;

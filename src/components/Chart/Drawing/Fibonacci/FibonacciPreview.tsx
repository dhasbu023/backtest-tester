import React from 'react';
import type { DrawingPoint } from '../../../../types/index.js';
import type { FibonacciLevel } from './fibonacci.defaults.js';
import { calculateFibonacciLevels } from './fibonacci.utils.js';

interface FibonacciPreviewProps {
  firstPoint: DrawingPoint;
  currentPoint: DrawingPoint;
  firstPixel: { x: number; y: number };
  currentPixel: { x: number; y: number };
  containerWidth: number;
  currentColor: string;
  series: {
    priceToCoordinate: (price: number) => number | null;
  } | null;
  levels: FibonacciLevel[];
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  strokeWidth?: number;
}

export const FibonacciPreview: React.FC<FibonacciPreviewProps> = ({
  firstPoint,
  currentPoint,
  firstPixel,
  currentPixel,
  containerWidth,
  currentColor,
  series,
  levels,
  lineStyle = 'dashed',
  strokeWidth = 1,
}) => {
  const activeLevels = levels.filter(
    (lvl) => lvl.enabled !== false && lvl.visible !== false,
  );

  const calculatedLevels = calculateFibonacciLevels(
    firstPoint,
    currentPoint,
    activeLevels,
  );

  const strokeDasharray =
    lineStyle === 'dashed'
      ? '4 4'
      : lineStyle === 'dotted'
      ? '2 2'
      : undefined;

  return (
    <g opacity={0.75} style={{ pointerEvents: 'none' }}>
      {/* Garis diagonal sementara */}
      <line
        x1={firstPixel.x}
        y1={firstPixel.y}
        x2={currentPixel.x}
        y2={currentPixel.y}
        stroke={currentColor}
        strokeWidth={1}
        strokeDasharray="3 3"
      />

      {calculatedLevels.map((level) => {
        const levelY = series?.priceToCoordinate(level.price);

        if (levelY == null || !Number.isFinite(levelY)) {
          return null;
        }

        const labelDisplay =
          level.label !== undefined && level.label.trim() !== ''
            ? level.label.trim()
            : level.ratio >= 0 && level.ratio <= 1
            ? `${(level.ratio * 100).toFixed(1)}%`
            : `${level.ratio}`;

        return (
          <g key={level.id || `preview-${level.ratio}`}>
            <line
              x1={Math.min(firstPixel.x, currentPixel.x)}
              y1={levelY}
              x2={containerWidth}
              y2={levelY}
              stroke={level.color || currentColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
            />

            <text
              x={containerWidth - 95}
              y={levelY - 3}
              fill={level.color || currentColor}
              fontSize={9}
              fontWeight="bold"
              fontFamily="monospace"
            >
              {labelDisplay} ({level.price.toFixed(2)})
            </text>
          </g>
        );
      })}
    </g>
  );
};

export default FibonacciPreview;

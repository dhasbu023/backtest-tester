
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
}) => {
  const calculatedLevels = calculateFibonacciLevels(
    firstPoint,
    currentPoint,
    levels,
  );

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

      {calculatedLevels.map((level) => {
        const levelY = series?.priceToCoordinate(level.price);

        if (levelY == null || !Number.isFinite(levelY)) {
          return null;
        }

        return (
          <g key={level.ratio}>
            <line
              x1={Math.min(firstPixel.x, currentPixel.x)}
              y1={levelY}
              x2={containerWidth}
              y2={levelY}
              stroke={level.color}
              strokeWidth={1}
              strokeDasharray="2 2"
            />

            <text
              x={containerWidth - 95}
              y={levelY - 3}
              fill={level.color}
              fontSize={9}
              fontFamily="monospace"
            >
              {(level.ratio * 100).toFixed(1)}% (
              {level.price.toFixed(2)})
            </text>
          </g>
        );
      })}
    </g>
  );
};

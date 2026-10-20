
import React from 'react';
import type { ISeriesApi } from 'lightweight-charts';

import type { DrawingObject } from '../../../../types/index.js';

interface PixelPoint {
  x: number;
  y: number;
}

type StartDraggingHandler = (
  event: React.MouseEvent,
  index: number,
  drawing: DrawingObject,
) => void;

interface ShortPositionRendererProps {
  drawing: DrawingObject;
  isSelected: boolean;
  entryPoint: PixelPoint;
  rightPoint: PixelPoint | null;
  series: ISeriesApi<'Candlestick'> | null;
  isDarkMode: boolean;
  onSelect: (id: string | null) => void;
  onStartDragging: StartDraggingHandler;
}

export const ShortPositionRenderer: React.FC<
  ShortPositionRendererProps
> = ({
  drawing,
  isSelected,
  entryPoint,
  rightPoint,
  series,
  isDarkMode,
  onSelect,
  onStartDragging,
}) => {
  const entryPrice =
    drawing.entryPrice ?? drawing.points[0]?.price ?? 0;

  const targetPrice =
    drawing.targetPrice ?? entryPrice * 0.985;

  const stopPrice =
    drawing.stopPrice ?? entryPrice * 1.0075;

  const targetY =
    series?.priceToCoordinate(targetPrice) ??
    entryPoint.y + 60;

  const stopY =
    series?.priceToCoordinate(stopPrice) ??
    entryPoint.y - 40;

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
    entryPrice !== 0
      ? ((entryPrice - targetPrice) / entryPrice) * 100
      : 0;

  const stopPct =
    entryPrice !== 0
      ? ((stopPrice - entryPrice) / entryPrice) * 100
      : 0;

  const pipMultiplier = entryPrice > 500 ? 10 : 10000;

  const targetPips =
    Math.abs(entryPrice - targetPrice) * pipMultiplier;

  const stopPips =
    Math.abs(stopPrice - entryPrice) * pipMultiplier;

  return (
    <g
      onClick={(event) => {
        event.stopPropagation();
        onSelect(drawing.id);
      }}
      className="group cursor-pointer"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Area risiko / stop-loss */}
      <rect
        x={startX}
        y={topLossY}
        width={width}
        height={lossHeight}
        fill="rgba(239, 68, 68, 0.22)"
        stroke="#ef4444"
        strokeWidth={1.5}
        onMouseDown={(event) =>
          onStartDragging(event, -1, drawing)
        }
      />

      {/* Area profit / take-profit */}
      <rect
        x={startX}
        y={topProfitY}
        width={width}
        height={profitHeight}
        fill="rgba(16, 185, 129, 0.22)"
        stroke="#10b981"
        strokeWidth={1.5}
        onMouseDown={(event) =>
          onStartDragging(event, -1, drawing)
        }
      />

      {/* Garis entry */}
      <line
        x1={startX}
        y1={entryPoint.y}
        x2={endX}
        y2={entryPoint.y}
        stroke="#3b82f6"
        strokeWidth={2}
      />

      {/* Label stop-loss */}
      <text
        x={startX + 6}
        y={topLossY + 14}
        fill="#ef4444"
        fontSize={10}
        fontWeight="bold"
        fontFamily="sans-serif"
        style={{ pointerEvents: 'none' }}
      >
        {`Stop: ${stopPrice.toFixed(2)} (-${stopPips.toFixed(1)} pips / -${stopPct.toFixed(2)}%)`}
      </text>

      {/* Label take-profit */}
      <text
        x={startX + 6}
        y={topProfitY + profitHeight - 6}
        fill="#10b981"
        fontSize={10}
        fontWeight="bold"
        fontFamily="sans-serif"
        style={{ pointerEvents: 'none' }}
      >
        {`Target: ${targetPrice.toFixed(2)} (+${targetPips.toFixed(1)} pips / +${targetPct.toFixed(2)}%)`}
      </text>

      {/* Label risk-reward */}
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
        {`R:R 1 : ${riskReward.toFixed(2)}`}
      </text>

      {/* Handle hanya muncul saat posisi dipilih */}
      {isSelected && (
        <>
          {/* Handle target */}
          <circle
            cx={startX + width / 2}
            cy={targetY}
            r={5}
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth={2}
            className="cursor-ns-resize"
            onMouseDown={(event) =>
              onStartDragging(event, 101, drawing)
            }
          />

          {/* Handle stop-loss */}
          <circle
            cx={startX + width / 2}
            cy={stopY}
            r={5}
            fill="#ef4444"
            stroke="#ffffff"
            strokeWidth={2}
            className="cursor-ns-resize"
            onMouseDown={(event) =>
              onStartDragging(event, 102, drawing)
            }
          />

          {/* Handle lebar posisi */}
          <circle
            cx={endX}
            cy={entryPoint.y}
            r={5}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={2}
            className="cursor-ew-resize"
            onMouseDown={(event) =>
              onStartDragging(event, 103, drawing)
            }
          />
        </>
      )}
    </g>
  );
};

export default ShortPositionRenderer;

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
  onSelectDrawing: (id: string | null) => void;
  onStartDragging: StartDraggingHandler;
  onUpdateDrawing: (drawing: DrawingObject) => void;
  onOpenHorizontalLineProperties: (id: string) => void;
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
  onSelectDrawing,
  onStartDragging,
  onUpdateDrawing,
  onOpenHorizontalLineProperties,
}) => {
  return (
    <>
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
                onStartDragging={onStartDragging}
                onOpenProperties={onOpenHorizontalLineProperties}
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
              <TrendLineRenderer
                key={drawing.id}
                drawing={drawing}
                isSelected={isSelected}
                firstPoint={firstPoint}
                secondPoint={secondPoint}
                onSelect={onSelectDrawing}
                onStartDragging={onStartDragging}
              />
            );
          }

          // Rectangle
          if (drawing.type === 'RECTANGLE') {
            const [firstPoint, secondPoint] = pixelCoords;

            if (!firstPoint || !secondPoint) return null;

            return (
              <RectangleRenderer
                key={drawing.id}
                drawing={drawing}
                firstPoint={firstPoint}
                secondPoint={secondPoint}
                isSelected={isSelected}
                onSelect={onSelectDrawing}
                onStartDragging={onStartDragging}
              />
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
                  onStartDragging(event, -1, drawing)
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
                        onStartDragging(event, 0, drawing)
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
                        onStartDragging(event, 1, drawing)
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
                  onStartDragging(event, -1, drawing)
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

            const targetPrice =
              drawing.targetPrice ?? entryPrice * 1.015;

            const stopPrice =
              drawing.stopPrice ?? entryPrice * 0.9925;

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
                    onStartDragging(event, -1, drawing)
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
                    onStartDragging(event, -1, drawing)
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
                  {targetPips.toFixed(1)} pips / +
                  {targetPct.toFixed(2)}%)
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
                  {stopPips.toFixed(1)} pips / -
                  {stopPct.toFixed(2)}%)
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
                        onStartDragging(event, 101, drawing)
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
                        onStartDragging(event, 102, drawing)
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
                        onStartDragging(event, 103, drawing)
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
                    onStartDragging(event, -1, drawing)
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
                    onStartDragging(event, -1, drawing)
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
                  {stopPips.toFixed(1)} pips / -
                  {stopPct.toFixed(2)}%)
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
                  {targetPips.toFixed(1)} pips / +
                  {targetPct.toFixed(2)}%)
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
                        onStartDragging(event, 101, drawing)
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
                        onStartDragging(event, 102, drawing)
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
                        onStartDragging(event, 103, drawing)
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
              <TextRenderer
                key={drawing.id}
                drawing={drawing}
                point={point}
                isSelected={isSelected}
                isDarkMode={isDarkMode}
                onSelect={onSelectDrawing}
                onStartDragging={onStartDragging}
              />
            );
          }

          // Tipe gambar tidak dikenali
          return null;
        })}
    </>
  );
};

export default DrawingRenderer;
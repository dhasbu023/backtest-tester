import React from 'react';
import type { ISeriesApi } from 'lightweight-charts';

import type { DrawingObject } from '../../../../types/index.js';
import {
  DEFAULT_FIBONACCI_LEVELS,
} from './fibonacci.defaults.js';

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
  onOpenProperties?: (id: string) => void;
  onContextMenu?: (event: React.MouseEvent, id: string) => void;
}

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
  onUpdateDrawing: _onUpdateDrawing,
  onOpenProperties,
  onContextMenu,
}) => {
  // In TradingView style, first anchor is 100% (level 1) and second is 0% (level 0)
  const startPrice = drawing.points[1]?.price;
  const endPrice = drawing.points[0]?.price;

  if (startPrice == null || endPrice == null) {
    return null;
  }

  const diff = endPrice - startPrice;

  // Gunakan level tersimpan atau fallback ke default
  const rawLevels =
    drawing.levels && drawing.levels.length > 0
      ? drawing.levels
      : DEFAULT_FIBONACCI_LEVELS;

  const activeLevels = rawLevels.filter(
    (level) => level.enabled !== false && level.visible !== false,
  );

  const sortedLevels = [...activeLevels].sort((a, b) => a.ratio - b.ratio);

  const leftX = drawing.extendLeft
    ? 0
    : Math.min(firstPoint.x, secondPoint.x);

  const rightX = drawing.extendRight
    ? containerWidth
    : Math.max(firstPoint.x, secondPoint.x);

  const strokeDasharray =
    drawing.lineStyle === 'dashed'
      ? '4 4'
      : drawing.lineStyle === 'dotted'
      ? '2 2'
      : undefined;

  const strokeWidth = drawing.strokeWidth || 1;
  const showRatio = drawing.showRatio ?? true;
  const showPrice = drawing.showPrice ?? true;
  const showBackground = drawing.showBackground ?? true;
  const showLabels = drawing.showLabels ?? true;

  const pricePrecision = Math.abs(startPrice) > 500 ? 2 : 4;

  return (
    <g
      onClick={(event) => {
        event.stopPropagation();
        onSelect(drawing.id);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onSelect(drawing.id);
        onOpenProperties?.(drawing.id);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelect(drawing.id);
        onContextMenu?.(event, drawing.id);
      }}
      onMouseDown={(event) => {
        if (event.button !== 0) return; // Drag hanya untuk tombol klik kiri
        onStartDragging(event, -1, drawing);
      }}
      className={isSelected ? 'cursor-move' : 'cursor-pointer'}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Background bands antara level-level berdekatan */}
      {showBackground &&
        sortedLevels.map((lvl, i) => {
          if (i === sortedLevels.length - 1) return null;
          const nextLvl = sortedLevels[i + 1];
          const y1 = series?.priceToCoordinate(startPrice + diff * lvl.ratio);
          const y2 = series?.priceToCoordinate(startPrice + diff * nextLvl.ratio);
          if (y1 == null || y2 == null || !Number.isFinite(y1) || !Number.isFinite(y2)) {
            return null;
          }
          return (
            <rect
              key={`band-${lvl.ratio}-${nextLvl.ratio}`}
              x={leftX}
              y={Math.min(y1, y2)}
              width={Math.max(1, rightX - leftX)}
              height={Math.max(1, Math.abs(y2 - y1))}
              fill={lvl.color || drawing.color}
              fillOpacity={0.08}
              style={{ pointerEvents: 'all' }}
            />
          );
        })}

      {/* Hit test area transparan untuk garis diagonal penghubung kedua anchor */}
      <line
        x1={firstPoint.x}
        y1={firstPoint.y}
        x2={secondPoint.x}
        y2={secondPoint.y}
        stroke="transparent"
        strokeWidth={16}
        style={{ pointerEvents: 'stroke' }}
      />

      {/* Garis penghubung diagonal kedua anchor Fibonacci visual */}
      <line
        x1={firstPoint.x}
        y1={firstPoint.y}
        x2={secondPoint.x}
        y2={secondPoint.y}
        stroke={drawing.color}
        strokeWidth={isSelected ? 1.5 : 1}
        strokeDasharray="4 4"
        opacity={isSelected ? 0.85 : 0.45}
        style={{ pointerEvents: 'none' }}
      />

      {/* Level-level Fibonacci */}
      {activeLevels.map((level, idx) => {
        const levelPrice = startPrice + diff * level.ratio;
        const levelY = series?.priceToCoordinate(levelPrice);

        if (levelY == null || !Number.isFinite(levelY)) {
          return null;
        }

        const levelColor = level.color || drawing.color;

        // Label teks: rasio kustom / persentase dan/atau harga
        const labelParts: string[] = [];
        if (showRatio) {
          const ratioDisplay =
            level.label !== undefined && level.label.trim() !== ''
              ? level.label.trim()
              : level.ratio >= 0 && level.ratio <= 1
              ? `${(level.ratio * 100).toFixed(1)}%`
              : `${level.ratio}`;
          labelParts.push(ratioDisplay);
        }
        if (showPrice) {
          labelParts.push(`(${levelPrice.toFixed(pricePrecision)})`);
        }
        const labelText = labelParts.join(' ');
        const labelWidth = Math.max(50, labelText.length * 6.5 + 14);

        return (
          <g key={level.id || `fibo-level-${idx}-${level.ratio}`}>
            {/* Area hit testing transparan yang lebar agar mudah diklik */}
            <line
              x1={leftX}
              y1={levelY}
              x2={rightX}
              y2={levelY}
              stroke="transparent"
              strokeWidth={16}
              style={{ pointerEvents: 'stroke' }}
            />

            {/* Garis level visual */}
            <line
              x1={leftX}
              y1={levelY}
              x2={rightX}
              y2={levelY}
              stroke={levelColor}
              strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
              strokeDasharray={strokeDasharray}
              opacity={0.9}
              style={{ pointerEvents: 'none' }}
            />

            {/* Label level */}
            {showLabels && labelText.length > 0 && (
              <g style={{ pointerEvents: 'none' }}>
                  {showBackground && (
                    <rect
                      x={
                        level.labelPosition === 'left'
                          ? leftX + 8
                          : level.labelPosition === 'center'
                          ? (leftX + rightX) / 2 - labelWidth / 2
                          : rightX - labelWidth - 8
                      }
                      y={levelY - 9}
                      width={labelWidth}
                      height={18}
                      rx={4}
                      fill={isDarkMode ? '#0f172a' : '#ffffff'}
                      stroke={levelColor}
                      strokeWidth={1}
                      opacity={0.94}
                    />
                  )}

                  <text
                    x={
                      level.labelPosition === 'left'
                        ? leftX + 8 + labelWidth / 2
                        : level.labelPosition === 'center'
                        ? (leftX + rightX) / 2
                        : rightX - 8 - labelWidth / 2
                    }
                    y={levelY + 3.5}
                    textAnchor="middle"
                    fill={levelColor}
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                  {labelText}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Anchor handles untuk mengubah titik pertama dan kedua secara terpisah */}
      {isSelected && (
        <g>
          {/* Titik Anchor Pertama */}
          <circle
            cx={firstPoint.x}
            cy={firstPoint.y}
            r={14}
            fill="transparent"
            className="cursor-crosshair"
            style={{ pointerEvents: 'all' }}
            onMouseDown={(event) => {
              if (event.button !== 0) return;
              event.stopPropagation();
              onStartDragging(event, 0, drawing);
            }}
          />
          <circle
            cx={firstPoint.x}
            cy={firstPoint.y}
            r={6}
            fill="#ffffff"
            stroke={drawing.color}
            strokeWidth={2}
            className="cursor-crosshair pointer-events-none drop-shadow-sm"
          />

          {/* Titik Anchor Kedua */}
          <circle
            cx={secondPoint.x}
            cy={secondPoint.y}
            r={14}
            fill="transparent"
            className="cursor-crosshair"
            style={{ pointerEvents: 'all' }}
            onMouseDown={(event) => {
              if (event.button !== 0) return;
              event.stopPropagation();
              onStartDragging(event, 1, drawing);
            }}
          />
          <circle
            cx={secondPoint.x}
            cy={secondPoint.y}
            r={6}
            fill="#ffffff"
            stroke={drawing.color}
            strokeWidth={2}
            className="cursor-crosshair pointer-events-none drop-shadow-sm"
          />
        </g>
      )}
    </g>
  );
};

export default FibonacciRenderer;

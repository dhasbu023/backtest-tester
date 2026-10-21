
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
  onOpenProperties?: (id: string) => void;
  onContextMenu?: (
    event: React.MouseEvent,
    id: string,
  ) => void;
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
  onOpenProperties,
  onContextMenu,
}) => {
  // Entry, target, dan stop-loss
  const entryPrice =
    drawing.entryPrice ?? drawing.points[0]?.price ?? 0;

  const targetPrice =
    drawing.targetPrice ?? entryPrice * 0.985;

  const stopPrice =
    drawing.stopPrice ?? entryPrice * 1.0075;

  // Konversi harga menjadi koordinat chart
  const targetY =
    series?.priceToCoordinate(targetPrice) ??
    entryPoint.y + 60;

  const stopY =
    series?.priceToCoordinate(stopPrice) ??
    entryPoint.y - 40;

  // Rentang horizontal posisi
  const startX = entryPoint.x;

  const endX = rightPoint
    ? Math.max(startX + 50, rightPoint.x)
    : startX + 140;

  const width = Math.max(50, endX - startX);

  // Tinggi area profit dan risiko
  const profitHeight = Math.abs(targetY - entryPoint.y);
  const lossHeight = Math.abs(stopY - entryPoint.y);

  const topProfitY = Math.min(entryPoint.y, targetY);
  const topLossY = Math.min(entryPoint.y, stopY);

  // Perhitungan risk/reward untuk posisi SELL
  const riskDistance = stopPrice - entryPrice;
  const rewardDistance = entryPrice - targetPrice;

  const isRiskValid =
    riskDistance > 0 && rewardDistance > 0;

  const riskReward = isRiskValid
    ? rewardDistance / riskDistance
    : 0;

  const targetPct =
    entryPrice !== 0
      ? (rewardDistance / entryPrice) * 100
      : 0;

  const stopPct =
    entryPrice !== 0
      ? (riskDistance / entryPrice) * 100
      : 0;

  // Perkiraan pips berdasarkan jenis instrumen.
  // XAUUSD dengan konvensi 1 pip = 0.1:
  // pengali 10. Forex 5 digit: pengali 10000.
  const pipMultiplier = entryPrice > 500 ? 10 : 10000;

  const targetPips =
    Math.abs(rewardDistance) * pipMultiplier;

  const stopPips =
    Math.abs(riskDistance) * pipMultiplier;

  // Properti visual
  const profitColor = drawing.profitColor || '#10b981';
  const lossColor = drawing.lossColor || '#ef4444';
  const entryColor = drawing.color || '#3b82f6';

  const fillOpacity = drawing.opacity ?? 0.22;
  const showLabels = drawing.showLabels ?? true;
  const showPrice = drawing.showPrice ?? true;
  const showStats = drawing.showStats ?? true;

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
      className="group cursor-pointer"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Area risiko / stop-loss di atas entry */}
      <rect
        x={startX}
        y={topLossY}
        width={width}
        height={lossHeight}
        fill={lossColor}
        fillOpacity={fillOpacity}
        stroke={lossColor}
        strokeWidth={isSelected ? 2 : 1.5}
        onMouseDown={(event) =>
          onStartDragging(event, -1, drawing)
        }
      />

      {/* Area profit / take-profit di bawah entry */}
      <rect
        x={startX}
        y={topProfitY}
        width={width}
        height={profitHeight}
        fill={profitColor}
        fillOpacity={fillOpacity}
        stroke={profitColor}
        strokeWidth={isSelected ? 2 : 1.5}
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
        stroke={entryColor}
        strokeWidth={2}
        style={{ pointerEvents: 'none' }}
      />

      {/* Label stop-loss */}
      {showLabels && (
        <text
          x={startX + 6}
          y={topLossY + 14}
          fill={lossColor}
          fontSize={10}
          fontWeight="bold"
          fontFamily="sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {`Stop: ${
            showPrice ? stopPrice.toFixed(2) : ''
          } (-${stopPips.toFixed(1)} pips / -${stopPct.toFixed(2)}%)`}
        </text>
      )}

      {/* Label take-profit */}
      {showLabels && (
        <text
          x={startX + 6}
          y={topProfitY + profitHeight - 6}
          fill={profitColor}
          fontSize={10}
          fontWeight="bold"
          fontFamily="sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {`Target: ${
            showPrice ? targetPrice.toFixed(2) : ''
          } (+${targetPips.toFixed(1)} pips / +${targetPct.toFixed(2)}%)`}
        </text>
      )}

      {/* Label risk/reward */}
      {showStats && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={startX + width / 2 - 45}
            y={entryPoint.y - 11}
            width={90}
            height={22}
            rx={4}
            fill={isDarkMode ? '#0f172a' : '#ffffff'}
            stroke={entryColor}
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
          >
            {`R:R 1 : ${riskReward.toFixed(2)}`}
          </text>
        </g>
      )}

      {/* Handle hanya muncul saat posisi dipilih */}
      {isSelected && (
        <>
          {/* Handle target */}
          <circle
            cx={startX + width / 2}
            cy={targetY}
            r={6}
            fill={profitColor}
            stroke="#ffffff"
            strokeWidth={2}
            className="cursor-ns-resize"
            title="Ubah Target"
            onMouseDown={(event) =>
              onStartDragging(event, 101, drawing)
            }
          />

          {/* Handle stop-loss */}
          <circle
            cx={startX + width / 2}
            cy={stopY}
            r={6}
            fill={lossColor}
            stroke="#ffffff"
            strokeWidth={2}
            className="cursor-ns-resize"
            title="Ubah Stop Loss"
            onMouseDown={(event) =>
              onStartDragging(event, 102, drawing)
            }
          />

          {/* Handle entry */}
          <circle
            cx={startX}
            cy={entryPoint.y}
            r={6}
            fill={entryColor}
            stroke="#ffffff"
            strokeWidth={2}
            className="cursor-ns-resize"
            title="Ubah Entry Price"
            onMouseDown={(event) =>
              onStartDragging(event, 100, drawing)
            }
          />

          {/* Handle lebar posisi kanan */}
          <circle
            cx={endX}
            cy={entryPoint.y}
            r={6}
            fill={entryColor}
            stroke="#ffffff"
            strokeWidth={2}
            className="cursor-ew-resize"
            title="Ubah Rentang Waktu"
            onMouseDown={(event) =>
              onStartDragging(event, 103, drawing)
            }
          />

          {/* Handle waktu kiri */}
          <circle
            cx={startX}
            cy={topLossY}
            r={5}
            fill="#ffffff"
            stroke={entryColor}
            strokeWidth={2}
            className="cursor-ew-resize"
            title="Ubah Waktu Awal"
            onMouseDown={(event) =>
              onStartDragging(event, 104, drawing)
            }
          />
        </>
      )}
    </g>
  );
};

export default ShortPositionRenderer;

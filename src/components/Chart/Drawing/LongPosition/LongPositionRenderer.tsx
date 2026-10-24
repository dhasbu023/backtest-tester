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

interface LongPositionRendererProps {
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

export const LongPositionRenderer: React.FC<
  LongPositionRendererProps
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
  // --- Ambil harga dari cached field atau fallback ke live points ---
  const entryPrice =
    drawing.entryPrice ?? drawing.points[0]?.price ?? 0;

  const targetPrice =
    drawing.targetPrice ?? drawing.points[1]?.price ?? entryPrice * 1.015;

  const stopPrice =
    drawing.stopPrice ?? drawing.points[2]?.price ?? entryPrice * 0.9925;

  // Konversi harga ke koordinat vertikal chart
  const targetY =
    series?.priceToCoordinate(targetPrice) ??
    entryPoint.y - 60;

  const stopY =
    series?.priceToCoordinate(stopPrice) ??
    entryPoint.y + 40;

  // Rentang horizontal posisi berbasis koordinat aktual
  const x1 = entryPoint.x;
  const x2 = rightPoint ? rightPoint.x : x1 + 80;
  const leftX = Math.min(x1, x2);
  const rightX = Math.max(x1, x2);
  const width = Math.max(6, rightX - leftX);
  const centerX = leftX + width / 2;

  // Tinggi area profit dan risiko
  const profitHeight = Math.max(1, Math.abs(entryPoint.y - targetY));
  const lossHeight = Math.max(1, Math.abs(stopY - entryPoint.y));

  // Untuk Long: target di atas entry, stop di bawah entry
  const topProfitY = Math.min(entryPoint.y, targetY);
  const topLossY = Math.min(entryPoint.y, stopY);
  const bottomLossY = topLossY + lossHeight;

  // Perhitungan risk/reward untuk posisi BUY (Long)
  const riskDistance = Math.abs(entryPrice - stopPrice);
  const rewardDistance = Math.abs(targetPrice - entryPrice);

  const isRiskValid = riskDistance > 0.000001;

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

  // Perkiraan pip berdasarkan instrumen
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

  // Format helpers – aman terhadap NaN dan Infinity
  const formatPips = (v: number) =>
    Number.isFinite(v) ? v.toFixed(1) : '0.0';
  const formatPct = (v: number) =>
    Number.isFinite(v) ? v.toFixed(2) : '0.00';
  const formatRR = (v: number) =>
    Number.isFinite(v) && v >= 0 ? v.toFixed(2) : '0.00';
  const formatPrice = (v: number) =>
    Number.isFinite(v) ? v.toFixed(2) : '0.00';

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
      {/* Area profit / take-profit (di atas entry untuk Long) */}
      <rect
        x={leftX}
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

      {/* Area risiko / stop-loss (di bawah entry untuk Long) */}
      <rect
        x={leftX}
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

      {/* Garis entry */}
      <line
        x1={leftX}
        y1={entryPoint.y}
        x2={rightX}
        y2={entryPoint.y}
        stroke={entryColor}
        strokeWidth={2}
        style={{ pointerEvents: 'none' }}
      />

      {/* Label target profit */}
      {showLabels && (
        <text
          x={leftX + 6}
          y={topProfitY + 14}
          fill={profitColor}
          fontSize={10}
          fontWeight="bold"
          fontFamily="sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {`Target: ${
            showPrice ? formatPrice(targetPrice) : ''
          } (+${formatPips(targetPips)} pips / +${formatPct(targetPct)}%)`}
        </text>
      )}

      {/* Label stop-loss */}
      {showLabels && (
        <text
          x={leftX + 6}
          y={bottomLossY - 6}
          fill={lossColor}
          fontSize={10}
          fontWeight="bold"
          fontFamily="sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {`Stop: ${
            showPrice ? formatPrice(stopPrice) : ''
          } (-${formatPips(stopPips)} pips / -${formatPct(stopPct)}%)`}
        </text>
      )}

      {/* Informasi posisi & RR di tengah blok */}
      {showStats && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={centerX - 56}
            y={entryPoint.y - 18}
            width={112}
            height={36}
            rx={6}
            fill={isDarkMode ? 'rgba(15, 23, 42, 0.90)' : 'rgba(255, 255, 255, 0.94)'}
            stroke={entryColor}
            strokeWidth={1.5}
          />
          <text
            x={centerX}
            y={entryPoint.y - 4}
            textAnchor="middle"
            fill={isDarkMode ? '#38bdf8' : '#0284c7'}
            fontSize={10}
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            Long Position
          </text>
          <text
            x={centerX}
            y={entryPoint.y + 11}
            textAnchor="middle"
            fill={isDarkMode ? '#f8fafc' : '#0f172a'}
            fontSize={11}
            fontWeight="bold"
            fontFamily="monospace"
          >
            {`RR 1 : ${formatRR(riskReward)}`}
          </text>
        </g>
      )}

      {/* Handle hanya muncul ketika posisi dipilih */}
      {isSelected && (
        <>
          {/* ================= 4 HANDLE SUDUT UTAMA ================= */}
          {/* 1. Kiri Atas: Waktu Kiri & Level Atas (Target) */}
          <circle
            cx={leftX}
            cy={topProfitY}
            r={6.5}
            fill="#ffffff"
            stroke={profitColor}
            strokeWidth={2.5}
            className="cursor-nwse-resize"
            onMouseDown={(event) =>
              onStartDragging(event, 105, drawing)
            }
          >
            <title>Kiri Atas: Waktu Kiri & Target</title>
          </circle>

          {/* 2. Kanan Atas: Waktu Kanan & Level Atas (Target) */}
          <circle
            cx={rightX}
            cy={topProfitY}
            r={6.5}
            fill="#ffffff"
            stroke={profitColor}
            strokeWidth={2.5}
            className="cursor-nesw-resize"
            onMouseDown={(event) =>
              onStartDragging(event, 106, drawing)
            }
          >
            <title>Kanan Atas: Waktu Kanan & Target</title>
          </circle>

          {/* 3. Kiri Bawah: Waktu Kiri & Level Bawah (Stop Loss) */}
          <circle
            cx={leftX}
            cy={bottomLossY}
            r={6.5}
            fill="#ffffff"
            stroke={lossColor}
            strokeWidth={2.5}
            className="cursor-nesw-resize"
            onMouseDown={(event) =>
              onStartDragging(event, 107, drawing)
            }
          >
            <title>Kiri Bawah: Waktu Kiri & Stop Loss</title>
          </circle>

          {/* 4. Kanan Bawah: Waktu Kanan & Level Bawah (Stop Loss) */}
          <circle
            cx={rightX}
            cy={bottomLossY}
            r={6.5}
            fill="#ffffff"
            stroke={lossColor}
            strokeWidth={2.5}
            className="cursor-nwse-resize"
            onMouseDown={(event) =>
              onStartDragging(event, 108, drawing)
            }
          >
            <title>Kanan Bawah: Waktu Kanan & Stop Loss</title>
          </circle>

          {/* ================= HANDLE SISI / EDGE HANDLES ================= */}
          {/* Handle Target Atas Tengah */}
          <circle
            cx={centerX}
            cy={topProfitY}
            r={5.5}
            fill={profitColor}
            stroke="#ffffff"
            strokeWidth={2}
            className="cursor-ns-resize"
            onMouseDown={(event) =>
              onStartDragging(event, 101, drawing)
            }
          >
            <title>Ubah Target Price</title>
          </circle>

          {/* Handle Stop Loss Bawah Tengah */}
          <circle
            cx={centerX}
            cy={bottomLossY}
            r={5.5}
            fill={lossColor}
            stroke="#ffffff"
            strokeWidth={2}
            className="cursor-ns-resize"
            onMouseDown={(event) =>
              onStartDragging(event, 102, drawing)
            }
          >
            <title>Ubah Stop Loss Price</title>
          </circle>

          {/* Handle Entry Tengah */}
          <circle
            cx={centerX}
            cy={entryPoint.y}
            r={5.5}
            fill={entryColor}
            stroke="#ffffff"
            strokeWidth={2}
            className="cursor-ns-resize"
            onMouseDown={(event) =>
              onStartDragging(event, 100, drawing)
            }
          >
            <title>Ubah Entry Price</title>
          </circle>

          {/* Handle Batas Waktu Kanan Tengah */}
          <circle
            cx={rightX}
            cy={entryPoint.y}
            r={5.5}
            fill={entryColor}
            stroke="#ffffff"
            strokeWidth={2}
            className="cursor-ew-resize"
            onMouseDown={(event) =>
              onStartDragging(event, 103, drawing)
            }
          >
            <title>Ubah Batas Waktu Kanan</title>
          </circle>

          {/* Handle Batas Waktu Kiri Tengah */}
          <circle
            cx={leftX}
            cy={entryPoint.y}
            r={5.5}
            fill="#ffffff"
            stroke={entryColor}
            strokeWidth={2}
            className="cursor-ew-resize"
            onMouseDown={(event) =>
              onStartDragging(event, 104, drawing)
            }
          >
            <title>Ubah Batas Waktu Kiri</title>
          </circle>
        </>
      )}
    </g>
  );
};

export default LongPositionRenderer;

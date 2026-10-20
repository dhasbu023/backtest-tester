
import React from 'react';
import type { DrawingObject } from '../../../../types/index.js';
import {
  HORIZONTAL_LINE_DEFAULTS,
  HORIZONTAL_LINE_STYLES,
  type HorizontalLineStyle,
} from './horizontalLine.defaults.js';

interface HorizontalLineRendererProps {
  drawing: DrawingObject;
  isSelected: boolean;
  y: number;
  containerWidth: number;
  onSelect: (id: string) => void;
  onOpenProperties: (id: string) => void;
  onStartDragging: (
    event: React.MouseEvent<SVGGElement>,
    index: number,
    drawing: DrawingObject,
  ) => void;
}

export const HorizontalLineRenderer: React.FC<
  HorizontalLineRendererProps
> = ({
  drawing,
  isSelected,
  y,
  containerWidth,
  onSelect,
  onOpenProperties,
  onStartDragging,
}) => {
  const price = drawing.points[0]?.price;

  if (!Number.isFinite(y) || !Number.isFinite(price)) {
    return null;
  }

  const color = drawing.color || HORIZONTAL_LINE_DEFAULTS.color;

  const strokeWidth =
    drawing.strokeWidth || HORIZONTAL_LINE_DEFAULTS.strokeWidth;

  // Gunakan solid sebagai style default.
  const style = (
    drawing as DrawingObject & {
      lineStyle?: HorizontalLineStyle;
    }
  ).lineStyle ?? 'solid';

  const strokeDasharray = HORIZONTAL_LINE_STYLES[style];

  const labelWidth = 60;
  const labelHeight = 18;
  const labelX = Math.max(0, containerWidth - 65);
  const labelY = y - labelHeight / 2;

  return (
    <g
      key={drawing.id}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(drawing.id);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onSelect(drawing.id);
        onOpenProperties(drawing.id);
      }}
      onMouseDown={(event) => {
        onStartDragging(event, -1, drawing);
      }}
      className="cursor-move"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Garis horizontal */}
      <line
        x1={0}
        y1={y}
        x2={containerWidth}
        y2={y}
        stroke={color}
        strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
        strokeDasharray={strokeDasharray || undefined}
        className={isSelected ? 'drop-shadow-sm' : undefined}
      />

      {/* Label harga di sisi kanan chart */}
      <rect
        x={labelX}
        y={labelY}
        width={labelWidth}
        height={labelHeight}
        rx={4}
        fill={color}
      />

      <text
        x={labelX + labelWidth / 2}
        y={y + 3.5}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={10}
        fontWeight="bold"
        fontFamily="monospace"
        style={{ pointerEvents: 'none' }}
      >
        {price.toFixed(2)}
      </text>
    </g>
  );
};

export default HorizontalLineRenderer;

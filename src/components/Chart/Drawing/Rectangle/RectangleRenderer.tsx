
import React from 'react';
import type { DrawingObject } from '../../../../types/index.js';

export interface RectanglePixelPoint {
  x: number;
  y: number;
}

interface RectangleRendererProps {
  drawing: DrawingObject;
  firstPoint: RectanglePixelPoint;
  secondPoint: RectanglePixelPoint;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  onStartDragging: (
    event: React.MouseEvent<SVGElement>,
    index: number,
    drawing: DrawingObject,
  ) => void;
}

export const RectangleRenderer: React.FC<RectangleRendererProps> = ({
  drawing,
  firstPoint,
  secondPoint,
  isSelected,
  onSelect,
  onStartDragging,
}) => {
  const minX = Math.min(firstPoint.x, secondPoint.x);
  const minY = Math.min(firstPoint.y, secondPoint.y);
  const width = Math.abs(firstPoint.x - secondPoint.x);
  const height = Math.abs(firstPoint.y - secondPoint.y);

  return (
    <g
      onClick={(event) => {
        event.stopPropagation();
        onSelect(drawing.id);
      }}
      className="cursor-pointer"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Area rectangle: drag untuk memindahkan seluruh objek */}
      <rect
        x={minX}
        y={minY}
        width={width}
        height={height}
        fill={drawing.fillColor || drawing.color}
        fillOpacity={drawing.opacity ?? 0.18}
        stroke={drawing.color}
        strokeWidth={drawing.strokeWidth}
        onMouseDown={(event) =>
          onStartDragging(event, -1, drawing)
        }
      />

      {/* Handle hanya muncul saat rectangle dipilih */}
      {isSelected && (
        <>
          <circle
            cx={firstPoint.x}
            cy={firstPoint.y}
            r={4.5}
            fill="#ffffff"
            stroke={drawing.color}
            strokeWidth={2}
            style={{ cursor: 'crosshair' }}
            onMouseDown={(event) => {
              event.stopPropagation();
              onStartDragging(event, 0, drawing);
            }}
          />

          <circle
            cx={secondPoint.x}
            cy={secondPoint.y}
            r={4.5}
            fill="#ffffff"
            stroke={drawing.color}
            strokeWidth={2}
            style={{ cursor: 'crosshair' }}
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

export default RectangleRenderer;

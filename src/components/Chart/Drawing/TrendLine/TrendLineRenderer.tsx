import React from 'react';
import type { DrawingObject } from '../../../../types/index.js';

interface TrendLineRendererProps {
  drawing: DrawingObject;
  isSelected: boolean;
  firstPoint: { x: number; y: number };
  secondPoint: { x: number; y: number };
  onSelect: (id: string | null) => void;
  onStartDragging: (
    event: React.MouseEvent,
    index: number,
    drawing: DrawingObject,
  ) => void;
}

export const TrendLineRenderer: React.FC<TrendLineRendererProps> = ({
  drawing,
  isSelected,
  firstPoint,
  secondPoint,
  onSelect,
  onStartDragging,
}) => {
  return (
    <g
      onClick={(event) => {
        event.stopPropagation();
        onSelect(drawing.id);
      }}
      className="cursor-pointer"
      style={{ pointerEvents: 'auto' }}
    >
      <line
        x1={firstPoint.x}
        y1={firstPoint.y}
        x2={secondPoint.x}
        y2={secondPoint.y}
        stroke={drawing.color}
        strokeWidth={drawing.strokeWidth}
        className="transition-colors hover:stroke-blue-400"
        onMouseDown={(event) => {
          onStartDragging(event, -1, drawing);
        }}
      />

      {isSelected && (
        <>
          <circle
            cx={firstPoint.x}
            cy={firstPoint.y}
            r={5}
            fill="#ffffff"
            stroke={drawing.color}
            strokeWidth={2}
            onMouseDown={(event) => {
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
            onMouseDown={(event) => {
              onStartDragging(event, 1, drawing);
            }}
          />
        </>
      )}
    </g>
  );
};

export default TrendLineRenderer;
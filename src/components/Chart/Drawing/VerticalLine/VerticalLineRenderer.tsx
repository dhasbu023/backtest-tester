import React from 'react';
import type { DrawingObject } from '../../../../types/index.js';
import { formatDateTimeWithTz } from '../../../../utils/timezone.js';

interface VerticalLineRendererProps {
  drawing: DrawingObject;
  isSelected: boolean;
  x: number;
  containerHeight: number;
  activeTimezone: string;
  onSelect: (id: string | null) => void;
  onStartDragging: (
    event: React.MouseEvent,
    index: number,
    drawing: DrawingObject,
  ) => void;
}

export const VerticalLineRenderer: React.FC<VerticalLineRendererProps> = ({
  drawing,
  isSelected,
  x,
  containerHeight,
  activeTimezone,
  onSelect,
  onStartDragging,
}) => {
  const timestamp = drawing.points[0]?.timestamp ?? 0;

  return (
    <g
      onClick={(event) => {
        event.stopPropagation();
        onSelect(drawing.id);
      }}
      onMouseDown={(event) => {
        onStartDragging(event, -1, drawing);
      }}
      className="group cursor-move"
      style={{ pointerEvents: 'auto' }}
    >
      <line
        x1={x}
        y1={0}
        x2={x}
        y2={containerHeight}
        stroke={drawing.color}
        strokeWidth={
          isSelected ? drawing.strokeWidth + 1 : drawing.strokeWidth
        }
        strokeDasharray="4 4"
      />

      <rect
        x={x - 45}
        y={containerHeight - 22}
        width={90}
        height={18}
        rx={4}
        fill={drawing.color}
      />

      <text
        x={x}
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
};

export default VerticalLineRenderer;
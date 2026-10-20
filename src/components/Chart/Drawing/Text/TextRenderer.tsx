
import React from 'react';
import type { DrawingObject } from '../../../../types/index.js';

export interface TextPixelPoint {
  x: number;
  y: number;
}

interface TextRendererProps {
  drawing: DrawingObject;
  point: TextPixelPoint;
  isSelected: boolean;
  isDarkMode: boolean;
  onSelect: (id: string | null) => void;
  onStartDragging: (
    event: React.MouseEvent<SVGElement>,
    index: number,
    drawing: DrawingObject,
  ) => void;
}

export const TextRenderer: React.FC<TextRendererProps> = ({
  drawing,
  point,
  isSelected,
  isDarkMode,
  onSelect,
  onStartDragging,
}) => {
  const text = drawing.text || '';
  const fontSize = drawing.fontSize || 12;
  const rectWidth = text.length * 7.5 + 12;

  return (
    <g
      onClick={(event) => {
        event.stopPropagation();
        onSelect(drawing.id);
      }}
      onMouseDown={(event) => onStartDragging(event, -1, drawing)}
      className="cursor-move"
      style={{ pointerEvents: 'auto' }}
    >
      <rect
        x={point.x - 4}
        y={point.y - 14}
        width={rectWidth}
        height={22}
        rx={4}
        fill={
          isDarkMode
            ? 'rgba(15, 23, 42, 0.9)'
            : 'rgba(255, 255, 255, 0.95)'
        }
        stroke={drawing.color}
        strokeWidth={isSelected ? 2 : 1}
      />

      <text
        x={point.x + 3}
        y={point.y + 1}
        fill={drawing.color}
        fontSize={fontSize}
        fontWeight="600"
        fontFamily="sans-serif"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {text}
      </text>
    </g>
  );
};

export default TextRenderer;

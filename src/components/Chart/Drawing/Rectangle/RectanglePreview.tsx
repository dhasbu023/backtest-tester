
import React from 'react';
import type { RectanglePixelPoint } from './RectangleRenderer.js';

interface RectanglePreviewProps {
  firstPoint: RectanglePixelPoint;
  currentPoint: RectanglePixelPoint;
  color: string;
  strokeWidth: number;
}

export const RectanglePreview: React.FC<RectanglePreviewProps> = ({
  firstPoint,
  currentPoint,
  color,
  strokeWidth,
}) => {
  const x = Math.min(firstPoint.x, currentPoint.x);
  const y = Math.min(firstPoint.y, currentPoint.y);
  const width = Math.abs(firstPoint.x - currentPoint.x);
  const height = Math.abs(firstPoint.y - currentPoint.y);

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={color}
      fillOpacity={0.15}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray="4 4"
      pointerEvents="none"
    />
  );
};

export default RectanglePreview;

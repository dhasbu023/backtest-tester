
import type {
  DrawingObject,
  DrawingPoint,
} from '../../../../types/index.js';

export interface CreateTextDrawingOptions {
  point: DrawingPoint;
  color: string;
  strokeWidth: number;
}

export const createTextDrawing = ({
  point,
  color,
  strokeWidth,
}: CreateTextDrawingOptions): DrawingObject | null => {
  const text = window.prompt(
    'Masukkan teks / catatan analisis:',
    'Support Level',
  );

  if (!text?.trim()) {
    return null;
  }

  const now = new Date().toISOString();

  const drawing: DrawingObject = {
    id: `draw-${Date.now()}`,
    sessionId: '',
    type: 'TEXT',
    points: [point],
    color,
    strokeWidth,
    text: text.trim(),
    fontSize: 12,
    locked: false,
    visible: true,
    createdAt: now,
    updatedAt: now,
  };

  return drawing;
};

export default createTextDrawing;

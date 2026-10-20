
import type {
  DrawingObject,
  DrawingPoint,
} from '../../../../types/index.js';

export const DEFAULT_SHORT_TARGET_MULTIPLIER = 0.985;
export const DEFAULT_SHORT_STOP_MULTIPLIER = 1.0075;

export const DEFAULT_SHORT_POSITION_WIDTH_DAYS = 3;

interface CreateShortPositionDrawingParams {
  point: DrawingPoint;
  id: string;
  now: string;
  sessionId?: string;
  widthDays?: number;
}

export const createShortPositionDrawing = ({
  point,
  id,
  now,
  sessionId = '',
  widthDays = DEFAULT_SHORT_POSITION_WIDTH_DAYS,
}: CreateShortPositionDrawingParams): DrawingObject => {
  const entryPrice = point.price;

  const targetPrice =
    entryPrice * DEFAULT_SHORT_TARGET_MULTIPLIER;

  const stopPrice =
    entryPrice * DEFAULT_SHORT_STOP_MULTIPLIER;

  const endTimestamp =
    point.timestamp + 86_400 * widthDays;

  const risk = stopPrice - entryPrice;
  const reward = entryPrice - targetPrice;

  return {
    id,
    sessionId,
    type: 'SHORT_POSITION',
    points: [
      { ...point },
      {
        timestamp: endTimestamp,
        price: targetPrice,
      },
      {
        timestamp: endTimestamp,
        price: stopPrice,
      },
    ],
    entryPrice,
    targetPrice,
    stopPrice,
    riskReward:
      Math.abs(risk) > 0
        ? reward / risk
        : 0,
    color: '#ef4444',
    strokeWidth: 2,
    locked: false,
    visible: true,
    createdAt: now,
    updatedAt: now,
  };
};

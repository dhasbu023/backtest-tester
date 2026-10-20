
import type {
  DrawingObject,
  DrawingPoint,
} from '../../../../types/index.js';

const DEFAULT_LONG_TARGET_MULTIPLIER = 1.015;
const DEFAULT_LONG_STOP_MULTIPLIER = 0.9925;

interface CreateLongPositionParams {
  point: DrawingPoint;
  id: string;
  now: string;
  sessionId?: string;
  widthDays?: number;
}

/**
 * Membuat drawing Long Position beserta entry, target,
 * stop loss, dan risk/reward.
 */
export const createLongPositionDrawing = ({
  point,
  id,
  now,
  sessionId = '',
  widthDays = 3,
}: CreateLongPositionParams): DrawingObject => {
  const entryPrice = point.price;

  const targetPrice =
    entryPrice * DEFAULT_LONG_TARGET_MULTIPLIER;

  const stopPrice =
    entryPrice * DEFAULT_LONG_STOP_MULTIPLIER;

  const endTimestamp =
    point.timestamp + 86_400 * widthDays;

  const riskDistance = entryPrice - stopPrice;
  const rewardDistance = targetPrice - entryPrice;

  return {
    id,
    sessionId,
    type: 'LONG_POSITION',
    points: [
      point,
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
    riskReward: rewardDistance / riskDistance,
    color: '#10b981',
    strokeWidth: 2,
    locked: false,
    visible: true,
    createdAt: now,
    updatedAt: now,
  };
};

export default createLongPositionDrawing;

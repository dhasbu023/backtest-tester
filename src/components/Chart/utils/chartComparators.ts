
import type { DrawingObject } from '../../../types/index.js';

/**
 * Membandingkan dua kumpulan drawing.
 *
 * Mengembalikan true jika seluruh properti penting
 * dan points kedua kumpulan drawing sama.
 */
export function isSameDrawings(
  first: DrawingObject[],
  second: DrawingObject[],
): boolean {
  if (first === second) return true;
  if (first.length !== second.length) return false;

  for (let i = 0; i < first.length; i++) {
    const a = first[i];
    const b = second[i];

    if (!a || !b) return false;

    if (
      a.id !== b.id ||
      a.type !== b.type ||
      a.color !== b.color ||
      a.strokeWidth !== b.strokeWidth ||
      a.locked !== b.locked ||
      a.visible !== b.visible ||
      a.updatedAt !== b.updatedAt ||
      a.points.length !== b.points.length
    ) {
      return false;
    }

    if (
      a.entryPrice !== b.entryPrice ||
      a.targetPrice !== b.targetPrice ||
      a.stopPrice !== b.stopPrice ||
      a.riskReward !== b.riskReward ||
      a.lineStyle !== b.lineStyle ||
      a.extendRight !== b.extendRight ||
      a.showLabels !== b.showLabels ||
      a.opacity !== b.opacity ||
      a.fillColor !== b.fillColor
    ) {
      return false;
    }

    for (let j = 0; j < a.points.length; j++) {
      const ap = a.points[j];
      const bp = b.points[j];

      if (
        !ap ||
        !bp ||
        ap.timestamp !== bp.timestamp ||
        ap.price !== bp.price
      ) {
        return false;
      }
    }

    if (JSON.stringify(a.levels) !== JSON.stringify(b.levels)) {
      return false;
    }
  }

  return true;
}

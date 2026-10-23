import type { DrawingPoint } from '../../../../types/index.js';
import {
  DEFAULT_FIBONACCI_LEVELS,
  getActiveDefaultFibonacciSettings,
  type FibonacciLevel,
} from './fibonacci.defaults.js';

export function createFibonacciLevels(
  currentColor?: string,
  baseLevels?: FibonacciLevel[],
): FibonacciLevel[] {
  const sourceLevels =
    baseLevels && baseLevels.length > 0
      ? baseLevels
      : getActiveDefaultFibonacciSettings(currentColor).levels;

  return sourceLevels.map((level, index) => ({
    ...level,
    label: level.label !== undefined ? level.label : String(level.ratio),
    color:
      currentColor && (index === 0 || index === sourceLevels.length - 1)
        ? currentColor
        : level.color,
  }));
}

export function calculateFibonacciPrice(
  startPrice: number,
  endPrice: number,
  ratio: number,
): number {
  return startPrice + (endPrice - startPrice) * ratio;
}

export function calculateFibonacciLevels(
  firstPoint: DrawingPoint,
  secondPoint: DrawingPoint,
  levels: FibonacciLevel[] = DEFAULT_FIBONACCI_LEVELS,
) {
  return levels.map((level) => ({
    ...level,
    label: level.label !== undefined ? level.label : String(level.ratio),
    price: calculateFibonacciPrice(
      firstPoint.price,
      secondPoint.price,
      level.ratio,
    ),
  }));
}

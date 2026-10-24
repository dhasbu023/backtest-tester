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
  const diff = endPrice - startPrice;
  return startPrice + diff * ratio;
}

export function calculateFibonacciLevels(
  firstPoint: DrawingPoint,
  secondPoint: DrawingPoint,
  levels: FibonacciLevel[] = DEFAULT_FIBONACCI_LEVELS,
) {
  // In TradingView style, the first anchor represents the 100% (level 1) point,
  // and the second anchor represents the 0% (level 0) point. Therefore we treat
  // `secondPoint` as the start (0%) and `firstPoint` as the end (100%).
  return levels.map((level) => ({
    ...level,
    label: level.label !== undefined ? level.label : String(level.ratio),
    price: calculateFibonacciPrice(
      secondPoint.price, // start price (level 0)
      firstPoint.price,  // end price (level 1)
      level.ratio,
    ),
  }));
}

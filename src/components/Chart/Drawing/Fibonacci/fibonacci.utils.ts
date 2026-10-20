
import type { DrawingPoint } from '../../../types/index.js';
import {
  DEFAULT_FIBONACCI_LEVELS,
  type FibonacciLevel,
} from './fibonacci.defaults.js';

export function createFibonacciLevels(
  currentColor: string,
): FibonacciLevel[] {
  return DEFAULT_FIBONACCI_LEVELS.map((level, index) => ({
    ...level,
    color:
      index === 0 ||
      index === DEFAULT_FIBONACCI_LEVELS.length - 1
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
    price: calculateFibonacciPrice(
      firstPoint.price,
      secondPoint.price,
      level.ratio,
    ),
  }));
}

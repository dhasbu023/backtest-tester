
import type {
  FibonacciPropertiesSettings,
} from './FibonacciProperties.types.js';

export interface FibonacciLevel {
  ratio: number;
  color: string;
}

export const DEFAULT_FIBONACCI_LEVELS: FibonacciLevel[] = [
  { ratio: 0, color: '#3b82f6' },
  { ratio: 0.236, color: '#f59e0b' },
  { ratio: 0.382, color: '#10b981' },
  { ratio: 0.5, color: '#3b82f6' },
  { ratio: 0.618, color: '#8b5cf6' },
  { ratio: 0.786, color: '#ec4899' },
  { ratio: 1, color: '#3b82f6' },
];

export const createDefaultFibonacciProperties = (
  color = '#3b82f6',
  firstPrice = 0,
  secondPrice = 0,
): FibonacciPropertiesSettings => ({
  color,

  levels: DEFAULT_FIBONACCI_LEVELS.map((level) => ({
    ...level,
    enabled: true,
  })),

  lineWidth: 1,
  lineStyle: 'dashed',

  extendLeft: false,
  extendRight: true,

  showPrice: true,
  showRatio: true,
  showBackground: true,

  firstPoint: { price: firstPrice },
  secondPoint: { price: secondPrice },

  visibleTimeframes: [
    '1m',
    '3m',
    '5m',
    '15m',
    '30m',
    '45m',
    '1h',
    '2h',
    '3h',
    '4h',
    '1D',
    '1W',
    '1M',
  ],
});

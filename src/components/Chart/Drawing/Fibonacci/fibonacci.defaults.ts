
import type {
  FibonacciPropertiesSettings,
} from './FibonacciProperties.types.js';

export interface FibonacciLevel {
  id?: string;
  ratio: number;
  color: string;
  enabled?: boolean;
  visible?: boolean;
}

export const DEFAULT_FIBONACCI_LEVELS: FibonacciLevel[] = [
  { id: 'fibo-0', ratio: 0, color: '#787b86', enabled: true },
  { id: 'fibo-0.236', ratio: 0.236, color: '#f23645', enabled: true },
  { id: 'fibo-0.382', ratio: 0.382, color: '#ff9800', enabled: true },
  { id: 'fibo-0.5', ratio: 0.5, color: '#4caf50', enabled: true },
  { id: 'fibo-0.618', ratio: 0.618, color: '#089981', enabled: true },
  { id: 'fibo-0.786', ratio: 0.786, color: '#00bcd4', enabled: true },
  { id: 'fibo-1', ratio: 1, color: '#787b86', enabled: true },
  { id: 'fibo-1.272', ratio: 1.272, color: '#2962ff', enabled: false },
  { id: 'fibo-1.618', ratio: 1.618, color: '#2962ff', enabled: false },
  { id: 'fibo-2.618', ratio: 2.618, color: '#9c27b0', enabled: false },
];

export const createDefaultFibonacciProperties = (
  color = '#3b82f6',
  firstPrice = 0,
  secondPrice = 0,
): FibonacciPropertiesSettings => ({
  color,

  levels: DEFAULT_FIBONACCI_LEVELS.map((level) => ({
    id: level.id || `fibo-${level.ratio}`,
    ratio: level.ratio,
    color: level.color,
    enabled: level.enabled ?? true,
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
    'M1',
    'M5',
    'M15',
    'M30',
    'H1',
    'H4',
    'D1',
  ],
});

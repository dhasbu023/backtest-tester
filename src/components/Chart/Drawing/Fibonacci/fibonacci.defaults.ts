
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

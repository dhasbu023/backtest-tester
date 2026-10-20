
import type { FibonacciLevel } from './fibonacci.defaults.js';

export type FibonacciPropertiesTab =
  | 'style'
  | 'coordinates'
  | 'visibility';

export type FibonacciLineStyle = 'solid' | 'dashed' | 'dotted';

export interface FibonacciPropertiesLevel extends FibonacciLevel {
  enabled: boolean;
}

export interface FibonacciAnchorCoordinates {
  time?: number;
  price: number;
}

export interface FibonacciPropertiesSettings {
  color: string;
  levels: FibonacciPropertiesLevel[];

  lineWidth: number;
  lineStyle: FibonacciLineStyle;

  extendLeft: boolean;
  extendRight: boolean;

  showPrice: boolean;
  showRatio: boolean;
  showBackground: boolean;

  firstPoint: FibonacciAnchorCoordinates;
  secondPoint: FibonacciAnchorCoordinates;

  visibleTimeframes: string[];
}

export interface FibonacciPropertiesModalProps {
  open: boolean;
  title?: string;
  initialSettings: FibonacciPropertiesSettings;
  onClose: () => void;
  onApply: (settings: FibonacciPropertiesSettings) => void;
}

export const FIBONACCI_TIMEFRAMES = [
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
] as const;

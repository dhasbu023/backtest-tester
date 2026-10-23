import type { FibonacciLevel } from './fibonacci.defaults.js';

export type FibonacciPropertiesTab =
  | 'style'
  | 'coordinates'
  | 'visibility';

export type FibonacciLineStyle = 'solid' | 'dashed' | 'dotted';

export interface FibonacciPropertiesLevel extends FibonacciLevel {
  id?: string;
  enabled: boolean;
  label?: string;
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
  onSaveAsDefault?: (settings: FibonacciPropertiesSettings) => void;
}

export const FIBONACCI_TIMEFRAMES = [
  'M1',
  'M5',
  'M15',
  'M30',
  'H1',
  'H4',
  'D1',
] as const;

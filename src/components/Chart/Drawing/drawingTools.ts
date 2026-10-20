
import {
  MousePointer,
  Minus,
  TrendingUp,
  Square,
  MoveVertical,
  AlignJustify,
  ArrowUpCircle,
  ArrowDownCircle,
  Type,
} from 'lucide-react';

import type { ElementType } from 'react';
import type { DrawingToolType } from '../../types/index.js';

export interface DrawingToolDefinition {
  type: DrawingToolType;
  label: string;
  icon: ElementType;
}

export const TOOLS: DrawingToolDefinition[] = [
  {
    type: 'CURSOR',
    label: 'Kursor / Pilih',
    icon: MousePointer,
  },
  {
    type: 'HORIZONTAL_LINE',
    label: 'Horizontal Line',
    icon: Minus,
  },
  {
    type: 'TREND_LINE',
    label: 'Trend Line',
    icon: TrendingUp,
  },
  {
    type: 'RECTANGLE',
    label: 'Rectangle / Zona',
    icon: Square,
  },
  {
    type: 'VERTICAL_LINE',
    label: 'Vertical Line',
    icon: MoveVertical,
  },
  {
    type: 'FIBO_RETRACEMENT',
    label: 'Fibonacci Retracement',
    icon: AlignJustify,
  },
  {
    type: 'LONG_POSITION',
    label: 'Posisi Pembelian (Long)',
    icon: ArrowUpCircle,
  },
  {
    type: 'SHORT_POSITION',
    label: 'Posisi Penjualan (Short)',
    icon: ArrowDownCircle,
  },
  {
    type: 'TEXT',
    label: 'Teks / Catatan',
    icon: Type,
  },
];

export const PRESET_COLORS: string[] = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#e2e8f0',
];

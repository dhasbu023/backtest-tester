
import type { Pool, PoolClient } from 'pg';

import type {
  Candle,
  DrawingObject,
  ChartPreference,
} from '../../types/index.js';

export interface DatasetRecord {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  candleCount: number;
  fileSize: number;
  sourceFormat: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportJobRecord {
  id: string;
  datasetId?: string;
  fileName: string;
  fileSize: number;
  symbol: string;
  timeframe: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  progressPercent: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface SessionRecord {
  id: string;
  name: string;
  datasetId: string;
  symbol: string;
  sourceTimeframe: string;
  activeTimeframe: string;
  startReplayTime: number;
  currentReplayTime: number;
  currentCandleIndex: number;
  replaySpeed: number;

  // Account Configuration
  initialBalance: number;
  currentBalance: number;
  leverage: number;

  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReplayStateRecord {
  id: string;
  sessionId: string;
  currentTime: number;
  currentIndex: number;
  speed: number;
  activeTimeframe: string;
  isPlaying: boolean;
  lastSavedAt: string;
}

export interface RepositoryContext {
  getPool(): Pool;
  ensureInitialized(): void;
  parseJson<T = unknown>(value: unknown, fallback?: T): T;
}

export type {
  Pool,
  PoolClient,
  Candle,
  DrawingObject,
  ChartPreference,
};

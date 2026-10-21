export type Timeframe = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1';

export const TIMEFRAME_ORDER: Timeframe[] = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  M1: 60,
  M5: 300,
  M15: 900,
  M30: 1800,
  H1: 3600,
  H4: 14400,
  D1: 86400,
};

export interface TimezoneOption {
  id: string; // IANA identifier e.g. "Asia/Jakarta"
  label: string; // e.g. "WIB — Jakarta (UTC+7)"
  abbr: string; // e.g. "WIB"
  region: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { id: 'UTC', label: 'UTC (UTC+00:00)', abbr: 'UTC', region: 'Global' },
  { id: 'Asia/Jakarta', label: 'WIB — Jakarta (UTC+07:00)', abbr: 'WIB', region: 'Indonesia' },
  { id: 'Asia/Makassar', label: 'WITA — Makassar (UTC+08:00)', abbr: 'WITA', region: 'Indonesia' },
  { id: 'Asia/Jayapura', label: 'WIT — Jayapura (UTC+09:00)', abbr: 'WIT', region: 'Indonesia' },
  { id: 'Asia/Singapore', label: 'Singapore (UTC+08:00)', abbr: 'SGT', region: 'Asia' },
  { id: 'Europe/London', label: 'London (GMT / BST with DST)', abbr: 'LDN', region: 'Europe' },
  { id: 'America/New_York', label: 'New York (EST / EDT with DST)', abbr: 'NYC', region: 'Americas' },
  { id: 'Asia/Tokyo', label: 'Tokyo (JST — UTC+09:00)', abbr: 'JST', region: 'Asia' },
];

export interface Dataset {
  id: string;
  name: string;
  symbol: string;
  timeframe: Timeframe;
  startDate: string;
  endDate: string;
  candleCount: number;
  fileSize: number;
  sourceFormat: string;
  status: 'READY' | 'VALIDATING' | 'IMPORTING' | 'ERROR';
  createdAt: string;
  updatedAt: string;
}

export interface DatasetImportJob {
  id: string;
  datasetId?: string;
  fileName: string;
  fileSize: number;
  symbol: string;
  timeframe: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  progressPercent: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface Candle {
  timestamp: number; // Unix epoch in seconds (canonical UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  tickVolume: number;
  realVolume?: number;
  spread?: number;
}

export interface BacktestSession {
  id: string;
  name: string;
  datasetId: string;
  symbol: string;
  sourceTimeframe: Timeframe;
  activeTimeframe: Timeframe;
  startReplayTime: number; // Unix timestamp in seconds
  currentReplayTime: number;
  currentCandleIndex: number;
  replaySpeed: number;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  dataset?: Dataset;
}

export interface ReplayState {
  id: string;
  sessionId: string;
  currentTime: number;
  currentIndex: number;
  speed: number;
  activeTimeframe: Timeframe;
  isPlaying: boolean;
  lastSavedAt: string;
}

// Indicator Types & Definitions
export type IndicatorType = 'EMA' | 'SMA' | 'BOLLINGER' | 'RSI' | 'ATR';

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  name: string;
  visible: boolean;
  period: number;
  color: string;
  strokeWidth: number;
  stdDev?: number; // for Bollinger Bands
  upperColor?: string;
  lowerColor?: string;
  fillColor?: string;
  levels?: number[]; // for RSI, default [30, 50, 70]
  pane: 'main' | 'sub'; // main overlays chart, sub creates dedicated lower indicator pane
}

// Drawing Tools Types & Definitions
export type DrawingToolType =
  | 'CURSOR'
  | 'CROSS'
  | 'HORIZONTAL_LINE'
  | 'TREND_LINE'
  | 'RECTANGLE'
  | 'VERTICAL_LINE'
  | 'FIBO_RETRACEMENT'
  | 'LONG_POSITION'
  | 'SHORT_POSITION'
  | 'TEXT';

export interface DrawingPoint {
  timestamp: number; // Canonical UTC epoch in seconds
  price: number; // Accurate float price level
}

export interface DrawingObject {
  id: string;
  sessionId: string;
  type: DrawingToolType;
  points: DrawingPoint[];
  color: string;
  strokeWidth: number;
  fillColor?: string;
  opacity?: number;
  text?: string;
  fontSize?: number;
  levels?: { ratio: number; color?: string; visible?: boolean }[]; // for Fibo Retracement
  extensionLevels?: { ratio: number; color?: string }[]; // for Fibo Extension
  extendRight?: boolean; // for Fibonacci extend right
  showLabels?: boolean; // for Fibonacci show labels
  // Long & Short position properties
  entryPrice?: number;
  targetPrice?: number;
  stopPrice?: number;
  riskReward?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  locked: boolean;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}

// Chart Preferences persisted per session
export interface ChartPreference {
  id?: string;
  sessionId: string;
  timezone: string; // e.g. "Asia/Jakarta"
  showVolume: boolean;
  volumeType: 'TICK' | 'REAL';
  volumeHeight: number; // 0.1 to 0.35 fraction
  indicators: IndicatorConfig[];
  updatedAt?: string;
}

export interface CSVPreviewResult {
  valid: boolean;
  symbol: string;
  detectedTimeframe: Timeframe;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  firstTimestamp?: number;
  lastTimestamp?: number;
  minPrice?: number;
  maxPrice?: number;
  sampleCandles: Candle[];
  error?: string;
}

export interface DBStatus {
  connected: boolean;
  engine: string;
  database: string;
  latencyMs: number;
  datasetCount: number;
  candleCount: number;
  sessionCount: number;
  drawingCount?: number;
  error?: string;
}

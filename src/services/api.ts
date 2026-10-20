import { Dataset, DatasetImportJob, BacktestSession, ReplayState, Candle, CSVPreviewResult, DBStatus, Timeframe, DrawingObject, ChartPreference } from '../types/index.js';

export async function fetchDBStatus(): Promise<DBStatus> {
  const res = await fetch('/api/db-status');
  if (!res.ok) throw new Error('Gagal memeriksa status database');
  return res.json();
}

export async function fetchDatasets(): Promise<Dataset[]> {
  const res = await fetch('/api/datasets');
  if (!res.ok) throw new Error('Gagal mengambil daftar dataset');
  return res.json();
}

export async function fetchDataset(id: string): Promise<Dataset> {
  const res = await fetch(`/api/datasets/${id}`);
  if (!res.ok) throw new Error('Gagal mengambil detail dataset');
  return res.json();
}

export async function fetchDatasetTimeframes(id: string): Promise<{ sourceTimeframe: Timeframe; allowedTimeframes: Timeframe[] }> {
  const res = await fetch(`/api/datasets/${id}/timeframes`);
  if (!res.ok) throw new Error('Gagal mengambil daftar timeframe');
  return res.json();
}

export async function previewCSV(csvContent: string, fileName: string, symbol?: string, timeframe?: Timeframe): Promise<CSVPreviewResult> {
  const res = await fetch('/api/datasets/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csvContent, fileName, symbol, timeframe }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Preview CSV gagal');
  return data;
}

export async function importCSV(params: {
  csvContent: string;
  fileName: string;
  name?: string;
  symbol?: string;
  timeframe?: Timeframe;
}): Promise<{ success: boolean; jobId: string; dataset: Dataset; stats: any }> {
  const res = await fetch('/api/datasets/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Import CSV gagal');
  return data;
}

export async function fetchCandles(params: {
  datasetId: string;
  timeframe?: Timeframe;
  maxTimestamp?: number;
  limit?: number;
}): Promise<{ datasetId: string; sourceTimeframe: Timeframe; activeTimeframe: Timeframe; candleCount: number; candles: Candle[] }> {
  const query = new URLSearchParams();
  if (params.timeframe) query.set('timeframe', params.timeframe);
  if (params.maxTimestamp !== undefined) query.set('maxTimestamp', params.maxTimestamp.toString());
  if (params.limit) query.set('limit', params.limit.toString());

  const res = await fetch(`/api/datasets/${params.datasetId}/candles?${query.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal mengambil candles');
  }
  return res.json();
}

export async function fetchSessions(): Promise<BacktestSession[]> {
  const res = await fetch('/api/backtest-sessions');
  if (!res.ok) throw new Error('Gagal mengambil daftar sesi');
  return res.json();
}

export async function fetchSession(id: string): Promise<BacktestSession & { replayState?: ReplayState }> {
  const res = await fetch(`/api/backtest-sessions/${id}`);
  if (!res.ok) throw new Error('Gagal mengambil sesi');
  return res.json();
}

export async function createSession(params: {
  name: string;
  datasetId: string;
  activeTimeframe?: Timeframe;
  startReplayTime?: number;
  replaySpeed?: number;
  notes?: string;
}): Promise<{ id: string; message: string }> {
  const res = await fetch('/api/backtest-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal membuat sesi');
  return data;
}

export async function updateSession(id: string, params: Partial<BacktestSession>): Promise<{ success: boolean }> {
  const res = await fetch(`/api/backtest-sessions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Gagal memperbarui sesi');
  return res.json();
}

export async function saveReplayState(sessionId: string, params: {
  currentTime: number;
  currentIndex?: number;
  speed?: number;
  activeTimeframe?: Timeframe;
  isPlaying?: boolean;
}): Promise<{ success: boolean; savedAt: string }> {
  const res = await fetch(`/api/backtest-sessions/${sessionId}/replay-state`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Gagal menyimpan posisi replay');
  return res.json();
}

export async function deleteSession(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/backtest-sessions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Gagal menghapus sesi');
  return res.json();
}

export async function fetchDrawings(sessionId: string): Promise<DrawingObject[]> {
  const res = await fetch(`/api/backtest-sessions/${sessionId}/drawings`);
  if (!res.ok) throw new Error('Gagal mengambil daftar gambar');
  return res.json();
}

export async function saveDrawings(sessionId: string, drawings: DrawingObject[]): Promise<{ success: boolean; count: number }> {
  const res = await fetch(`/api/backtest-sessions/${sessionId}/drawings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drawings }),
  });
  if (!res.ok) throw new Error('Gagal menyimpan gambar');
  return res.json();
}

export async function deleteDrawing(sessionId: string, drawingId: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/backtest-sessions/${sessionId}/drawings/${drawingId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Gagal menghapus objek gambar');
  return res.json();
}

export async function fetchPreference(sessionId: string): Promise<ChartPreference> {
  const res = await fetch(`/api/backtest-sessions/${sessionId}/preference`);
  if (!res.ok) throw new Error('Gagal mengambil preferensi chart');
  return res.json();
}

export async function savePreference(sessionId: string, pref: Partial<ChartPreference>): Promise<{ success: boolean }> {
  const res = await fetch(`/api/backtest-sessions/${sessionId}/preference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pref),
  });
  if (!res.ok) throw new Error('Gagal menyimpan preferensi chart');
  return res.json();
}

import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { Candle, Timeframe, DrawingObject, ChartPreference } from '../types/index.js';

const { Pool } = pg;

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

class DatabaseManager {
  private pgPool: pg.Pool | null = null;
  private activeEngine: 'POSTGRES_EXTERNAL' | 'LOCAL_POSTGRES_STORE' = 'LOCAL_POSTGRES_STORE';
  private isInitialized = false;

  private dataDir = path.resolve(process.cwd(), 'data');
  private dbFile = path.resolve(process.cwd(), 'data', 'db_store.json');
  private candlesDir = path.resolve(process.cwd(), 'data', 'candles');

  private memoryCache = {
    datasets: new Map<string, DatasetRecord>(),
    jobs: new Map<string, ImportJobRecord>(),
    sessions: new Map<string, SessionRecord>(),
    replayStates: new Map<string, ReplayStateRecord>(),
    candles: new Map<string, Candle[]>(),
    drawings: new Map<string, DrawingObject>(), // drawingId -> DrawingObject
    preferences: new Map<string, ChartPreference>(), // sessionId -> ChartPreference
  };

  async init(): Promise<void> {
    if (this.isInitialized) return;

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.candlesDir)) {
      fs.mkdirSync(this.candlesDir, { recursive: true });
    }

    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl && databaseUrl.trim().length > 0) {
      try {
        console.log('[DB] Connecting to PostgreSQL via DATABASE_URL...');
        const pool = new Pool({
          connectionString: databaseUrl,
          connectionTimeoutMillis: 2000,
        });
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        this.pgPool = pool;
        this.activeEngine = 'POSTGRES_EXTERNAL';
        console.log('[DB] PostgreSQL external database connected!');
        await this.initPostgresSchema();
      } catch (err: any) {
        console.warn(`[DB] External PostgreSQL not reachable (${err.message}). Using persistent storage engine.`);
      }
    }

    this.loadLocalStore();
    this.isInitialized = true;
    console.log(`[DB] Database active. Engine: ${this.activeEngine}`);
  }

  private loadLocalStore(): void {
    if (fs.existsSync(this.dbFile)) {
      try {
        const raw = fs.readFileSync(this.dbFile, 'utf-8');
        const data = JSON.parse(raw);
        if (data.datasets) for (const d of data.datasets) this.memoryCache.datasets.set(d.id, d);
        if (data.jobs) for (const j of data.jobs) this.memoryCache.jobs.set(j.id, j);
        if (data.sessions) for (const s of data.sessions) this.memoryCache.sessions.set(s.id, s);
        if (data.replayStates) for (const r of data.replayStates) this.memoryCache.replayStates.set(r.sessionId, r);
        if (data.drawings) for (const dr of data.drawings) this.memoryCache.drawings.set(dr.id, dr);
        if (data.preferences) for (const p of data.preferences) this.memoryCache.preferences.set(p.sessionId, p);
      } catch (e: any) {
        console.error('[DB] Error loading db_store.json:', e.message);
      }
    }
  }

  private saveLocalStore(): void {
    try {
      const dump = {
        datasets: Array.from(this.memoryCache.datasets.values()),
        jobs: Array.from(this.memoryCache.jobs.values()),
        sessions: Array.from(this.memoryCache.sessions.values()),
        replayStates: Array.from(this.memoryCache.replayStates.values()),
        drawings: Array.from(this.memoryCache.drawings.values()),
        preferences: Array.from(this.memoryCache.preferences.values()),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(dump, null, 2), 'utf-8');
    } catch (e: any) {
      console.error('[DB] Error saving db_store.json:', e.message);
    }
  }

  private async initPostgresSchema(): Promise<void> {
    if (!this.pgPool) return;
    const ddl = `
      CREATE TABLE IF NOT EXISTS datasets (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        symbol VARCHAR(32) NOT NULL DEFAULT 'XAUUSD',
        timeframe VARCHAR(16) NOT NULL DEFAULT 'M1',
        start_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ NOT NULL,
        candle_count INT NOT NULL DEFAULT 0,
        file_size BIGINT NOT NULL DEFAULT 0,
        source_format VARCHAR(32) NOT NULL DEFAULT 'MT5_CSV',
        status VARCHAR(32) NOT NULL DEFAULT 'READY',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS dataset_import_jobs (
        id VARCHAR(64) PRIMARY KEY,
        dataset_id VARCHAR(64),
        file_name VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL DEFAULT 0,
        symbol VARCHAR(32) NOT NULL DEFAULT 'XAUUSD',
        timeframe VARCHAR(16) NOT NULL DEFAULT 'M1',
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        total_rows INT NOT NULL DEFAULT 0,
        valid_rows INT NOT NULL DEFAULT 0,
        invalid_rows INT NOT NULL DEFAULT 0,
        duplicate_rows INT NOT NULL DEFAULT 0,
        progress_percent DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        error_message TEXT,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS candles (
        id VARCHAR(64) PRIMARY KEY,
        dataset_id VARCHAR(64) NOT NULL,
        timestamp BIGINT NOT NULL,
        open DOUBLE PRECISION NOT NULL,
        high DOUBLE PRECISION NOT NULL,
        low DOUBLE PRECISION NOT NULL,
        close DOUBLE PRECISION NOT NULL,
        tick_volume BIGINT NOT NULL DEFAULT 0,
        real_volume BIGINT NOT NULL DEFAULT 0,
        spread DOUBLE PRECISION NOT NULL DEFAULT 0,
        CONSTRAINT uq_dataset_timestamp UNIQUE(dataset_id, timestamp)
      );

      CREATE TABLE IF NOT EXISTS backtest_sessions (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        dataset_id VARCHAR(64) NOT NULL,
        symbol VARCHAR(32) NOT NULL DEFAULT 'XAUUSD',
        source_timeframe VARCHAR(16) NOT NULL DEFAULT 'M1',
        active_timeframe VARCHAR(16) NOT NULL DEFAULT 'M1',
        start_replay_time BIGINT NOT NULL,
        current_replay_time BIGINT NOT NULL,
        current_candle_index INT NOT NULL DEFAULT 0,
        replay_speed DOUBLE PRECISION NOT NULL DEFAULT 1.0,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS replay_states (
        id VARCHAR(64) PRIMARY KEY,
        session_id VARCHAR(64) UNIQUE NOT NULL,
        current_time BIGINT NOT NULL,
        current_index INT NOT NULL DEFAULT 0,
        speed DOUBLE PRECISION NOT NULL DEFAULT 1.0,
        active_timeframe VARCHAR(16) NOT NULL DEFAULT 'M1',
        is_playing BOOLEAN NOT NULL DEFAULT false,
        last_saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS drawing_objects (
        id VARCHAR(64) PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        type VARCHAR(32) NOT NULL,
        points TEXT NOT NULL,
        color VARCHAR(32) NOT NULL DEFAULT '#2563eb',
        stroke_width INT NOT NULL DEFAULT 2,
        fill_color VARCHAR(32),
        opacity DOUBLE PRECISION DEFAULT 0.2,
        text TEXT,
        font_size INT DEFAULT 12,
        levels TEXT,
        extension_levels TEXT,
        locked BOOLEAN DEFAULT false,
        visible BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS chart_preferences (
        id VARCHAR(64) PRIMARY KEY,
        session_id VARCHAR(64) UNIQUE NOT NULL,
        timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta',
        show_volume BOOLEAN NOT NULL DEFAULT true,
        volume_type VARCHAR(16) NOT NULL DEFAULT 'TICK',
        volume_height DOUBLE PRECISION NOT NULL DEFAULT 0.18,
        indicators TEXT NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_candles_ds_time ON candles(dataset_id, timestamp ASC);
      CREATE INDEX IF NOT EXISTS idx_candles_time ON candles(timestamp ASC);
      CREATE INDEX IF NOT EXISTS idx_drawings_session ON drawing_objects(session_id);
    `;
    const statements = ddl.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
    for (const stmt of statements) {
      await this.pgPool.query(stmt);
    }
  }

  async getCandles(datasetId: string, maxTimestamp?: number, limit = 10000): Promise<Candle[]> {
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      let sql = `SELECT timestamp, open, high, low, close, tick_volume as "tickVolume", real_volume as "realVolume", spread
                 FROM candles WHERE dataset_id = $1`;
      const params: any[] = [datasetId];
      if (maxTimestamp !== undefined) {
        sql += ` AND timestamp <= $2`;
        params.push(maxTimestamp);
      }
      sql += ` ORDER BY timestamp ASC LIMIT $${params.length + 1}`;
      params.push(limit);
      const res = await this.pgPool.query(sql, params);
      return res.rows.map((r) => ({
        timestamp: Number(r.timestamp),
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
        tickVolume: Number(r.tickVolume || 0),
        realVolume: Number(r.realVolume || 0),
        spread: Number(r.spread || 0),
      }));
    }

    let candles = this.memoryCache.candles.get(datasetId);
    if (!candles) {
      const filePath = path.resolve(this.candlesDir, `${datasetId}.json`);
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, 'utf-8');
          candles = JSON.parse(raw);
          this.memoryCache.candles.set(datasetId, candles!);
        } catch (e) {
          candles = [];
        }
      } else {
        candles = [];
      }
    }

    let filtered = candles || [];
    if (maxTimestamp !== undefined) {
      filtered = filtered.filter((c) => c.timestamp <= maxTimestamp);
    }
    if (limit && filtered.length > limit) {
      filtered = filtered.slice(0, limit);
    }
    return filtered;
  }

  async insertCandles(datasetId: string, newCandles: Candle[]): Promise<void> {
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      const chunkSize = 500;
      for (let i = 0; i < newCandles.length; i += chunkSize) {
        const chunk = newCandles.slice(i, i + chunkSize);
        const valueClauses: string[] = [];
        const params: any[] = [];
        let pIdx = 1;
        for (const c of chunk) {
          valueClauses.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`);
          params.push(randomUUID(), datasetId, c.timestamp, c.open, c.high, c.low, c.close, c.tickVolume, c.realVolume || 0, c.spread || 0);
        }
        await this.pgPool.query(
          `INSERT INTO candles (id, dataset_id, timestamp, open, high, low, close, tick_volume, real_volume, spread)
           VALUES ${valueClauses.join(', ')}
           ON CONFLICT (dataset_id, timestamp) DO UPDATE
           SET open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close`,
          params
        );
      }
      return;
    }

    const existing = await this.getCandles(datasetId, undefined, 1000000);
    const map = new Map<number, Candle>();
    for (const c of existing) map.set(c.timestamp, c);
    for (const c of newCandles) map.set(c.timestamp, c);

    const merged = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
    this.memoryCache.candles.set(datasetId, merged);

    const filePath = path.resolve(this.candlesDir, `${datasetId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(merged), 'utf-8');
  }

  async saveDataset(record: DatasetRecord): Promise<void> {
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      await this.pgPool.query(
        `INSERT INTO datasets (id, name, symbol, timeframe, start_date, end_date, candle_count, file_size, source_format, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name, status = EXCLUDED.status, candle_count = EXCLUDED.candle_count, updated_at = NOW()`,
        [record.id, record.name, record.symbol, record.timeframe, record.startDate, record.endDate, record.candleCount, record.fileSize, record.sourceFormat, record.status, record.createdAt, record.updatedAt]
      );
      return;
    }

    this.memoryCache.datasets.set(record.id, record);
    this.saveLocalStore();
  }

  async getDataset(id: string): Promise<DatasetRecord | null> {
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      const res = await this.pgPool.query(
        `SELECT id, name, symbol, timeframe, start_date as "startDate", end_date as "endDate",
                candle_count as "candleCount", file_size as "fileSize", source_format as "sourceFormat",
                status, created_at as "createdAt", updated_at as "updatedAt"
         FROM datasets WHERE id = $1`,
        [id]
      );
      return res.rows[0] || null;
    }
    return this.memoryCache.datasets.get(id) || null;
  }

  async getAllDatasets(): Promise<DatasetRecord[]> {
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      const res = await this.pgPool.query(
        `SELECT id, name, symbol, timeframe, start_date as "startDate", end_date as "endDate",
                candle_count as "candleCount", file_size as "fileSize", source_format as "sourceFormat",
                status, created_at as "createdAt", updated_at as "updatedAt"
         FROM datasets ORDER BY created_at DESC`
      );
      return res.rows;
    }
    return Array.from(this.memoryCache.datasets.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async saveJob(job: ImportJobRecord): Promise<void> {
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      await this.pgPool.query(
        `INSERT INTO dataset_import_jobs (id, dataset_id, file_name, file_size, symbol, timeframe, status, total_rows, valid_rows, invalid_rows, duplicate_rows, progress_percent, error_message, started_at, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO UPDATE
         SET status = EXCLUDED.status, progress_percent = EXCLUDED.progress_percent, completed_at = EXCLUDED.completed_at, error_message = EXCLUDED.error_message`,
        [job.id, job.datasetId || null, job.fileName, job.fileSize, job.symbol, job.timeframe, job.status, job.totalRows, job.validRows, job.invalidRows, job.duplicateRows, job.progressPercent, job.errorMessage || null, job.startedAt, job.completedAt || null]
      );
      return;
    }

    this.memoryCache.jobs.set(job.id, job);
    this.saveLocalStore();
  }

  async getJob(id: string): Promise<ImportJobRecord | null> {
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      const res = await this.pgPool.query(
        `SELECT id, dataset_id as "datasetId", file_name as "fileName", file_size as "fileSize",
                symbol, timeframe, status, total_rows as "totalRows", valid_rows as "validRows",
                invalid_rows as "invalidRows", duplicate_rows as "duplicateRows",
                progress_percent as "progressPercent", error_message as "errorMessage",
                started_at as "startedAt", completed_at as "completedAt"
         FROM dataset_import_jobs WHERE id = $1 OR dataset_id = $1 ORDER BY started_at DESC LIMIT 1`,
        [id]
      );
      return res.rows[0] || null;
    }
    let found = this.memoryCache.jobs.get(id);
    if (!found) {
      for (const j of this.memoryCache.jobs.values()) {
        if (j.datasetId === id) return j;
      }
    }
    return found || null;
  }

  async saveSession(session: SessionRecord): Promise<void> {
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      await this.pgPool.query(
        `INSERT INTO backtest_sessions (id, name, dataset_id, symbol, source_timeframe, active_timeframe, start_replay_time, current_replay_time, current_candle_index, replay_speed, status, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name, active_timeframe = EXCLUDED.active_timeframe, current_replay_time = EXCLUDED.current_replay_time,
             current_candle_index = EXCLUDED.current_candle_index, replay_speed = EXCLUDED.replay_speed, status = EXCLUDED.status, updated_at = NOW()`,
        [session.id, session.name, session.datasetId, session.symbol, session.sourceTimeframe, session.activeTimeframe, session.startReplayTime, session.currentReplayTime, session.currentCandleIndex, session.replaySpeed, session.status, session.notes || '', session.createdAt, session.updatedAt]
      );
      return;
    }

    this.memoryCache.sessions.set(session.id, session);
    this.saveLocalStore();
  }

  async getSession(id: string): Promise<any | null> {
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      const res = await this.pgPool.query(
        `SELECT s.id, s.name, s.dataset_id as "datasetId", s.symbol,
                s.source_timeframe as "sourceTimeframe", s.active_timeframe as "activeTimeframe",
                s.start_replay_time as "startReplayTime", s.current_replay_time as "currentReplayTime",
                s.current_candle_index as "currentCandleIndex", s.replay_speed as "replaySpeed",
                s.status, s.notes, s.created_at as "createdAt", s.updated_at as "updatedAt",
                d.name as "datasetName", d.candle_count as "datasetCandleCount",
                d.start_date as "datasetStartDate", d.end_date as "datasetEndDate"
         FROM backtest_sessions s
         LEFT JOIN datasets d ON s.dataset_id = d.id
         WHERE s.id = $1`,
        [id]
      );
      if (res.rows.length === 0) return null;
      const replayRes = await this.pgPool.query('SELECT * FROM replay_states WHERE session_id = $1', [id]);
      return {
        ...res.rows[0],
        replayState: replayRes.rows[0] || null,
      };
    }

    const s = this.memoryCache.sessions.get(id);
    if (!s) return null;
    const ds = this.memoryCache.datasets.get(s.datasetId);
    const r = this.memoryCache.replayStates.get(id);
    return {
      ...s,
      datasetName: ds?.name,
      datasetCandleCount: ds?.candleCount,
      datasetStartDate: ds?.startDate,
      datasetEndDate: ds?.endDate,
      replayState: r || null,
    };
  }

  async getAllSessions(): Promise<any[]> {
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      const res = await this.pgPool.query(
        `SELECT s.id, s.name, s.dataset_id as "datasetId", s.symbol,
                s.source_timeframe as "sourceTimeframe", s.active_timeframe as "activeTimeframe",
                s.start_replay_time as "startReplayTime", s.current_replay_time as "currentReplayTime",
                s.current_candle_index as "currentCandleIndex", s.replay_speed as "replaySpeed",
                s.status, s.notes, s.created_at as "createdAt", s.updated_at as "updatedAt",
                d.name as "datasetName", d.candle_count as "datasetCandleCount",
                d.start_date as "datasetStartDate", d.end_date as "datasetEndDate"
         FROM backtest_sessions s
         LEFT JOIN datasets d ON s.dataset_id = d.id
         ORDER BY s.updated_at DESC`
      );
      return res.rows;
    }

    return Array.from(this.memoryCache.sessions.values()).map((s) => {
      const ds = this.memoryCache.datasets.get(s.datasetId);
      return {
        ...s,
        datasetName: ds?.name,
        datasetCandleCount: ds?.candleCount,
        datasetStartDate: ds?.startDate,
        datasetEndDate: ds?.endDate,
      };
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async saveReplayState(state: ReplayStateRecord): Promise<void> {
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      await this.pgPool.query(
        `INSERT INTO replay_states (id, session_id, current_time, current_index, speed, active_timeframe, is_playing, last_saved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (session_id) DO UPDATE
         SET current_time = EXCLUDED.current_time, current_index = EXCLUDED.current_index, speed = EXCLUDED.speed,
             active_timeframe = EXCLUDED.active_timeframe, is_playing = EXCLUDED.is_playing, last_saved_at = NOW()`,
        [state.id, state.sessionId, state.currentTime, state.currentIndex, state.speed, state.activeTimeframe, state.isPlaying]
      );
      await this.pgPool.query(
        `UPDATE backtest_sessions
         SET current_replay_time = $1, current_candle_index = $2, replay_speed = $3,
             active_timeframe = $4, updated_at = NOW()
         WHERE id = $5`,
        [state.currentTime, state.currentIndex, state.speed, state.activeTimeframe, state.sessionId]
      );
      return;
    }

    this.memoryCache.replayStates.set(state.sessionId, state);
    const session = this.memoryCache.sessions.get(state.sessionId);
    if (session) {
      session.currentReplayTime = state.currentTime;
      session.currentCandleIndex = state.currentIndex;
      session.replaySpeed = state.speed;
      session.activeTimeframe = state.activeTimeframe;
      session.updatedAt = new Date().toISOString();
      this.memoryCache.sessions.set(session.id, session);
    }
    this.saveLocalStore();
  }

  async deleteSession(id: string): Promise<void> {
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      await this.pgPool.query('DELETE FROM drawing_objects WHERE session_id = $1', [id]);
      await this.pgPool.query('DELETE FROM chart_preferences WHERE session_id = $1', [id]);
      await this.pgPool.query('DELETE FROM replay_states WHERE session_id = $1', [id]);
      await this.pgPool.query('DELETE FROM backtest_sessions WHERE id = $1', [id]);
      return;
    }

    this.memoryCache.sessions.delete(id);
    this.memoryCache.replayStates.delete(id);
    this.memoryCache.preferences.delete(id);
    for (const [dId, d] of this.memoryCache.drawings.entries()) {
      if (d.sessionId === id) this.memoryCache.drawings.delete(dId);
    }
    this.saveLocalStore();
  }

  // --- DRAWING OBJECTS OPERATIONS ---
  async getDrawings(sessionId: string): Promise<DrawingObject[]> {
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      const res = await this.pgPool.query(
        `SELECT id, session_id as "sessionId", type, points, color, stroke_width as "strokeWidth",
                fill_color as "fillColor", opacity, text, font_size as "fontSize", levels,
                extension_levels as "extensionLevels", locked, visible, created_at as "createdAt",
                updated_at as "updatedAt"
         FROM drawing_objects WHERE session_id = $1 ORDER BY created_at ASC`,
        [sessionId]
      );
      return res.rows.map((r) => ({
        ...r,
        points: typeof r.points === 'string' ? JSON.parse(r.points) : r.points,
        levels: r.levels ? JSON.parse(r.levels) : undefined,
        extensionLevels: r.extensionLevels ? JSON.parse(r.extensionLevels) : undefined,
      }));
    }

    const list: DrawingObject[] = [];
    for (const d of this.memoryCache.drawings.values()) {
      if (d.sessionId === sessionId) {
        list.push(d);
      }
    }
    return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async saveDrawing(drawing: DrawingObject): Promise<void> {
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      await this.pgPool.query(
        `INSERT INTO drawing_objects (id, session_id, type, points, color, stroke_width, fill_color, opacity, text, font_size, levels, extension_levels, locked, visible, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO UPDATE
         SET points = EXCLUDED.points, color = EXCLUDED.color, stroke_width = EXCLUDED.stroke_width,
             fill_color = EXCLUDED.fill_color, opacity = EXCLUDED.opacity, text = EXCLUDED.text,
             font_size = EXCLUDED.font_size, levels = EXCLUDED.levels, extension_levels = EXCLUDED.extension_levels,
             locked = EXCLUDED.locked, visible = EXCLUDED.visible, updated_at = NOW()`,
        [
          drawing.id,
          drawing.sessionId,
          drawing.type,
          JSON.stringify(drawing.points),
          drawing.color,
          drawing.strokeWidth,
          drawing.fillColor || null,
          drawing.opacity ?? 0.2,
          drawing.text || null,
          drawing.fontSize || 12,
          drawing.levels ? JSON.stringify(drawing.levels) : null,
          drawing.extensionLevels ? JSON.stringify(drawing.extensionLevels) : null,
          drawing.locked,
          drawing.visible,
          drawing.createdAt || new Date().toISOString(),
          new Date().toISOString(),
        ]
      );
      return;
    }

    this.memoryCache.drawings.set(drawing.id, drawing);
    this.saveLocalStore();
  }

  async saveAllDrawings(sessionId: string, drawings: DrawingObject[]): Promise<void> {
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      await this.pgPool.query('DELETE FROM drawing_objects WHERE session_id = $1', [sessionId]);
      for (const d of drawings) {
        await this.saveDrawing(d);
      }
      return;
    }

    // Clear old for session
    for (const [id, d] of this.memoryCache.drawings.entries()) {
      if (d.sessionId === sessionId) {
        this.memoryCache.drawings.delete(id);
      }
    }
    // Set new
    for (const d of drawings) {
      this.memoryCache.drawings.set(d.id, d);
    }
    this.saveLocalStore();
  }

  async deleteDrawing(id: string): Promise<void> {
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      await this.pgPool.query('DELETE FROM drawing_objects WHERE id = $1', [id]);
      return;
    }
    this.memoryCache.drawings.delete(id);
    this.saveLocalStore();
  }

  // --- CHART PREFERENCES OPERATIONS ---
  async getPreference(sessionId: string): Promise<ChartPreference | null> {
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      const res = await this.pgPool.query(
        `SELECT id, session_id as "sessionId", timezone, show_volume as "showVolume",
                volume_type as "volumeType", volume_height as "volumeHeight", indicators,
                updated_at as "updatedAt"
         FROM chart_preferences WHERE session_id = $1`,
        [sessionId]
      );
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        ...r,
        indicators: typeof r.indicators === 'string' ? JSON.parse(r.indicators) : r.indicators,
      };
    }
    return this.memoryCache.preferences.get(sessionId) || null;
  }

  async savePreference(pref: ChartPreference): Promise<void> {
    const id = pref.id || randomUUID();
    if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
      await this.pgPool.query(
        `INSERT INTO chart_preferences (id, session_id, timezone, show_volume, volume_type, volume_height, indicators, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         ON CONFLICT (session_id) DO UPDATE
         SET timezone = EXCLUDED.timezone, show_volume = EXCLUDED.show_volume, volume_type = EXCLUDED.volume_type,
             volume_height = EXCLUDED.volume_height, indicators = EXCLUDED.indicators, updated_at = NOW()`,
        [
          id,
          pref.sessionId,
          pref.timezone || 'Asia/Jakarta',
          pref.showVolume ?? true,
          pref.volumeType || 'TICK',
          pref.volumeHeight || 0.18,
          JSON.stringify(pref.indicators || []),
        ]
      );
      return;
    }

    this.memoryCache.preferences.set(pref.sessionId, { ...pref, id, updatedAt: new Date().toISOString() });
    this.saveLocalStore();
  }

  async getStatus() {
    const start = Date.now();
    try {
      let datasetCount = 0;
      let candleCount = 0;
      let sessionCount = 0;
      let drawingCount = 0;

      if (this.activeEngine === 'POSTGRES_EXTERNAL' && this.pgPool) {
        await this.pgPool.query('SELECT 1');
        const dsRes = await this.pgPool.query('SELECT COUNT(*) as count FROM datasets');
        const cRes = await this.pgPool.query('SELECT COUNT(*) as count FROM candles');
        const sRes = await this.pgPool.query('SELECT COUNT(*) as count FROM backtest_sessions');
        const drRes = await this.pgPool.query('SELECT COUNT(*) as count FROM drawing_objects');
        datasetCount = parseInt(dsRes.rows[0]?.count || '0', 10);
        candleCount = parseInt(cRes.rows[0]?.count || '0', 10);
        sessionCount = parseInt(sRes.rows[0]?.count || '0', 10);
        drawingCount = parseInt(drRes.rows[0]?.count || '0', 10);
      } else {
        datasetCount = this.memoryCache.datasets.size;
        for (const list of this.memoryCache.candles.values()) candleCount += list.length;
        if (candleCount === 0 && fs.existsSync(this.candlesDir)) {
          const files = fs.readdirSync(this.candlesDir);
          for (const f of files) {
            if (f.endsWith('.json')) {
              try {
                const arr = JSON.parse(fs.readFileSync(path.resolve(this.candlesDir, f), 'utf-8'));
                candleCount += arr.length;
              } catch (_) {}
            }
          }
        }
        sessionCount = this.memoryCache.sessions.size;
        drawingCount = this.memoryCache.drawings.size;
      }

      const latencyMs = Math.max(1, Date.now() - start);

      return {
        connected: true,
        engine: this.activeEngine === 'POSTGRES_EXTERNAL' ? 'PostgreSQL (External Docker)' : 'PostgreSQL Schema (Storage Engine)',
        database: 'xauusd_backtest',
        latencyMs,
        datasetCount,
        candleCount,
        sessionCount,
        drawingCount,
      };
    } catch (err: any) {
      return {
        connected: false,
        engine: 'Disconnected',
        database: 'None',
        latencyMs: -1,
        datasetCount: 0,
        candleCount: 0,
        sessionCount: 0,
        error: err.message,
      };
    }
  }
}

export const db = new DatabaseManager();

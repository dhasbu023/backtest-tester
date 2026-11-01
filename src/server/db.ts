
import 'dotenv/config';

import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';

import type {
  Candle,
  DrawingObject,
  ChartPreference,
} from '../types/index.js';

import type {
  DatasetRecord,
  ImportJobRecord,
  SessionRecord,
  ReplayStateRecord,
  RepositoryContext,
} from './repositories/types.js';

import { CandleRepository } from './repositories/candleRepository.js';
import { DatasetRepository } from './repositories/datasetRepository.js';
import { ImportJobRepository } from './repositories/importJobRepository.js';
import { SessionRepository } from './repositories/sessionRepository.js';
import { ReplayRepository } from './repositories/replayRepository.js';
import { DrawingRepository } from './repositories/drawingRepository.js';
import { PreferenceRepository } from './repositories/preferenceRepository.js';

// Tetap menyediakan type export untuk file lain yang mungkin
// sebelumnya mengimpor type dari db.ts.
export type {
  DatasetRecord,
  ImportJobRecord,
  SessionRecord,
  ReplayStateRecord,
};

const { Pool } = pg;

class DatabaseManager {
  private pgPool: pg.Pool | null = null;

  private activeEngine: 'POSTGRES_EXTERNAL' = 'POSTGRES_EXTERNAL';

  private isInitialized = false;

  private dataDir = path.resolve(process.cwd(), 'data');
  private candlesDir = path.resolve(process.cwd(), 'data', 'candles');

  // ============================================================
  // REPOSITORY INSTANCES
  // ============================================================

  private readonly repositoryContext: RepositoryContext = {
    getPool: () => {
      if (!this.pgPool) {
        throw new Error('[DB] PostgreSQL pool belum tersedia.');
      }

      return this.pgPool;
    },

    ensureInitialized: () => {
      this.ensureInitialized();
    },

    parseJson: <T = unknown>(
      value: unknown,
      fallback?: T,
    ): T => {
      return this.parseJson(value, fallback);
    },
  };

  private readonly candleRepository = new CandleRepository(
    this.repositoryContext,
  );

  private readonly datasetRepository = new DatasetRepository(
    this.repositoryContext,
  );

  private readonly importJobRepository = new ImportJobRepository(
    this.repositoryContext,
  );

  private readonly sessionRepository = new SessionRepository(
    this.repositoryContext,
  );

  private readonly replayRepository = new ReplayRepository(
    this.repositoryContext,
  );

  private readonly drawingRepository = new DrawingRepository(
    this.repositoryContext,
  );

  private readonly preferenceRepository = new PreferenceRepository(
    this.repositoryContext,
  );

  // ============================================================
  // DATABASE HELPERS
  // ============================================================

  private getDatabaseName(): string {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return 'None';
    }

    try {
      const url = new URL(databaseUrl);

      return decodeURIComponent(
        url.pathname.replace(/^\//, ''),
      );
    } catch {
      return 'Unknown';
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.pgPool) {
      throw new Error(
        '[DB] Database belum siap. Pastikan PostgreSQL aktif dan db.init() sudah dijalankan.',
      );
    }
  }

  private parseJson<T = unknown>(
    value: unknown,
    fallback?: T,
  ): T {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return fallback as T;
    }

    if (typeof value !== 'string') {
      return value as T;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback as T;
    }
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Mempertahankan direktori data lama.
    // Tidak menghapus atau mengubah file backup JSON.
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (!fs.existsSync(this.candlesDir)) {
      fs.mkdirSync(this.candlesDir, { recursive: true });
    }

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl || !databaseUrl.trim()) {
      throw new Error(
        '[DB] DATABASE_URL tidak ditemukan. Periksa file .env.',
      );
    }

    console.log('[DB] Connecting to PostgreSQL...');
    console.log(`[DB] Target database: ${this.getDatabaseName()}`);

    const pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 10,
    });

    try {
      await pool.query('SELECT 1');

      this.pgPool = pool;

      await this.initPostgresSchema();

      this.isInitialized = true;

      console.log('[DB] PostgreSQL connected successfully.');
      console.log('[DB] Prisma schema verified.');
      console.log('[DB] Database active: PostgreSQL');
      console.log('[DB] Repository architecture initialized.');
    } catch (error: unknown) {
      this.pgPool = null;
      this.isInitialized = false;

      await pool.end().catch(() => {});

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      throw new Error(
        `[DB] PostgreSQL initialization failed: ${message}`,
      );
    }
  }

  /**
   * Memastikan tabel PostgreSQL yang dibuat oleh Prisma tersedia.
   *
   * Tidak membuat tabel baru dan tidak mengubah struktur Prisma.
   */
  private async initPostgresSchema(): Promise<void> {
    if (!this.pgPool) {
      throw new Error('[DB] PostgreSQL pool belum tersedia.');
    }

    const requiredTables = [
      'Dataset',
      'DatasetImportJob',
      'Candle',
      'BacktestSession',
      'ReplayState',
      'DrawingObject',
      'ChartPreference',
    ];

    for (const table of requiredTables) {
      const result = await this.pgPool.query(
        'SELECT to_regclass($1) AS table_name',
        [`"${table}"`],
      );

      if (!result.rows[0]?.table_name) {
        throw new Error(
          `[DB] Tabel Prisma "${table}" tidak ditemukan. Periksa database dan jalankan Prisma migration jika diperlukan.`,
        );
      }
    }

    console.log('[DB] Semua tabel Prisma berhasil diverifikasi.');
  }

  // ============================================================
  // CANDLES
  // Delegated to CandleRepository
  // ============================================================

  async getCandles(
    datasetId: string,
    maxTimestamp?: number,
    limit = 10000,
  ): Promise<Candle[]> {
    return this.candleRepository.getCandles(
      datasetId,
      maxTimestamp,
      limit,
    );
  }

  async insertCandles(
    datasetId: string,
    newCandles: Candle[],
  ): Promise<void> {
    return this.candleRepository.insertCandles(
      datasetId,
      newCandles,
    );
  }

  // ============================================================
  // DATASETS
  // Delegated to DatasetRepository
  // ============================================================

  async saveDataset(record: DatasetRecord): Promise<void> {
    return this.datasetRepository.saveDataset(record);
  }

  async getDataset(
    id: string,
  ): Promise<DatasetRecord | null> {
    return this.datasetRepository.getDataset(id);
  }

  async getAllDatasets(): Promise<DatasetRecord[]> {
    return this.datasetRepository.getAllDatasets();
  }

  // ============================================================
  // IMPORT JOBS
  // Delegated to ImportJobRepository
  // ============================================================

  async saveJob(job: ImportJobRecord): Promise<void> {
    return this.importJobRepository.saveJob(job);
  }

  async getJob(
    id: string,
  ): Promise<ImportJobRecord | null> {
    return this.importJobRepository.getJob(id);
  }

  // ============================================================
  // BACKTEST SESSIONS
  // Delegated to SessionRepository
  // ============================================================

  async saveSession(session: SessionRecord): Promise<void> {
    return this.sessionRepository.saveSession(session);
  }

  async getSession(id: string): Promise<any | null> {
    return this.sessionRepository.getSession(id);
  }

  async getAllSessions(): Promise<any[]> {
    return this.sessionRepository.getAllSessions();
  }

  async deleteSession(id: string): Promise<void> {
    return this.sessionRepository.deleteSession(id);
  }

  // ============================================================
  // REPLAY STATE
  // Delegated to ReplayRepository
  // ============================================================

  async saveReplayState(
    state: ReplayStateRecord,
  ): Promise<void> {
    return this.replayRepository.saveReplayState(state);
  }

  // ============================================================
  // DRAWING OBJECTS
  // Delegated to DrawingRepository
  // ============================================================

  async getDrawings(
    sessionId: string,
  ): Promise<DrawingObject[]> {
    return this.drawingRepository.getDrawings(sessionId);
  }

  async saveDrawing(
    drawing: DrawingObject,
  ): Promise<void> {
    return this.drawingRepository.saveDrawing(drawing);
  }

  async saveAllDrawings(
    sessionId: string,
    drawings: DrawingObject[],
  ): Promise<void> {
    return this.drawingRepository.saveAllDrawings(
      sessionId,
      drawings,
    );
  }

  async deleteDrawing(id: string): Promise<void> {
    return this.drawingRepository.deleteDrawing(id);
  }

  // ============================================================
  // CHART PREFERENCES
  // Delegated to PreferenceRepository
  // ============================================================

  async getPreference(
    sessionId: string,
  ): Promise<ChartPreference | null> {
    return this.preferenceRepository.getPreference(sessionId);
  }

  async savePreference(
    pref: ChartPreference,
  ): Promise<void> {
    return this.preferenceRepository.savePreference(pref);
  }

  // ============================================================
  // DATABASE STATUS
  // ============================================================

  async getStatus() {
    const start = Date.now();

    try {
      this.ensureInitialized();

      const pool = this.pgPool!;

      await pool.query('SELECT 1');

      const [
        datasetResult,
        candleResult,
        sessionResult,
        drawingResult,
        jobResult,
      ] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) AS count FROM "Dataset"`,
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM "Candle"`,
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM "BacktestSession"`,
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM "DrawingObject"`,
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM "DatasetImportJob"`,
        ),
      ]);

      const datasetCount = Number(
        datasetResult.rows[0]?.count || 0,
      );

      const candleCount = Number(
        candleResult.rows[0]?.count || 0,
      );

      const sessionCount = Number(
        sessionResult.rows[0]?.count || 0,
      );

      const drawingCount = Number(
        drawingResult.rows[0]?.count || 0,
      );

      const jobCount = Number(
        jobResult.rows[0]?.count || 0,
      );

      return {
        connected: true,
        engine: 'PostgreSQL',
        database: this.getDatabaseName(),
        latencyMs: Math.max(1, Date.now() - start),
        datasetCount,
        candleCount,
        sessionCount,
        drawingCount,
        jobCount,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      return {
        connected: false,
        engine: 'Disconnected',
        database: this.getDatabaseName(),
        latencyMs: -1,
        datasetCount: 0,
        candleCount: 0,
        sessionCount: 0,
        drawingCount: 0,
        jobCount: 0,
        error: message,
      };
    }
  }

  // ============================================================
  // SHUTDOWN
  // ============================================================

  async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
      this.pgPool = null;
    }

    this.isInitialized = false;

    console.log('[DB] PostgreSQL connection closed.');
  }
}

export const db = new DatabaseManager();

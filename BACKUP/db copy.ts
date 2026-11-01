import 'dotenv/config';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import {
  Candle,
  DrawingObject,
  ChartPreference,
} from '../types/index.js';

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

  // PostgreSQL menjadi satu-satunya database aktif.
  private activeEngine: 'POSTGRES_EXTERNAL' = 'POSTGRES_EXTERNAL';

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
    drawings: new Map<string, DrawingObject>(),
    preferences: new Map<string, ChartPreference>(),
  };

  private getDatabaseName(): string {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) return 'None';

    try {
      const url = new URL(databaseUrl);
      return decodeURIComponent(url.pathname.replace(/^\//, ''));
    } catch {
      return 'Unknown';
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.pgPool) {
      throw new Error(
        '[DB] Database belum siap. Pastikan PostgreSQL aktif dan db.init() sudah dijalankan.'
      );
    }
  }

  private parseJson(value: unknown, fallback: any = undefined): any {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    if (typeof value !== 'string') {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (!fs.existsSync(this.candlesDir)) {
      fs.mkdirSync(this.candlesDir, { recursive: true });
    }

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl || !databaseUrl.trim()) {
      throw new Error(
        '[DB] DATABASE_URL tidak ditemukan. Periksa file .env.'
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
    } catch (error: any) {
      this.pgPool = null;
      this.isInitialized = false;

      await pool.end().catch(() => {});

      throw new Error(
        `[DB] PostgreSQL initialization failed: ${error?.message || error}`
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
        [`"${table}"`]
      );

      if (!result.rows[0]?.table_name) {
        throw new Error(
          `[DB] Tabel Prisma "${table}" tidak ditemukan. Periksa database dan jalankan Prisma migration jika diperlukan.`
        );
      }
    }

    console.log('[DB] Semua tabel Prisma berhasil diverifikasi.');
  }

  // ============================================================
  // CANDLES
  // ============================================================

  async getCandles(
    datasetId: string,
    maxTimestamp?: number,
    limit = 10000
  ): Promise<Candle[]> {
    this.ensureInitialized();

    let sql = `
      SELECT
        "timestamp",
        "open",
        "high",
        "low",
        "close",
        "tickVolume",
        "realVolume",
        "spread"
      FROM "Candle"
      WHERE "datasetId" = $1
    `;

    const params: any[] = [datasetId];

    if (maxTimestamp !== undefined) {
      sql += ` AND "timestamp" <= $2`;
      params.push(maxTimestamp);
    }

    sql += ` ORDER BY "timestamp" ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pgPool!.query(sql, params);

    return result.rows.map((row) => ({
      timestamp: Number(row.timestamp),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      tickVolume: Number(row.tickVolume || 0),
      realVolume: Number(row.realVolume || 0),
      spread: Number(row.spread || 0),
    }));
  }

  async insertCandles(
    datasetId: string,
    newCandles: Candle[]
  ): Promise<void> {
    this.ensureInitialized();

    if (!newCandles.length) return;

    const chunkSize = 500;

    for (let i = 0; i < newCandles.length; i += chunkSize) {
      const chunk = newCandles.slice(i, i + chunkSize);

      const valueClauses: string[] = [];
      const params: any[] = [];

      let parameterIndex = 1;

      for (const candle of chunk) {
        valueClauses.push(
          `(
            $${parameterIndex++},
            $${parameterIndex++},
            $${parameterIndex++},
            $${parameterIndex++},
            $${parameterIndex++},
            $${parameterIndex++},
            $${parameterIndex++},
            $${parameterIndex++},
            $${parameterIndex++},
            $${parameterIndex++}
          )`
        );

        params.push(
          randomUUID(),
          datasetId,
          candle.timestamp,
          candle.open,
          candle.high,
          candle.low,
          candle.close,
          candle.tickVolume ?? 0,
          candle.realVolume ?? 0,
          candle.spread ?? 0
        );
      }

      await this.pgPool!.query(
        `
          INSERT INTO "Candle" (
            "id",
            "datasetId",
            "timestamp",
            "open",
            "high",
            "low",
            "close",
            "tickVolume",
            "realVolume",
            "spread"
          )
          VALUES ${valueClauses.join(', ')}
          ON CONFLICT ("datasetId", "timestamp")
          DO UPDATE SET
            "open" = EXCLUDED."open",
            "high" = EXCLUDED."high",
            "low" = EXCLUDED."low",
            "close" = EXCLUDED."close",
            "tickVolume" = EXCLUDED."tickVolume",
            "realVolume" = EXCLUDED."realVolume",
            "spread" = EXCLUDED."spread"
        `,
        params
      );
    }
  }

  // ============================================================
  // DATASETS
  // ============================================================

  async saveDataset(record: DatasetRecord): Promise<void> {
    this.ensureInitialized();

    await this.pgPool!.query(
      `
        INSERT INTO "Dataset" (
          "id",
          "name",
          "symbol",
          "timeframe",
          "startDate",
          "endDate",
          "candleCount",
          "fileSize",
          "sourceFormat",
          "status",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12
        )
        ON CONFLICT ("id")
        DO UPDATE SET
          "name" = EXCLUDED."name",
          "symbol" = EXCLUDED."symbol",
          "timeframe" = EXCLUDED."timeframe",
          "startDate" = EXCLUDED."startDate",
          "endDate" = EXCLUDED."endDate",
          "candleCount" = EXCLUDED."candleCount",
          "fileSize" = EXCLUDED."fileSize",
          "sourceFormat" = EXCLUDED."sourceFormat",
          "status" = EXCLUDED."status",
          "updatedAt" = NOW()
      `,
      [
        record.id,
        record.name,
        record.symbol,
        record.timeframe,
        record.startDate,
        record.endDate,
        record.candleCount,
        record.fileSize,
        record.sourceFormat,
        record.status,
        record.createdAt,
        record.updatedAt,
      ]
    );
  }

  async getDataset(id: string): Promise<DatasetRecord | null> {
    this.ensureInitialized();

    const result = await this.pgPool!.query(
      `
        SELECT
          "id",
          "name",
          "symbol",
          "timeframe",
          "startDate",
          "endDate",
          "candleCount",
          "fileSize",
          "sourceFormat",
          "status",
          "createdAt",
          "updatedAt"
        FROM "Dataset"
        WHERE "id" = $1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  async getAllDatasets(): Promise<DatasetRecord[]> {
    this.ensureInitialized();

    const result = await this.pgPool!.query(`
      SELECT
        "id",
        "name",
        "symbol",
        "timeframe",
        "startDate",
        "endDate",
        "candleCount",
        "fileSize",
        "sourceFormat",
        "status",
        "createdAt",
        "updatedAt"
      FROM "Dataset"
      ORDER BY "createdAt" DESC
    `);

    return result.rows;
  }

  // ============================================================
  // IMPORT JOBS
  // ============================================================

  async saveJob(job: ImportJobRecord): Promise<void> {
    this.ensureInitialized();

    await this.pgPool!.query(
      `
        INSERT INTO "DatasetImportJob" (
          "id",
          "datasetId",
          "fileName",
          "fileSize",
          "symbol",
          "timeframe",
          "status",
          "totalRows",
          "validRows",
          "invalidRows",
          "duplicateRows",
          "progressPercent",
          "errorMessage",
          "startedAt",
          "completedAt"
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15
        )
        ON CONFLICT ("id")
        DO UPDATE SET
          "datasetId" = EXCLUDED."datasetId",
          "fileName" = EXCLUDED."fileName",
          "fileSize" = EXCLUDED."fileSize",
          "symbol" = EXCLUDED."symbol",
          "timeframe" = EXCLUDED."timeframe",
          "status" = EXCLUDED."status",
          "totalRows" = EXCLUDED."totalRows",
          "validRows" = EXCLUDED."validRows",
          "invalidRows" = EXCLUDED."invalidRows",
          "duplicateRows" = EXCLUDED."duplicateRows",
          "progressPercent" = EXCLUDED."progressPercent",
          "errorMessage" = EXCLUDED."errorMessage",
          "completedAt" = EXCLUDED."completedAt"
      `,
      [
        job.id,
        job.datasetId || null,
        job.fileName,
        job.fileSize,
        job.symbol,
        job.timeframe,
        job.status,
        job.totalRows,
        job.validRows,
        job.invalidRows,
        job.duplicateRows,
        job.progressPercent,
        job.errorMessage || null,
        job.startedAt,
        job.completedAt || null,
      ]
    );
  }

  async getJob(id: string): Promise<ImportJobRecord | null> {
    this.ensureInitialized();

    const result = await this.pgPool!.query(
      `
        SELECT
          "id",
          "datasetId",
          "fileName",
          "fileSize",
          "symbol",
          "timeframe",
          "status",
          "totalRows",
          "validRows",
          "invalidRows",
          "duplicateRows",
          "progressPercent",
          "errorMessage",
          "startedAt",
          "completedAt"
        FROM "DatasetImportJob"
        WHERE "id" = $1 OR "datasetId" = $1
        ORDER BY "startedAt" DESC
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  // ============================================================
  // BACKTEST SESSIONS
  // ============================================================

  async saveSession(session: SessionRecord): Promise<void> {
    this.ensureInitialized();

    await this.pgPool!.query(
      `
        INSERT INTO "BacktestSession" (
          "id",
          "name",
          "datasetId",
          "symbol",
          "sourceTimeframe",
          "activeTimeframe",
          "startReplayTime",
          "currentReplayTime",
          "currentCandleIndex",
          "replaySpeed",
          "status",
          "notes",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14
        )
        ON CONFLICT ("id")
        DO UPDATE SET
          "name" = EXCLUDED."name",
          "datasetId" = EXCLUDED."datasetId",
          "symbol" = EXCLUDED."symbol",
          "sourceTimeframe" = EXCLUDED."sourceTimeframe",
          "activeTimeframe" = EXCLUDED."activeTimeframe",
          "currentReplayTime" = EXCLUDED."currentReplayTime",
          "currentCandleIndex" = EXCLUDED."currentCandleIndex",
          "replaySpeed" = EXCLUDED."replaySpeed",
          "status" = EXCLUDED."status",
          "notes" = EXCLUDED."notes",
          "updatedAt" = NOW()
      `,
      [
        session.id,
        session.name,
        session.datasetId,
        session.symbol,
        session.sourceTimeframe,
        session.activeTimeframe,
        session.startReplayTime,
        session.currentReplayTime,
        session.currentCandleIndex,
        session.replaySpeed,
        session.status,
        session.notes ?? null,
        session.createdAt,
        session.updatedAt,
      ]
    );
  }

  async getSession(id: string): Promise<any | null> {
    this.ensureInitialized();

    const result = await this.pgPool!.query(
      `
        SELECT
          s."id",
          s."name",
          s."datasetId",
          s."symbol",
          s."sourceTimeframe",
          s."activeTimeframe",
          s."startReplayTime",
          s."currentReplayTime",
          s."currentCandleIndex",
          s."replaySpeed",
          s."status",
          s."notes",
          s."createdAt",
          s."updatedAt",
          d."name" AS "datasetName",
          d."candleCount" AS "datasetCandleCount",
          d."startDate" AS "datasetStartDate",
          d."endDate" AS "datasetEndDate"
        FROM "BacktestSession" s
        LEFT JOIN "Dataset" d
          ON s."datasetId" = d."id"
        WHERE s."id" = $1
      `,
      [id]
    );

    if (result.rows.length === 0) return null;

    const replayResult = await this.pgPool!.query(
      `
        SELECT
          "id",
          "sessionId",
          "currentTime",
          "currentIndex",
          "speed",
          "activeTimeframe",
          "isPlaying",
          "lastSavedAt"
        FROM "ReplayState"
        WHERE "sessionId" = $1
      `,
      [id]
    );

    const row = result.rows[0];
    const replay = replayResult.rows[0] || null;

    return {
      ...row,
      startReplayTime: Number(row.startReplayTime),
      currentReplayTime: Number(row.currentReplayTime),
      replayState: replay
        ? {
            ...replay,
            currentTime: Number(replay.currentTime),
          }
        : null,
    };
  }

  async getAllSessions(): Promise<any[]> {
    this.ensureInitialized();

    const result = await this.pgPool!.query(`
      SELECT
        s."id",
        s."name",
        s."datasetId",
        s."symbol",
        s."sourceTimeframe",
        s."activeTimeframe",
        s."startReplayTime",
        s."currentReplayTime",
        s."currentCandleIndex",
        s."replaySpeed",
        s."status",
        s."notes",
        s."createdAt",
        s."updatedAt",
        d."name" AS "datasetName",
        d."candleCount" AS "datasetCandleCount",
        d."startDate" AS "datasetStartDate",
        d."endDate" AS "datasetEndDate"
      FROM "BacktestSession" s
      LEFT JOIN "Dataset" d
        ON s."datasetId" = d."id"
      ORDER BY s."updatedAt" DESC
    `);

    return result.rows.map((row) => ({
      ...row,
      startReplayTime: Number(row.startReplayTime),
      currentReplayTime: Number(row.currentReplayTime),
    }));
  }

  // ============================================================
  // REPLAY STATE
  // ============================================================

  async saveReplayState(state: ReplayStateRecord): Promise<void> {
    this.ensureInitialized();

    const client = await this.pgPool!.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `
          INSERT INTO "ReplayState" (
            "id",
            "sessionId",
            "currentTime",
            "currentIndex",
            "speed",
            "activeTimeframe",
            "isPlaying",
            "lastSavedAt"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT ("sessionId")
          DO UPDATE SET
            "currentTime" = EXCLUDED."currentTime",
            "currentIndex" = EXCLUDED."currentIndex",
            "speed" = EXCLUDED."speed",
            "activeTimeframe" = EXCLUDED."activeTimeframe",
            "isPlaying" = EXCLUDED."isPlaying",
            "lastSavedAt" = NOW()
        `,
        [
          state.id,
          state.sessionId,
          state.currentTime,
          state.currentIndex,
          state.speed,
          state.activeTimeframe,
          state.isPlaying,
        ]
      );

      await client.query(
        `
          UPDATE "BacktestSession"
          SET
            "currentReplayTime" = $1,
            "currentCandleIndex" = $2,
            "replaySpeed" = $3,
            "activeTimeframe" = $4,
            "updatedAt" = NOW()
          WHERE "id" = $5
        `,
        [
          state.currentTime,
          state.currentIndex,
          state.speed,
          state.activeTimeframe,
          state.sessionId,
        ]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================
  // DELETE SESSION
  // ============================================================

  async deleteSession(id: string): Promise<void> {
    this.ensureInitialized();

    // Relasi Prisma menggunakan onDelete: Cascade.
    // DrawingObject, ChartPreference dan ReplayState ikut terhapus.
    await this.pgPool!.query(
      `DELETE FROM "BacktestSession" WHERE "id" = $1`,
      [id]
    );
  }

  // ============================================================
  // DRAWING OBJECTS
  // ============================================================

  async getDrawings(sessionId: string): Promise<DrawingObject[]> {
    this.ensureInitialized();

    const result = await this.pgPool!.query(
      `
        SELECT
          "id",
          "sessionId",
          "type",
          "points",
          "color",
          "strokeWidth",
          "fillColor",
          "opacity",
          "text",
          "fontSize",
          "levels",
          "extensionLevels",
          "locked",
          "visible",
          "createdAt",
          "updatedAt"
        FROM "DrawingObject"
        WHERE "sessionId" = $1
        ORDER BY "createdAt" ASC
      `,
      [sessionId]
    );

    return result.rows.map((row) => ({
      ...row,
      points: this.parseJson(row.points, row.points),
      levels: this.parseJson(row.levels),
      extensionLevels: this.parseJson(row.extensionLevels),
    }));
  }

  async saveDrawing(drawing: DrawingObject): Promise<void> {
    this.ensureInitialized();

    const now = new Date().toISOString();

    await this.pgPool!.query(
      `
        INSERT INTO "DrawingObject" (
          "id",
          "sessionId",
          "type",
          "points",
          "color",
          "strokeWidth",
          "fillColor",
          "opacity",
          "text",
          "fontSize",
          "levels",
          "extensionLevels",
          "locked",
          "visible",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16
        )
        ON CONFLICT ("id")
        DO UPDATE SET
          "sessionId" = EXCLUDED."sessionId",
          "type" = EXCLUDED."type",
          "points" = EXCLUDED."points",
          "color" = EXCLUDED."color",
          "strokeWidth" = EXCLUDED."strokeWidth",
          "fillColor" = EXCLUDED."fillColor",
          "opacity" = EXCLUDED."opacity",
          "text" = EXCLUDED."text",
          "fontSize" = EXCLUDED."fontSize",
          "levels" = EXCLUDED."levels",
          "extensionLevels" = EXCLUDED."extensionLevels",
          "locked" = EXCLUDED."locked",
          "visible" = EXCLUDED."visible",
          "updatedAt" = NOW()
      `,
      [
        drawing.id,
        drawing.sessionId,
        drawing.type,
        JSON.stringify(drawing.points),
        drawing.color,
        drawing.strokeWidth,
        drawing.fillColor ?? null,
        drawing.opacity ?? 0.2,
        drawing.text ?? null,
        drawing.fontSize ?? 12,
        drawing.levels != null
          ? JSON.stringify(drawing.levels)
          : null,
        drawing.extensionLevels != null
          ? JSON.stringify(drawing.extensionLevels)
          : null,
        drawing.locked ?? false,
        drawing.visible ?? true,
        drawing.createdAt || now,
        now,
      ]
    );
  }

  async saveAllDrawings(
    sessionId: string,
    drawings: DrawingObject[]
  ): Promise<void> {
    this.ensureInitialized();

    const client = await this.pgPool!.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `DELETE FROM "DrawingObject" WHERE "sessionId" = $1`,
        [sessionId]
      );

      for (const drawing of drawings) {
        const now = new Date().toISOString();

        await client.query(
          `
            INSERT INTO "DrawingObject" (
              "id",
              "sessionId",
              "type",
              "points",
              "color",
              "strokeWidth",
              "fillColor",
              "opacity",
              "text",
              "fontSize",
              "levels",
              "extensionLevels",
              "locked",
              "visible",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8,
              $9, $10, $11, $12, $13, $14, $15, $16
            )
          `,
          [
            drawing.id,
            sessionId,
            drawing.type,
            JSON.stringify(drawing.points),
            drawing.color,
            drawing.strokeWidth,
            drawing.fillColor ?? null,
            drawing.opacity ?? 0.2,
            drawing.text ?? null,
            drawing.fontSize ?? 12,
            drawing.levels != null
              ? JSON.stringify(drawing.levels)
              : null,
            drawing.extensionLevels != null
              ? JSON.stringify(drawing.extensionLevels)
              : null,
            drawing.locked ?? false,
            drawing.visible ?? true,
            drawing.createdAt || now,
            now,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteDrawing(id: string): Promise<void> {
    this.ensureInitialized();

    await this.pgPool!.query(
      `DELETE FROM "DrawingObject" WHERE "id" = $1`,
      [id]
    );
  }

  // ============================================================
  // CHART PREFERENCES
  // ============================================================

  async getPreference(
    sessionId: string
  ): Promise<ChartPreference | null> {
    this.ensureInitialized();

    const result = await this.pgPool!.query(
      `
        SELECT
          "id",
          "sessionId",
          "timezone",
          "showVolume",
          "volumeType",
          "volumeHeight",
          "indicators",
          "createdAt",
          "updatedAt"
        FROM "ChartPreference"
        WHERE "sessionId" = $1
      `,
      [sessionId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    return {
      ...row,
      indicators: this.parseJson(row.indicators, []),
    };
  }

  async savePreference(pref: ChartPreference): Promise<void> {
    this.ensureInitialized();

    const id = pref.id || randomUUID();

    await this.pgPool!.query(
      `
        INSERT INTO "ChartPreference" (
          "id",
          "sessionId",
          "timezone",
          "showVolume",
          "volumeType",
          "volumeHeight",
          "indicators",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
        )
        ON CONFLICT ("sessionId")
        DO UPDATE SET
          "timezone" = EXCLUDED."timezone",
          "showVolume" = EXCLUDED."showVolume",
          "volumeType" = EXCLUDED."volumeType",
          "volumeHeight" = EXCLUDED."volumeHeight",
          "indicators" = EXCLUDED."indicators",
          "updatedAt" = NOW()
      `,
      [
        id,
        pref.sessionId,
        pref.timezone || 'Asia/Jakarta',
        pref.showVolume ?? true,
        pref.volumeType || 'TICK',
        pref.volumeHeight ?? 0.18,
        JSON.stringify(pref.indicators || []),
      ]
    );
  }

  // ============================================================
  // DATABASE STATUS
  // ============================================================

  async getStatus() {
    const start = Date.now();

    try {
      this.ensureInitialized();

      await this.pgPool!.query('SELECT 1');

      const [
        datasetResult,
        candleResult,
        sessionResult,
        drawingResult,
        jobResult,
      ] = await Promise.all([
        this.pgPool!.query(
          `SELECT COUNT(*) AS count FROM "Dataset"`
        ),
        this.pgPool!.query(
          `SELECT COUNT(*) AS count FROM "Candle"`
        ),
        this.pgPool!.query(
          `SELECT COUNT(*) AS count FROM "BacktestSession"`
        ),
        this.pgPool!.query(
          `SELECT COUNT(*) AS count FROM "DrawingObject"`
        ),
        this.pgPool!.query(
          `SELECT COUNT(*) AS count FROM "DatasetImportJob"`
        ),
      ]);

      const datasetCount = Number(datasetResult.rows[0]?.count || 0);
      const candleCount = Number(candleResult.rows[0]?.count || 0);
      const sessionCount = Number(sessionResult.rows[0]?.count || 0);
      const drawingCount = Number(drawingResult.rows[0]?.count || 0);
      const jobCount = Number(jobResult.rows[0]?.count || 0);

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
    } catch (error: any) {
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
        error: error?.message || String(error),
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
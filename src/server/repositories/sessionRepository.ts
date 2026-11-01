
import type {
  RepositoryContext,
  SessionRecord,
} from './types.js';

export class SessionRepository {
  constructor(private readonly context: RepositoryContext) {}

  async saveSession(session: SessionRecord): Promise<void> {
    this.context.ensureInitialized();

    await this.context.getPool().query(
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
          "initialBalance",
          "currentBalance",
          "leverage",
          "status",
          "notes",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, $16, $17
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
          "initialBalance" = EXCLUDED."initialBalance",
          "currentBalance" = EXCLUDED."currentBalance",
          "leverage" = EXCLUDED."leverage",
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
        session.initialBalance,
        session.currentBalance,
        session.leverage,
        session.status,
        session.notes ?? null,
        session.createdAt,
        session.updatedAt,
      ]
    );
  }

  async getSession(id: string): Promise<any | null> {
    this.context.ensureInitialized();

    const pool = this.context.getPool();

    const result = await pool.query(
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
          s."initialBalance",
          s."currentBalance",
          s."leverage",
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

    const replayResult = await pool.query(
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
      initialBalance: Number(row.initialBalance),
      currentBalance: Number(row.currentBalance),
      leverage: Number(row.leverage),
      replayState: replay
        ? {
            ...replay,
            currentTime: Number(replay.currentTime),
          }
        : null,
    };
  }

  async getAllSessions(): Promise<any[]> {
    this.context.ensureInitialized();

    const result = await this.context.getPool().query(`
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
        s."initialBalance",
        s."currentBalance",
        s."leverage",
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
      initialBalance: Number(row.initialBalance),
      currentBalance: Number(row.currentBalance),
      leverage: Number(row.leverage),
    }));
  }

  async deleteSession(id: string): Promise<void> {
    this.context.ensureInitialized();

    // Data terkait ikut terhapus melalui foreign key ON DELETE CASCADE.
    await this.context.getPool().query(
      `DELETE FROM "BacktestSession" WHERE "id" = $1`,
      [id]
    );
  }
}

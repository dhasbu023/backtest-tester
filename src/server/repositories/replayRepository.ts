
import type {
  ReplayStateRecord,
  RepositoryContext,
} from './types.js';

export class ReplayRepository {
  constructor(private readonly context: RepositoryContext) {}

  async saveReplayState(state: ReplayStateRecord): Promise<void> {
    this.context.ensureInitialized();

    const client = await this.context.getPool().connect();

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
}

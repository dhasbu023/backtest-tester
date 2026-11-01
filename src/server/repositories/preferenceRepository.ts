
import { randomUUID } from 'node:crypto';

import type {
  ChartPreference,
  RepositoryContext,
} from './types.js';

export class PreferenceRepository {
  constructor(private readonly context: RepositoryContext) {}

  async getPreference(
    sessionId: string,
  ): Promise<ChartPreference | null> {
    this.context.ensureInitialized();

    const result = await this.context.getPool().query(
      `
        SELECT *
        FROM "ChartPreference"
        WHERE "sessionId" = $1
        LIMIT 1
      `,
      [sessionId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      ...row,
      indicators: this.context.parseJson(row.indicators, []),
    } as ChartPreference;
  }

  async savePreference(
    preference: ChartPreference,
  ): Promise<void> {
    this.context.ensureInitialized();

    const id = preference.id || randomUUID();

    await this.context.getPool().query(
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
        preference.sessionId,
        preference.timezone || 'Asia/Jakarta',
        preference.showVolume ?? true,
        preference.volumeType || 'TICK',
        preference.volumeHeight ?? 0.18,
        JSON.stringify(preference.indicators ?? []),
      ],
    );
  }
}

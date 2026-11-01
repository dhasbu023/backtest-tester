
import { randomUUID } from 'crypto';

import type { Candle } from '../../types/index.js';
import type { RepositoryContext } from './types.js';

export class CandleRepository {
  constructor(private readonly context: RepositoryContext) {}

  async getCandles(
    datasetId: string,
    maxTimestamp?: number,
    limit = 10000
  ): Promise<Candle[]> {
    this.context.ensureInitialized();

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

    const params: unknown[] = [datasetId];

    if (maxTimestamp !== undefined) {
      sql += ` AND "timestamp" <= $2`;
      params.push(maxTimestamp);
    }

    sql += ` ORDER BY "timestamp" ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.context.getPool().query(sql, params);

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
    this.context.ensureInitialized();

    if (!newCandles.length) return;

    const pool = this.context.getPool();
    const chunkSize = 500;

    for (let i = 0; i < newCandles.length; i += chunkSize) {
      const chunk = newCandles.slice(i, i + chunkSize);

      const valueClauses: string[] = [];
      const params: unknown[] = [];

      let parameterIndex = 1;

      for (const candle of chunk) {
        valueClauses.push(`
          (
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
          )
        `);

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

      await pool.query(
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
}

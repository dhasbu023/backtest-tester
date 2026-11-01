
import type {
  DatasetRecord,
  RepositoryContext,
} from './types.js';

export class DatasetRepository {
  constructor(private readonly context: RepositoryContext) {}

  async saveDataset(record: DatasetRecord): Promise<void> {
    this.context.ensureInitialized();

    await this.context.getPool().query(
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
    this.context.ensureInitialized();

    const result = await this.context.getPool().query(
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
    this.context.ensureInitialized();

    const result = await this.context.getPool().query(`
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
}

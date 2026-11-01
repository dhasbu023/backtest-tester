
import type {
  ImportJobRecord,
  RepositoryContext,
} from './types.js';

export class ImportJobRepository {
  constructor(private readonly context: RepositoryContext) {}

  async saveJob(job: ImportJobRecord): Promise<void> {
    this.context.ensureInitialized();

    await this.context.getPool().query(
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
    this.context.ensureInitialized();

    const result = await this.context.getPool().query(
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
}

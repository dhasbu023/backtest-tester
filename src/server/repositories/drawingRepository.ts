
import { randomUUID } from 'node:crypto';

import type {
  DrawingObject,
  RepositoryContext,
} from './types.js';

export class DrawingRepository {
  constructor(private readonly context: RepositoryContext) {}

  async getDrawings(sessionId: string): Promise<DrawingObject[]> {
    this.context.ensureInitialized();

    const result = await this.context.getPool().query(
      `
        SELECT *
        FROM "DrawingObject"
        WHERE "sessionId" = $1
        ORDER BY "createdAt" ASC
      `,
      [sessionId],
    );

    return result.rows.map((row) => ({
      ...row,
      points: this.context.parseJson(row.points, row.points),
      levels: this.context.parseJson(row.levels),
      extensionLevels: this.context.parseJson(row.extensionLevels),
    })) as DrawingObject[];
  }

  async saveDrawing(drawing: DrawingObject): Promise<void> {
    this.context.ensureInitialized();

    const now = new Date().toISOString();

    await this.context.getPool().query(
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
          "updatedAt" = EXCLUDED."updatedAt"
      `,
      [
        drawing.id || randomUUID(),
        drawing.sessionId,
        drawing.type,
        JSON.stringify(drawing.points),
        drawing.color,
        drawing.strokeWidth,
        drawing.fillColor ?? null,
        drawing.opacity ?? 0.2,
        drawing.text ?? null,
        drawing.fontSize ?? 12,
        JSON.stringify(drawing.levels ?? []),
        JSON.stringify(drawing.extensionLevels ?? []),
        drawing.locked ?? false,
        drawing.visible ?? true,
        drawing.createdAt ? new Date(drawing.createdAt) : new Date(now),
        new Date(now),
      ],
    );
  }

  async saveAllDrawings(
    sessionId: string,
    drawings: DrawingObject[],
  ): Promise<void> {
    this.context.ensureInitialized();

    const pool = this.context.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `
          DELETE FROM "DrawingObject"
          WHERE "sessionId" = $1
        `,
        [sessionId],
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
            drawing.id || randomUUID(),
            sessionId,
            drawing.type,
            JSON.stringify(drawing.points),
            drawing.color,
            drawing.strokeWidth,
            drawing.fillColor ?? null,
            drawing.opacity ?? 0.2,
            drawing.text ?? null,
            drawing.fontSize ?? 12,
            JSON.stringify(drawing.levels ?? []),
            JSON.stringify(drawing.extensionLevels ?? []),
            drawing.locked ?? false,
            drawing.visible ?? true,
            drawing.createdAt ? new Date(drawing.createdAt) : new Date(now),
            new Date(now),
          ],
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
    this.context.ensureInitialized();

    await this.context.getPool().query(
      `
        DELETE FROM "DrawingObject"
        WHERE "id" = $1
      `,
      [id],
    );
  }
}

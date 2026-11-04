
import type {
  BacktestOrder,
  CreateOrderInput,
  OrderFilter,
  OrderStatus,
} from '../../types/order.js';

import type { RepositoryContext } from './types.js';

type OrderQueryFilter = Omit<OrderFilter, 'sessionId'>;

type CloseOrderStatus =
  | 'CLOSED_TP'
  | 'CLOSED_SL'
  | 'CLOSED_MANUAL';

interface CloseOrderInput {
  closePrice: number;
  closeTime: number;
  status?: CloseOrderStatus;
}

interface OrderRow {
  id: string;
  sessionId: string;
  orderNumber: number | string;
  direction: string;
  orderType: string;
  status: string;
  lot: number | string;
  openPrice: number | string;
  stopLoss: number | string | null;
  takeProfit: number | string | null;
  closePrice: number | string | null;
  pnl: number | string;
  openTime: Date | string | null;
  closeTime: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class OrderRepository {
  constructor(private readonly context: RepositoryContext) {}

  /**
   * Mengubah nomor order menjadi format 001, 002, 003.
   */
  private formatOrderNumber(value: number): string {
    return String(value).padStart(3, '0');
  }

  /**
   * Membuat ID order berdasarkan ID session dan nomor order.
   */
  private generateOrderId(
    sessionId: string,
    orderNumber: number,
  ): string {
    return `${sessionId}-${this.formatOrderNumber(orderNumber)}`;
  }

  /**
   * Mengubah data PostgreSQL menjadi BacktestOrder.
   */
  private mapOrderRow(row: OrderRow): BacktestOrder {
    const toUnixTime = (
      value: Date | string | null,
    ): number | null => {
      if (value === null) return null;

      const date =
        value instanceof Date ? value : new Date(value);

      return Math.floor(date.getTime() / 1000);
    };

    return {
      id: row.id,
      sessionId: row.sessionId,
      orderNumber: Number(row.orderNumber),

      direction: row.direction as BacktestOrder['direction'],
      orderType: row.orderType as BacktestOrder['orderType'],
      status: row.status as BacktestOrder['status'],

      lot: Number(row.lot),
      openPrice: Number(row.openPrice),

      stopLoss:
        row.stopLoss === null ? null : Number(row.stopLoss),

      takeProfit:
        row.takeProfit === null ? null : Number(row.takeProfit),

      closePrice:
        row.closePrice === null ? null : Number(row.closePrice),

      pnl: Number(row.pnl),

      openTime: toUnixTime(row.openTime),
      closeTime: toUnixTime(row.closeTime),

      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  /**
   * Mengambil daftar order berdasarkan session.
   */
  async getOrders(
    sessionId: string,
    filter: OrderQueryFilter = {},
  ): Promise<BacktestOrder[]> {
    this.context.ensureInitialized();

    if (!sessionId) {
      throw new Error('Session ID wajib diisi.');
    }

    const conditions: string[] = ['"sessionId" = $1'];
    const values: unknown[] = [sessionId];

    if (filter.status) {
      if (Array.isArray(filter.status)) {
        if (filter.status.length > 0) {
          values.push(filter.status);

          conditions.push(
            `"status" = ANY($${values.length}::text[])`,
          );
        }
      } else {
        values.push(filter.status);
        conditions.push(`"status" = $${values.length}`);
      }
    }

    if (filter.direction) {
      values.push(filter.direction);
      conditions.push(`"direction" = $${values.length}`);
    }

    if (filter.orderType) {
      values.push(filter.orderType);
      conditions.push(`"orderType" = $${values.length}`);
    }

    const result = await this.context.getPool().query(
      `
        SELECT *
        FROM "BacktestOrder"
        WHERE ${conditions.join(' AND ')}
        ORDER BY "orderNumber" ASC, "createdAt" ASC
      `,
      values,
    );

    return result.rows.map((row: OrderRow) =>
      this.mapOrderRow(row),
    );
  }

  /**
   * Membuat order baru.
   */
  async createOrder(
    input: CreateOrderInput & {
      openTime?: number | null;
    },
  ): Promise<BacktestOrder> {
    this.context.ensureInitialized();

    if (!input.sessionId) {
      throw new Error('Session ID wajib diisi.');
    }

    if (!['BUY', 'SELL'].includes(input.direction)) {
      throw new Error('Direction harus BUY atau SELL.');
    }

    const allowedOrderTypes = [
      'MARKET',
      'BUY_LIMIT',
      'SELL_LIMIT',
      'BUY_STOP',
      'SELL_STOP',
    ];

    if (!allowedOrderTypes.includes(input.orderType)) {
      throw new Error('Tipe order tidak valid.');
    }

    if (!Number.isFinite(input.lot) || input.lot <= 0) {
      throw new Error('Lot harus lebih besar dari 0.');
    }

    if (
      !Number.isFinite(input.entryPrice) ||
      input.entryPrice <= 0
    ) {
      throw new Error('Entry price tidak valid.');
    }

    const stopLoss = input.stopLoss ?? null;
    const takeProfit = input.takeProfit ?? null;

    if (
      stopLoss !== null &&
      (!Number.isFinite(stopLoss) || stopLoss <= 0)
    ) {
      throw new Error('Stop Loss tidak valid.');
    }

    if (
      takeProfit !== null &&
      (!Number.isFinite(takeProfit) || takeProfit <= 0)
    ) {
      throw new Error('Take Profit tidak valid.');
    }

    const status: OrderStatus =
      input.orderType === 'MARKET' ? 'OPEN' : 'PENDING';

    const openTime =
      input.openTime == null
        ? null
        : new Date(input.openTime * 1000);

    if (
      openTime !== null &&
      !Number.isFinite(openTime.getTime())
    ) {
      throw new Error('Open time tidak valid.');
    }

    const client = await this.context.getPool().connect();

    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      const sessionResult = await client.query(
        `
          SELECT "id"
          FROM "BacktestSession"
          WHERE "id" = $1
          FOR UPDATE
        `,
        [input.sessionId],
      );

      if (sessionResult.rowCount === 0) {
        throw new Error('Backtest session tidak ditemukan.');
      }

      const numberResult = await client.query(
        `
          SELECT COALESCE(MAX("orderNumber"), 0) + 1 AS next_number
          FROM "BacktestOrder"
          WHERE "sessionId" = $1
        `,
        [input.sessionId],
      );

      const orderNumber = Number(
        numberResult.rows[0].next_number,
      );

      if (!Number.isInteger(orderNumber) || orderNumber < 1) {
        throw new Error('Gagal menentukan nomor order.');
      }

      const id = this.generateOrderId(
        input.sessionId,
        orderNumber,
      );

      const result = await client.query(
        `
          INSERT INTO "BacktestOrder" (
            "id",
            "sessionId",
            "orderNumber",
            "direction",
            "orderType",
            "lot",
            "openPrice",
            "stopLoss",
            "takeProfit",
            "closePrice",
            "status",
            "pnl",
            "openTime",
            "closeTime",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, NULL, $10, 0, $11, NULL, NOW(), NOW()
          )
          RETURNING *
        `,
        [
          id,
          input.sessionId,
          orderNumber,
          input.direction,
          input.orderType,
          input.lot,
          input.entryPrice,
          stopLoss,
          takeProfit,
          status,
          openTime,
        ],
      );

      await client.query('COMMIT');
      transactionStarted = false;

      return this.mapOrderRow(result.rows[0]);
    } catch (error) {
      if (transactionStarted) {
        await client.query('ROLLBACK');
      }

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Menutup order dan menyimpan hasilnya ke PostgreSQL.
   *
   * Perhitungan XAUUSD:
   * BUY  = (closePrice - openPrice) * 100 * lot
   * SELL = (openPrice - closePrice) * 100 * lot
   *
   * Hanya order OPEN yang dapat ditutup.
   */
  async closeOrder(
    orderId: string,
    input: CloseOrderInput,
  ): Promise<BacktestOrder> {
    this.context.ensureInitialized();

    if (!orderId) {
      throw new Error('Order ID wajib diisi.');
    }

    if (
      !Number.isFinite(input.closePrice) ||
      input.closePrice <= 0
    ) {
      throw new Error('Close price tidak valid.');
    }

    if (
      !Number.isFinite(input.closeTime) ||
      input.closeTime <= 0
    ) {
      throw new Error('Close time tidak valid.');
    }

    const allowedStatuses: CloseOrderStatus[] = [
      'CLOSED_TP',
      'CLOSED_SL',
      'CLOSED_MANUAL',
    ];

    const closeStatus = input.status ?? 'CLOSED_MANUAL';

    if (!allowedStatuses.includes(closeStatus)) {
      throw new Error('Status penutupan tidak valid.');
    }

    const closeDate = new Date(input.closeTime * 1000);

    if (!Number.isFinite(closeDate.getTime())) {
      throw new Error('Tanggal penutupan tidak valid.');
    }

    const client = await this.context.getPool().connect();

    try {
      await client.query('BEGIN');

      // Kunci order agar tidak ditutup dua kali bersamaan.
      const orderResult = await client.query(
        `
          SELECT *
          FROM "BacktestOrder"
          WHERE "id" = $1
          FOR UPDATE
        `,
        [orderId],
      );

      if (orderResult.rowCount === 0) {
        throw new Error('Order tidak ditemukan.');
      }

      const order = orderResult.rows[0] as OrderRow;

      // Jika sudah ditutup, kembalikan data yang sudah tersimpan.
      if (order.status !== 'OPEN') {
        await client.query('COMMIT');
        return this.mapOrderRow(order);
      }

      const lot = Number(order.lot);
      const openPrice = Number(order.openPrice);

      if (
        !Number.isFinite(lot) ||
        lot <= 0 ||
        !Number.isFinite(openPrice) ||
        openPrice <= 0
      ) {
        throw new Error('Data order tidak valid untuk dihitung.');
      }

      // Hitung PnL berdasarkan arah transaksi.
      const pnl =
        order.direction === 'BUY'
          ? (input.closePrice - openPrice) * 100 * lot
          : order.direction === 'SELL'
            ? (openPrice - input.closePrice) * 100 * lot
            : NaN;

      if (!Number.isFinite(pnl)) {
        throw new Error('Direction order tidak valid.');
      }

      const updateResult = await client.query(
        `
          UPDATE "BacktestOrder"
          SET
            "status" = $2,
            "closePrice" = $3,
            "closeTime" = $4,
            "pnl" = $5,
            "updatedAt" = NOW()
          WHERE "id" = $1
            AND "status" = 'OPEN'
          RETURNING *
        `,
        [
          orderId,
          closeStatus,
          input.closePrice,
          closeDate,
          pnl,
        ],
      );

      if (updateResult.rowCount === 0) {
        throw new Error('Order gagal ditutup.');
      }

      await client.query('COMMIT');

      return this.mapOrderRow(updateResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

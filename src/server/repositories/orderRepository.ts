
import type {
  BacktestOrder,
  CreateOrderInput,
  OrderFilter,
  OrderStatus,
} from '../../types/order.js';

import type { RepositoryContext } from './types.js';

type OrderQueryFilter = Omit<OrderFilter, 'sessionId'>;

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
   *
   * Contoh:
   * BTS-20261102-92365C858EC7-001
   * BTS-20261102-92365C858EC7-002
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

      // Nomor urut order dalam sesi.
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
   *
   * Fungsi ini hanya membaca data.
   * Tidak membuat order dan tidak menjalankan transaksi.
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

    // Filter berdasarkan status.
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

    // Filter berdasarkan arah BUY / SELL.
    if (filter.direction) {
      values.push(filter.direction);

      conditions.push(`"direction" = $${values.length}`);
    }

    // Filter berdasarkan jenis order.
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
   *
   * id digunakan sebagai ID terstruktur:
   * sessionId + nomor urut order.
   *
   * orderNumber digunakan sebagai nomor urut
   * dalam masing-masing session.
   */
  async createOrder(
    input: CreateOrderInput & {
      openTime?: number | null;
    },
  ): Promise<BacktestOrder> {
    this.context.ensureInitialized();

    // ==========================================
    // 1. VALIDASI INPUT
    // ==========================================

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

    // Pastikan tanggal valid.
    if (
      openTime !== null &&
      !Number.isFinite(openTime.getTime())
    ) {
      throw new Error('Open time tidak valid.');
    }

    // ==========================================
    // 2. SIAPKAN KONEKSI TRANSAKSI
    // ==========================================

    const client = await this.context.getPool().connect();

    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      // ========================================
      // 3. KUNCI SESSION
      // ========================================
      // Mencegah dua order dalam sesi yang sama
      // memperoleh nomor urut yang sama.

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

      // ========================================
      // 4. AMBIL NOMOR ORDER BERIKUTNYA
      // ========================================

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

      if (
        !Number.isInteger(orderNumber) ||
        orderNumber < 1
      ) {
        throw new Error('Gagal menentukan nomor order.');
      }

      // ========================================
      // 5. BUAT ID ORDER TERSTRUKTUR
      // ========================================

      const id = this.generateOrderId(
        input.sessionId,
        orderNumber,
      );

      // ========================================
      // 6. SIMPAN ORDER
      // ========================================

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

      // ========================================
      // 7. SELESAIKAN TRANSAKSI
      // ========================================

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
}

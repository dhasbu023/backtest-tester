
/**
 * Order Types
 * File: src/types/order.ts
 *
 * Definisi tipe data untuk sistem trading dan backtest.
 */

// ============================================
// ORDER DIRECTION
// ============================================

export type OrderDirection = 'BUY' | 'SELL';

// ============================================
// ORDER TYPE
// ============================================

export type OrderType =
  | 'MARKET'
  | 'BUY_LIMIT'
  | 'SELL_LIMIT'
  | 'BUY_STOP'
  | 'SELL_STOP';

// ============================================
// ORDER STATUS
// ============================================

export type OrderStatus =
  | 'PENDING'
  | 'OPEN'
  | 'CLOSED_TP'
  | 'CLOSED_SL'
  | 'CLOSED_MANUAL'
  | 'CANCELLED';

// ============================================
// ORDER EXECUTION TYPE
// ============================================

export type OrderExecutionType = 'MARKET' | 'PENDING';

// ============================================
// ORDER DATA
// ============================================

export interface BacktestOrder {
  id: string;

  sessionId: string;

  direction: OrderDirection;
  orderType: OrderType;
  status: OrderStatus;

  lot: number;

  // Harga order
  openPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  closePrice: number | null;

  // Hasil transaksi
  pnl: number;

  // Waktu dalam Unix timestamp (detik)
  openTime: number | null;
  closeTime: number | null;

  // Informasi tambahan
  comment?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// CREATE ORDER INPUT
// ============================================

export interface CreateOrderInput {
  sessionId: string;

  direction: OrderDirection;
  orderType: OrderType;

  lot: number;

  entryPrice: number;
  stopLoss?: number | null;
  takeProfit?: number | null;

  comment?: string;
}

// ============================================
// UPDATE ORDER INPUT
// ============================================

export interface UpdateOrderInput {
  lot?: number;

  entryPrice?: number;
  stopLoss?: number | null;
  takeProfit?: number | null;

  comment?: string;
}

// ============================================
// CLOSE ORDER INPUT
// ============================================

export interface CloseOrderInput {
  closePrice: number;
  closeTime: number;
}

// ============================================
// CANCEL ORDER INPUT
// ============================================

export interface CancelOrderInput {
  reason?: string;
}

// ============================================
// ORDER CALCULATION RESULT
// ============================================

export interface OrderCalculation {
  direction: OrderDirection;

  lot: number;

  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;

  riskAmount: number;
  rewardAmount: number;

  riskRewardRatio: number | null;

  requiredMargin: number;

  stopLossDistance: number;
  takeProfitDistance: number;
}

// ============================================
// ACCOUNT INFORMATION
// ============================================

export interface OrderAccountInfo {
  balance: number;
  equity: number;

  usedMargin: number;
  freeMargin: number;

  leverage: number;
}

// ============================================
// ORDER FILTER
// ============================================

export interface OrderFilter {
  sessionId: string;

  status?: OrderStatus | OrderStatus[];
  direction?: OrderDirection;
  orderType?: OrderType;
}

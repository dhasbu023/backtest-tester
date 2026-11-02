
/**
 * Order Calculator
 * File: src/utils/orderCalculator.ts
 *
 * Perhitungan khusus XAUUSD.
 *
 * Spesifikasi:
 * - 1 lot = 100 troy oz
 * - Akun menggunakan USD
 * - Leverage mengikuti BacktestSession
 */

// ============================================
// CONSTANTS
// ============================================

export const XAUUSD_CONTRACT_SIZE = 100;

export const DEFAULT_LEVERAGE = 500;

// ============================================
// TYPES
// ============================================

export interface CalculateOrderParams {
  direction: 'BUY' | 'SELL';

  lot: number;

  entryPrice: number;

  stopLoss?: number | null;
  takeProfit?: number | null;

  leverage: number;
}

export interface OrderCalculationResult {
  riskAmount: number;
  rewardAmount: number;

  riskRewardRatio: number | null;

  requiredMargin: number;

  stopLossDistance: number;
  takeProfitDistance: number;

  isValid: boolean;
  errors: string[];
}

// ============================================
// VALIDATION
// ============================================

export function validateOrderParams(
  params: CalculateOrderParams
): string[] {
  const errors: string[] = [];

  if (!Number.isFinite(params.lot) || params.lot <= 0) {
    errors.push('Volume lot harus lebih besar dari 0.');
  }

  if (
    !Number.isFinite(params.entryPrice) ||
    params.entryPrice <= 0
  ) {
    errors.push('Harga entry tidak valid.');
  }

  if (
    !Number.isFinite(params.leverage) ||
    params.leverage <= 0
  ) {
    errors.push('Leverage harus lebih besar dari 0.');
  }

  const { direction, entryPrice, stopLoss, takeProfit } = params;

  if (stopLoss != null) {
    if (!Number.isFinite(stopLoss) || stopLoss <= 0) {
      errors.push('Harga Stop Loss tidak valid.');
    } else if (
      direction === 'BUY' &&
      stopLoss >= entryPrice
    ) {
      errors.push('Stop Loss BUY harus di bawah harga entry.');
    } else if (
      direction === 'SELL' &&
      stopLoss <= entryPrice
    ) {
      errors.push('Stop Loss SELL harus di atas harga entry.');
    }
  }

  if (takeProfit != null) {
    if (!Number.isFinite(takeProfit) || takeProfit <= 0) {
      errors.push('Harga Take Profit tidak valid.');
    } else if (
      direction === 'BUY' &&
      takeProfit <= entryPrice
    ) {
      errors.push('Take Profit BUY harus di atas harga entry.');
    } else if (
      direction === 'SELL' &&
      takeProfit >= entryPrice
    ) {
      errors.push('Take Profit SELL harus di bawah harga entry.');
    }
  }

  return errors;
}

// ============================================
// CALCULATE PROFIT / LOSS
// ============================================

/**
 * Menghitung estimasi profit/loss XAUUSD.
 *
 * BUY:
 * (Close Price - Entry Price) * Contract Size * Lot
 *
 * SELL:
 * (Entry Price - Close Price) * Contract Size * Lot
 */
export function calculateProfitLoss(
  direction: 'BUY' | 'SELL',
  entryPrice: number,
  closePrice: number,
  lot: number
): number {
  if (
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(closePrice) ||
    !Number.isFinite(lot) ||
    lot <= 0
  ) {
    return 0;
  }

  const priceDifference =
    direction === 'BUY'
      ? closePrice - entryPrice
      : entryPrice - closePrice;

  return (
    priceDifference *
    XAUUSD_CONTRACT_SIZE *
    lot
  );
}

// ============================================
// CALCULATE STOP LOSS RISK
// ============================================

export function calculateRisk(
  direction: 'BUY' | 'SELL',
  entryPrice: number,
  stopLoss: number | null | undefined,
  lot: number
): number {
  if (stopLoss == null) {
    return 0;
  }

  const pnl = calculateProfitLoss(
    direction,
    entryPrice,
    stopLoss,
    lot
  );

  return Math.max(0, -pnl);
}

// ============================================
// CALCULATE TAKE PROFIT REWARD
// ============================================

export function calculateReward(
  direction: 'BUY' | 'SELL',
  entryPrice: number,
  takeProfit: number | null | undefined,
  lot: number
): number {
  if (takeProfit == null) {
    return 0;
  }

  const pnl = calculateProfitLoss(
    direction,
    entryPrice,
    takeProfit,
    lot
  );

  return Math.max(0, pnl);
}

// ============================================
// CALCULATE MARGIN
// ============================================

/**
 * Estimasi margin XAUUSD:
 *
 * (Entry Price * Contract Size * Lot) / Leverage
 *
 * Contoh:
 * Harga       = 4000
 * Lot         = 0.01
 * Contract    = 100
 * Leverage    = 500
 *
 * Margin      = $8
 */
export function calculateMargin(
  entryPrice: number,
  lot: number,
  leverage: number
): number {
  if (
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(lot) ||
    !Number.isFinite(leverage) ||
    entryPrice <= 0 ||
    lot <= 0 ||
    leverage <= 0
  ) {
    return 0;
  }

  return (
    entryPrice *
    XAUUSD_CONTRACT_SIZE *
    lot /
    leverage
  );
}

// ============================================
// CALCULATE RISK REWARD RATIO
// ============================================

export function calculateRiskRewardRatio(
  riskAmount: number,
  rewardAmount: number
): number | null {
  if (riskAmount <= 0) {
    return null;
  }

  return rewardAmount / riskAmount;
}

// ============================================
// MAIN ORDER CALCULATOR
// ============================================

export function calculateOrder(
  params: CalculateOrderParams
): OrderCalculationResult {
  const errors = validateOrderParams(params);

  if (errors.length > 0) {
    return {
      riskAmount: 0,
      rewardAmount: 0,
      riskRewardRatio: null,
      requiredMargin: 0,
      stopLossDistance: 0,
      takeProfitDistance: 0,
      isValid: false,
      errors,
    };
  }

  const {
    direction,
    lot,
    entryPrice,
    stopLoss,
    takeProfit,
    leverage,
  } = params;

  const riskAmount = calculateRisk(
    direction,
    entryPrice,
    stopLoss,
    lot
  );

  const rewardAmount = calculateReward(
    direction,
    entryPrice,
    takeProfit,
    lot
  );

  const requiredMargin = calculateMargin(
    entryPrice,
    lot,
    leverage
  );

  const stopLossDistance =
    stopLoss == null
      ? 0
      : Math.abs(entryPrice - stopLoss);

  const takeProfitDistance =
    takeProfit == null
      ? 0
      : Math.abs(entryPrice - takeProfit);

  return {
    riskAmount,
    rewardAmount,

    riskRewardRatio: calculateRiskRewardRatio(
      riskAmount,
      rewardAmount
    ),

    requiredMargin,

    stopLossDistance,
    takeProfitDistance,

    isValid: true,
    errors: [],
  };
}

// ============================================
// CALCULATE FLOATING PROFIT / LOSS
// ============================================

export function calculateFloatingPnL(
  direction: 'BUY' | 'SELL',
  entryPrice: number,
  currentPrice: number,
  lot: number
): number {
  return calculateProfitLoss(
    direction,
    entryPrice,
    currentPrice,
    lot
  );
}

// ============================================
// CALCULATE ACCOUNT EQUITY
// ============================================

export function calculateEquity(
  balance: number,
  floatingPnL: number
): number {
  return balance + floatingPnL;
}

// ============================================
// CALCULATE FREE MARGIN
// ============================================

export function calculateFreeMargin(
  equity: number,
  usedMargin: number
): number {
  return equity - usedMargin;
}

// ============================================
// FORMAT CURRENCY
// ============================================

export function formatMoney(
  value: number,
  currency = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

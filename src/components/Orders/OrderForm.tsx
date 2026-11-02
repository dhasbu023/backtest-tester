
import React, { useEffect, useMemo, useState } from 'react';

import type {
  CreateOrderInput,
  OrderDirection,
  OrderType,
} from '../../types/order';

import {
  calculateOrder,
  formatMoney,
} from '../../utils/orderCalculator';

import OrderTypeSelector from './OrderTypeSelector';

// ============================================
// CONSTANTS
// ============================================

// XAUUSD: 1 lot = 100 oz
const CONTRACT_SIZE = 100;

// ============================================
// TYPES
// ============================================

type TargetInputMode = 'PRICE' | 'USD';

// ============================================
// PROPS
// ============================================

interface OrderFormProps {
  sessionId: string;
  currentPrice: number;
  leverage: number;
  onSubmit: (input: CreateOrderInput) => Promise<unknown> | unknown;
  onCancel?: () => void;
  submitting?: boolean;
  initialDirection?: OrderDirection;
  initialOrderType?: OrderType;
}

// ============================================
// HELPERS
// ============================================

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return '';
  return value.toFixed(2);
}

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return '';
  return value.toFixed(2);
}

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === '') return null;

  return Number(value);
}

/**
 * Menghitung jarak harga berdasarkan nominal USD.
 *
 * Contoh:
 * USD 20 / (0.10 lot x 100) = 2.00
 */
function usdToPrice(
  amountUsd: number,
  direction: OrderDirection,
  targetType: 'SL' | 'TP',
  entryPrice: number,
  lot: number
): number | null {
  if (
    !Number.isFinite(amountUsd) ||
    amountUsd <= 0 ||
    !Number.isFinite(entryPrice) ||
    entryPrice <= 0 ||
    !Number.isFinite(lot) ||
    lot <= 0
  ) {
    return null;
  }

  const distance = amountUsd / (lot * CONTRACT_SIZE);

  let result: number;

  if (targetType === 'SL') {
    result =
      direction === 'BUY'
        ? entryPrice - distance
        : entryPrice + distance;
  } else {
    result =
      direction === 'BUY'
        ? entryPrice + distance
        : entryPrice - distance;
  }

  if (!Number.isFinite(result) || result <= 0) {
    return null;
  }

  return Number(result.toFixed(2));
}

/**
 * Menghitung estimasi nominal USD berdasarkan harga SL/TP.
 */
function priceToUsd(
  targetPrice: number | null,
  entryPrice: number,
  lot: number
): number | null {
  if (
    targetPrice === null ||
    !Number.isFinite(targetPrice) ||
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(lot) ||
    targetPrice <= 0 ||
    entryPrice <= 0 ||
    lot <= 0
  ) {
    return null;
  }

  return Math.abs(targetPrice - entryPrice) * lot * CONTRACT_SIZE;
}

function getPendingPriceError(
  direction: OrderDirection,
  orderType: OrderType,
  entryPrice: number,
  currentPrice: number
): string | null {
  if (orderType === 'MARKET') {
    return null;
  }

  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    return 'Harga replay saat ini tidak valid.';
  }

  if (orderType === 'BUY_LIMIT' && entryPrice >= currentPrice) {
    return 'Buy Limit harus berada di bawah harga sekarang.';
  }

  if (orderType === 'BUY_STOP' && entryPrice <= currentPrice) {
    return 'Buy Stop harus berada di atas harga sekarang.';
  }

  if (orderType === 'SELL_LIMIT' && entryPrice <= currentPrice) {
    return 'Sell Limit harus berada di atas harga sekarang.';
  }

  if (orderType === 'SELL_STOP' && entryPrice >= currentPrice) {
    return 'Sell Stop harus berada di bawah harga sekarang.';
  }

  if (
    (orderType === 'BUY_LIMIT' || orderType === 'BUY_STOP') &&
    direction !== 'BUY'
  ) {
    return 'Jenis pending order tidak sesuai dengan arah transaksi.';
  }

  if (
    (orderType === 'SELL_LIMIT' || orderType === 'SELL_STOP') &&
    direction !== 'SELL'
  ) {
    return 'Jenis pending order tidak sesuai dengan arah transaksi.';
  }

  return null;
}

function getUsdInputError(value: string, label: string): string | null {
  if (value.trim() === '') return null;

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return `${label} harus berupa nominal USD lebih dari 0.`;
  }

  return null;
}

// ============================================
// MODE SELECTOR
// ============================================

interface ModeSelectorProps {
  value: TargetInputMode;
  onChange: (mode: TargetInputMode) => void;
  disabled: boolean;
}

function ModeSelector({
  value,
  onChange,
  disabled,
}: ModeSelectorProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('PRICE')}
        className={[
          'rounded-md px-3 py-1.5 text-xs font-semibold transition',
          value === 'PRICE'
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
        ].join(' ')}
      >
        By Price
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('USD')}
        className={[
          'rounded-md px-3 py-1.5 text-xs font-semibold transition',
          value === 'USD'
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
        ].join(' ')}
      >
        By USD
      </button>
    </div>
  );
}

// ============================================
// COMPONENT
// ============================================

export default function OrderForm({
  sessionId,
  currentPrice,
  leverage,
  onSubmit,
  onCancel,
  submitting = false,
  initialDirection = 'BUY',
  initialOrderType = 'MARKET',
}: OrderFormProps) {
  const [direction, setDirection] =
    useState<OrderDirection>(initialDirection);

  const [orderType, setOrderType] =
    useState<OrderType>(initialOrderType);

  const [lot, setLot] = useState('0.01');

  const [entryPrice, setEntryPrice] = useState(
    formatPrice(currentPrice)
  );

  // Nilai harga SL dan TP
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  // Nilai USD SL dan TP
  const [stopLossUsd, setStopLossUsd] = useState('');
  const [takeProfitUsd, setTakeProfitUsd] = useState('');

  // Mode input SL dan TP terpisah
  const [stopLossMode, setStopLossMode] =
    useState<TargetInputMode>('PRICE');

  const [takeProfitMode, setTakeProfitMode] =
    useState<TargetInputMode>('PRICE');

  const [comment, setComment] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  const [submittingInternal, setSubmittingInternal] = useState(false);

  const isMarket = orderType === 'MARKET';

  const isBusy = submitting || submittingInternal;

  // ==========================================
  // UPDATE MARKET PRICE
  // ==========================================

  useEffect(() => {
    if (isMarket) {
      setEntryPrice(formatPrice(currentPrice));
    }
  }, [currentPrice, isMarket]);

  // ==========================================
  // PARSE VALUES
  // ==========================================

  const numericLot = Number(lot);

  const numericEntryPrice = isMarket
    ? currentPrice
    : Number(entryPrice);

  // ==========================================
  // CONVERT SL / TP
  // ==========================================

  const numericStopLoss = useMemo(() => {
    if (stopLossMode === 'PRICE') {
      return parseOptionalNumber(stopLoss);
    }

    if (stopLossUsd.trim() === '') {
      return null;
    }

    const amount = Number(stopLossUsd);

    if (!Number.isFinite(amount) || amount <= 0) {
      return Number.NaN;
    }

    const converted = usdToPrice(
      amount,
      direction,
      'SL',
      numericEntryPrice,
      numericLot
    );

    return converted ?? Number.NaN;
  }, [
    stopLossMode,
    stopLoss,
    stopLossUsd,
    direction,
    numericEntryPrice,
    numericLot,
  ]);

  const numericTakeProfit = useMemo(() => {
    if (takeProfitMode === 'PRICE') {
      return parseOptionalNumber(takeProfit);
    }

    if (takeProfitUsd.trim() === '') {
      return null;
    }

    const amount = Number(takeProfitUsd);

    if (!Number.isFinite(amount) || amount <= 0) {
      return Number.NaN;
    }

    const converted = usdToPrice(
      amount,
      direction,
      'TP',
      numericEntryPrice,
      numericLot
    );

    return converted ?? Number.NaN;
  }, [
    takeProfitMode,
    takeProfit,
    takeProfitUsd,
    direction,
    numericEntryPrice,
    numericLot,
  ]);

  // ==========================================
  // DISPLAY CONVERTED VALUES
  // ==========================================

  const estimatedStopLossUsd = priceToUsd(
    numericStopLoss,
    numericEntryPrice,
    numericLot
  );

  const estimatedTakeProfitUsd = priceToUsd(
    numericTakeProfit,
    numericEntryPrice,
    numericLot
  );

  // ==========================================
  // MODE CHANGE
  // ==========================================

  const changeStopLossMode = (nextMode: TargetInputMode) => {
    if (nextMode === stopLossMode) return;

    if (nextMode === 'USD') {
      const price = parseOptionalNumber(stopLoss);

      const amount = priceToUsd(
        price,
        numericEntryPrice,
        numericLot
      );

      setStopLossUsd(
        amount !== null ? formatAmount(amount) : ''
      );
    } else {
      const amount = parseOptionalNumber(stopLossUsd);

      if (amount !== null && amount > 0) {
        const converted = usdToPrice(
          amount,
          direction,
          'SL',
          numericEntryPrice,
          numericLot
        );

        setStopLoss(
          converted !== null ? formatPrice(converted) : ''
        );
      } else {
        setStopLoss('');
      }
    }

    setStopLossMode(nextMode);
  };

  const changeTakeProfitMode = (nextMode: TargetInputMode) => {
    if (nextMode === takeProfitMode) return;

    if (nextMode === 'USD') {
      const price = parseOptionalNumber(takeProfit);

      const amount = priceToUsd(
        price,
        numericEntryPrice,
        numericLot
      );

      setTakeProfitUsd(
        amount !== null ? formatAmount(amount) : ''
      );
    } else {
      const amount = parseOptionalNumber(takeProfitUsd);

      if (amount !== null && amount > 0) {
        const converted = usdToPrice(
          amount,
          direction,
          'TP',
          numericEntryPrice,
          numericLot
        );

        setTakeProfit(
          converted !== null ? formatPrice(converted) : ''
        );
      } else {
        setTakeProfit('');
      }
    }

    setTakeProfitMode(nextMode);
  };

  // ==========================================
  // CALCULATE ORDER
  // ==========================================

  const calculation = useMemo(() => {
    return calculateOrder({
      direction,
      lot: numericLot,
      entryPrice: numericEntryPrice,
      stopLoss: numericStopLoss,
      takeProfit: numericTakeProfit,
      leverage,
    });
  }, [
    direction,
    numericLot,
    numericEntryPrice,
    numericStopLoss,
    numericTakeProfit,
    leverage,
  ]);

  // ==========================================
  // VALIDATION
  // ==========================================

  const pendingPriceError = getPendingPriceError(
    direction,
    orderType,
    numericEntryPrice,
    currentPrice
  );

  const stopLossUsdError =
    stopLossMode === 'USD'
      ? getUsdInputError(stopLossUsd, 'Stop Loss')
      : null;

  const takeProfitUsdError =
    takeProfitMode === 'USD'
      ? getUsdInputError(takeProfitUsd, 'Take Profit')
      : null;

  const validationErrors = [
    ...calculation.errors,
    ...(pendingPriceError ? [pendingPriceError] : []),
    ...(stopLossUsdError ? [stopLossUsdError] : []),
    ...(takeProfitUsdError ? [takeProfitUsdError] : []),
    ...(!sessionId.trim() ? ['Session belum dipilih.'] : []),
  ];

  const canSubmit =
    validationErrors.length === 0 &&
    !isBusy &&
    Number.isFinite(numericEntryPrice) &&
    numericEntryPrice > 0 &&
    Number.isFinite(numericLot) &&
    numericLot > 0;

  // ==========================================
  // SUBMIT
  // ==========================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setFormError(null);

    if (!canSubmit) {
      setFormError(
        validationErrors[0] ?? 'Data order tidak valid.'
      );
      return;
    }

    const input: CreateOrderInput = {
      sessionId,
      direction,
      orderType,
      lot: numericLot,
      entryPrice: numericEntryPrice,
      stopLoss: numericStopLoss,
      takeProfit: numericTakeProfit,
      comment: comment.trim() || undefined,
    };

    setSubmittingInternal(true);

    try {
      await onSubmit(input);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Gagal membuat order.'
      );

      throw error;
    } finally {
      setSubmittingInternal(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ORDER TYPE */}

      <OrderTypeSelector
        direction={direction}
        orderType={orderType}
        onDirectionChange={setDirection}
        onOrderTypeChange={setOrderType}
        disabled={isBusy}
      />

    

      {/* LOT */}

      <div>
        <label
          htmlFor="order-lot"
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Volume (Lot)
        </label>

        <input
          id="order-lot"
          type="number"
          min="0.01"
          step="0.01"
          value={lot}
          disabled={isBusy}
          onChange={(event) => setLot(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          required
        />
      </div>

      {/* ENTRY PRICE */}

      <div>
        <label
          htmlFor="order-entry"
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Harga Entry
        </label>

        <input
          id="order-entry"
          type="number"
          min="0.01"
          step="0.01"
          value={entryPrice}
          disabled={isMarket || isBusy}
          onChange={(event) => setEntryPrice(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
          required
        />

        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {isMarket
            ? 'Market Order menggunakan harga replay saat ini.'
            : 'Masukkan harga aktivasi pending order.'}
        </p>

        {pendingPriceError && (
          <p className="mt-1 text-xs text-red-600">
            {pendingPriceError}
          </p>
        )}
      </div>

      {/* STOP LOSS */}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label
            htmlFor="order-sl"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Stop Loss
          </label>

          <ModeSelector
            value={stopLossMode}
            onChange={changeStopLossMode}
            disabled={isBusy}
          />
        </div>

        <div className="relative">
          <input
            id="order-sl"
            type="number"
            min="0.01"
            step="0.01"
            value={
              stopLossMode === 'PRICE'
                ? stopLoss
                : stopLossUsd
            }
            disabled={isBusy}
            onChange={(event) => {
              if (stopLossMode === 'PRICE') {
                setStopLoss(event.target.value);
              } else {
                setStopLossUsd(event.target.value);
              }
            }}
            placeholder={
              stopLossMode === 'PRICE'
                ? 'Masukkan harga SL'
                : 'Masukkan risiko USD'
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-14 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />

          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {stopLossMode === 'PRICE' ? 'Price' : 'USD'}
          </span>
        </div>

        {stopLossMode === 'USD' && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {numericStopLoss && Number.isFinite(numericStopLoss)
              ? `Harga SL otomatis: ${formatPrice(numericStopLoss)}`
              : 'Masukkan nominal risiko untuk menghitung harga SL.'}
          </p>
        )}

        {stopLossMode === 'PRICE' && estimatedStopLossUsd !== null && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Estimasi risiko: {formatMoney(estimatedStopLossUsd)}
          </p>
        )}

        {stopLossUsdError && (
          <p className="mt-1 text-xs text-red-600">
            {stopLossUsdError}
          </p>
        )}
      </div>

      {/* TAKE PROFIT */}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label
            htmlFor="order-tp"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Take Profit
          </label>

          <ModeSelector
            value={takeProfitMode}
            onChange={changeTakeProfitMode}
            disabled={isBusy}
          />
        </div>

        <div className="relative">
          <input
            id="order-tp"
            type="number"
            min="0.01"
            step="0.01"
            value={
              takeProfitMode === 'PRICE'
                ? takeProfit
                : takeProfitUsd
            }
            disabled={isBusy}
            onChange={(event) => {
              if (takeProfitMode === 'PRICE') {
                setTakeProfit(event.target.value);
              } else {
                setTakeProfitUsd(event.target.value);
              }
            }}
            placeholder={
              takeProfitMode === 'PRICE'
                ? 'Masukkan harga TP'
                : 'Masukkan target profit USD'
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-14 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />

          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {takeProfitMode === 'PRICE' ? 'Price' : 'USD'}
          </span>
        </div>

        {takeProfitMode === 'USD' && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {numericTakeProfit && Number.isFinite(numericTakeProfit)
              ? `Harga TP otomatis: ${formatPrice(numericTakeProfit)}`
              : 'Masukkan nominal target profit untuk menghitung harga TP.'}
          </p>
        )}

        {takeProfitMode === 'PRICE' && estimatedTakeProfitUsd !== null && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Estimasi profit: {formatMoney(estimatedTakeProfitUsd)}
          </p>
        )}

        {takeProfitUsdError && (
          <p className="mt-1 text-xs text-red-600">
            {takeProfitUsdError}
          </p>
        )}
      </div>


      {/* CALCULATION */}

      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Estimasi Order
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-gray-500 dark:text-gray-400">
              Estimasi risiko
            </span>

            <span className="font-semibold text-red-600">
              {formatMoney(-calculation.riskAmount)}
            </span>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-gray-500 dark:text-gray-400">
              Potensi profit
            </span>

            <span className="font-semibold text-green-600">
              {formatMoney(calculation.rewardAmount)}
            </span>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-gray-500 dark:text-gray-400">
              Risk / Reward
            </span>

            <span className="font-semibold text-gray-900 dark:text-white">
              {calculation.riskRewardRatio === null
                ? '-'
                : `1:${calculation.riskRewardRatio.toFixed(2)}`}
            </span>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-gray-500 dark:text-gray-400">
              Jarak SL
            </span>

            <span className="font-medium text-gray-900 dark:text-white">
              {formatPrice(calculation.stopLossDistance)}
            </span>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-gray-500 dark:text-gray-400">
              Jarak TP
            </span>

            <span className="font-medium text-gray-900 dark:text-white">
              {formatPrice(calculation.takeProfitDistance)}
            </span>
          </div>

          <div className="border-t border-gray-200 pt-2 dark:border-gray-700">
            <div className="flex justify-between gap-3">
              <span className="text-gray-500 dark:text-gray-400">
                Estimasi margin
              </span>

              <span className="font-bold text-gray-900 dark:text-white">
                {formatMoney(calculation.requiredMargin)}
              </span>
            </div>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leverage 1:{leverage}
            </p>
          </div>
        </div>
      </div>

      {/* VALIDATION ERROR */}

      {(formError || validationErrors.length > 0) && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {formError || validationErrors[0]}
        </div>
      )}

      {/* ACTIONS */}

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Batal
          </button>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={[
            'flex-1 rounded-lg px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50',
            direction === 'BUY'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-600 hover:bg-red-700',
          ].join(' ')}
        >
          {isBusy
            ? 'Memproses...'
            : isMarket
              ? `Buka ${direction}`
              : `Pasang ${orderType.replace('_', ' ')}`}
        </button>
      </div>
    </form>
  );
}

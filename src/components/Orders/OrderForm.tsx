
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

const CONTRACT_SIZE = 100;

type TargetInputMode = 'PRICE' | 'USD';

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
    result = direction === 'BUY'
      ? entryPrice - distance
      : entryPrice + distance;
  } else {
    result = direction === 'BUY'
      ? entryPrice + distance
      : entryPrice - distance;
  }

  if (!Number.isFinite(result) || result <= 0) {
    return null;
  }

  return Number(result.toFixed(2));
}

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
  if (orderType === 'MARKET') return null;

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
    <div className="inline-flex rounded-md border border-gray-200 bg-gray-100 p-0.5 dark:border-gray-700 dark:bg-gray-800">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('PRICE')}
        className={[
          'rounded px-2 py-1 text-[10px] font-semibold transition',
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
          'rounded px-2 py-1 text-[10px] font-semibold transition',
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

  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  const [stopLossUsd, setStopLossUsd] = useState('');
  const [takeProfitUsd, setTakeProfitUsd] = useState('');

  const [stopLossMode, setStopLossMode] =
    useState<TargetInputMode>('PRICE');

  const [takeProfitMode, setTakeProfitMode] =
    useState<TargetInputMode>('PRICE');

  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submittingInternal, setSubmittingInternal] = useState(false);

  // Estimasi disembunyikan secara default.
  const [showEstimate, setShowEstimate] = useState(false);

  const isMarket = orderType === 'MARKET';
  const isBusy = submitting || submittingInternal;

  useEffect(() => {
    if (isMarket) {
      setEntryPrice(formatPrice(currentPrice));
    }
  }, [currentPrice, isMarket]);

  const numericLot = Number(lot);

  const numericEntryPrice = isMarket
  ? currentPrice
  : Number(entryPrice);

// Menentukan jenis pending order secara otomatis.
const effectiveOrderType: OrderType = isMarket
  ? 'MARKET'
  : direction === 'BUY'
    ? numericEntryPrice < currentPrice
      ? 'BUY_LIMIT'
      : 'BUY_STOP'
    : numericEntryPrice > currentPrice
      ? 'SELL_LIMIT'
      : 'SELL_STOP';

  const numericStopLoss = useMemo(() => {
    if (stopLossMode === 'PRICE') {
      return parseOptionalNumber(stopLoss);
    }

    if (stopLossUsd.trim() === '') return null;

    const amount = Number(stopLossUsd);

    if (!Number.isFinite(amount) || amount <= 0) {
      return Number.NaN;
    }

    return usdToPrice(
      amount,
      direction,
      'SL',
      numericEntryPrice,
      numericLot
    ) ?? Number.NaN;
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

    if (takeProfitUsd.trim() === '') return null;

    const amount = Number(takeProfitUsd);

    if (!Number.isFinite(amount) || amount <= 0) {
      return Number.NaN;
    }

    return usdToPrice(
      amount,
      direction,
      'TP',
      numericEntryPrice,
      numericLot
    ) ?? Number.NaN;
  }, [
    takeProfitMode,
    takeProfit,
    takeProfitUsd,
    direction,
    numericEntryPrice,
    numericLot,
  ]);

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

  const changeStopLossMode = (nextMode: TargetInputMode) => {
    if (nextMode === stopLossMode) return;

    if (nextMode === 'USD') {
      const amount = priceToUsd(
        parseOptionalNumber(stopLoss),
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
      const amount = priceToUsd(
        parseOptionalNumber(takeProfit),
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

  const pendingPriceError = getPendingPriceError(
  direction,
  effectiveOrderType,
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
      orderType: effectiveOrderType,
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

  const inputClass = `
    w-full min-w-0 rounded-md border border-gray-300
    bg-white px-2.5 py-2 text-xs text-gray-900
    outline-none focus:border-blue-500
    focus:ring-1 focus:ring-blue-500/20
    disabled:cursor-not-allowed disabled:bg-gray-100
    dark:border-gray-700 dark:bg-gray-900
    dark:text-white dark:disabled:bg-gray-800
  `;

  const labelClass =
    'mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
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
        <label htmlFor="order-lot" className={labelClass}>
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
          className={inputClass}
          required
        />
      </div>


      {/* ENTRY PRICE - HANYA UNTUK PENDING ORDER */}

      {!isMarket && (
        <div>
          <label htmlFor="order-entry" className={labelClass}>
            Harga Entry
          </label>

          <input
            id="order-entry"
            type="number"
            min="0.01"
            step="0.01"
            value={entryPrice}
            disabled={isBusy}
            onChange={(event) => setEntryPrice(event.target.value)}
            className={inputClass}
            required
          />

          <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
            Masukkan harga aktivasi pending order.
          </p>

          {pendingPriceError && (
            <p className="mt-1 text-[10px] text-red-600">
              {pendingPriceError}
            </p>
          )}
        </div>
      )}

      {/* STOP LOSS & TAKE PROFIT - SEJAJAR */}

      <div className="grid grid-cols-2 gap-2">
        {/* STOP LOSS */}

        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
            <label htmlFor="order-sl" className={labelClass}>
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
                stopLossMode === 'PRICE' ? 'Harga SL' : 'Risiko USD'
              }
              className={`${inputClass} pr-10`}
            />

            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-400">
              {stopLossMode === 'PRICE' ? 'Price' : 'USD'}
            </span>
          </div>

          {stopLossMode === 'USD' && numericStopLoss !== null &&
            Number.isFinite(numericStopLoss) && (
              <p className="mt-1 text-[10px] text-gray-500">
                SL: {formatPrice(numericStopLoss)}
              </p>
            )}

          {stopLossMode === 'PRICE' && estimatedStopLossUsd !== null && (
            <p className="mt-1 text-[10px] text-gray-500">
              Risiko: {formatMoney(estimatedStopLossUsd)}
            </p>
          )}

          {stopLossUsdError && (
            <p className="mt-1 text-[10px] text-red-600">
              {stopLossUsdError}
            </p>
          )}
        </div>

        {/* TAKE PROFIT */}

        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
            <label htmlFor="order-tp" className={labelClass}>
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
                takeProfitMode === 'PRICE' ? 'Harga TP' : 'Target USD'
              }
              className={`${inputClass} pr-10`}
            />

            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-400">
              {takeProfitMode === 'PRICE' ? 'Price' : 'USD'}
            </span>
          </div>

          {takeProfitMode === 'USD' && numericTakeProfit !== null &&
            Number.isFinite(numericTakeProfit) && (
              <p className="mt-1 text-[10px] text-gray-500">
                TP: {formatPrice(numericTakeProfit)}
              </p>
            )}

          {takeProfitMode === 'PRICE' && estimatedTakeProfitUsd !== null && (
            <p className="mt-1 text-[10px] text-gray-500">
              Profit: {formatMoney(estimatedTakeProfitUsd)}
            </p>
          )}

          {takeProfitUsdError && (
            <p className="mt-1 text-[10px] text-red-600">
              {takeProfitUsdError}
            </p>
          )}
        </div>
      </div>

      {/* ESTIMASI ORDER - TOGGLE */}

      <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setShowEstimate((previous) => !previous)}
          aria-expanded={showEstimate}
          className="
            flex w-full items-center justify-between
            gap-2 px-3 py-2 text-left
            hover:bg-gray-50 dark:hover:bg-gray-900
          "
        >
          <span className="text-xs font-semibold text-gray-800 dark:text-white">
            Estimasi Order
          </span>

          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            {showEstimate ? 'Sembunyikan' : 'Tampilkan'}
            <span className="text-sm">
              {showEstimate ? '−' : '+'}
            </span>
          </span>
        </button>

        {showEstimate && (
          <div className="space-y-2 border-t border-gray-200 px-3 py-2.5 dark:border-gray-700">
            <div className="flex justify-between gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                Estimasi risiko
              </span>

              <span className="font-semibold text-red-600">
                {formatMoney(-calculation.riskAmount)}
              </span>
            </div>

            <div className="flex justify-between gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                Potensi profit
              </span>

              <span className="font-semibold text-green-600">
                {formatMoney(calculation.rewardAmount)}
              </span>
            </div>

            <div className="flex justify-between gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                Risk / Reward
              </span>

              <span className="font-semibold text-gray-900 dark:text-white">
                {calculation.riskRewardRatio === null
                  ? '-'
                  : `1:${calculation.riskRewardRatio.toFixed(2)}`}
              </span>
            </div>

            <div className="flex justify-between gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                Jarak SL
              </span>

              <span className="font-medium text-gray-900 dark:text-white">
                {formatPrice(calculation.stopLossDistance)}
              </span>
            </div>

            <div className="flex justify-between gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                Jarak TP
              </span>

              <span className="font-medium text-gray-900 dark:text-white">
                {formatPrice(calculation.takeProfitDistance)}
              </span>
            </div>

            <div className="flex justify-between gap-2 border-t border-gray-200 pt-2 text-xs dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">
                Estimasi margin
              </span>

              <span className="font-bold text-gray-900 dark:text-white">
                {formatMoney(calculation.requiredMargin)}
              </span>
            </div>

            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Leverage 1:{leverage}
            </p>
          </div>
        )}
      </div>

      {/* VALIDATION ERROR */}

      {(formError || validationErrors.length > 0) && (
        <div
          role="alert"
          className="
            rounded-md border border-red-200
            bg-red-50 p-2 text-xs text-red-700
            dark:border-red-900 dark:bg-red-950/40
            dark:text-red-300
          "
        >
          {formError || validationErrors[0]}
        </div>
      )}

      {/* ACTIONS */}

      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="
              flex-1 rounded-md border border-gray-300
              px-3 py-2 text-xs font-semibold
              text-gray-700 transition hover:bg-gray-50
              disabled:opacity-50 dark:border-gray-700
              dark:text-gray-300 dark:hover:bg-gray-800
            "
          >
            Batal
          </button>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={[
            'flex-1 rounded-md px-3 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50',
            direction === 'BUY'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-600 hover:bg-red-700',
          ].join(' ')}
        >
          {isBusy
            ? 'Memproses...'
            : isMarket
              ? `Buka ${direction}`
              : `Pasang ${effectiveOrderType.replace('_', ' ')}`}
        </button>
      </div>
    </form>
  );
}

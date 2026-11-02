
import React, { useEffect, useMemo, useState } from 'react';

import type {
  BacktestOrder,
  OrderStatus,
} from '../../types/order';

// ============================================
// CONFIGURATION XAUUSD
// ============================================

const CONTRACT_SIZE = 100;
const PIP_SIZE = 0.1;
const DEFAULT_LEVERAGE = 500;

// ============================================
// PROPS
// ============================================

interface OrderDetailModalProps {
  isOpen: boolean;
  order: BacktestOrder | null;
  onClose: () => void;
}

type DisplayMode = 'PRICE' | 'USD';

// ============================================
// HELPERS
// ============================================

function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '-';
  }

  return value.toFixed(2);
}

function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return '-';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '-';

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatDate(value: number | null | undefined): string {
  if (value == null) return '-';

  const date = new Date(value * 1000);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getStatus(status: OrderStatus) {
  const config: Record<
    OrderStatus,
    { label: string; className: string }
  > = {
    PENDING: {
      label: 'Pending',
      className:
        'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    },
    OPEN: {
      label: 'Open',
      className:
        'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    },
    CLOSED_TP: {
      label: 'Closed by Take Profit',
      className:
        'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
    },
    CLOSED_SL: {
      label: 'Closed by Stop Loss',
      className:
        'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    },
    CLOSED_MANUAL: {
      label: 'Closed Manually',
      className:
        'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    },
    CANCELLED: {
      label: 'Cancelled',
      className:
        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    },
  };

  return config[status] ?? {
    label: status,
    className:
      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
}

function getOrderTypeLabel(orderType: string): string {
  const labels: Record<string, string> = {
    MARKET: 'Market',
    BUY_LIMIT: 'Buy Limit',
    SELL_LIMIT: 'Sell Limit',
    BUY_STOP: 'Buy Stop',
    SELL_STOP: 'Sell Stop',
  };

  return labels[orderType] ?? orderType.replaceAll('_', ' ');
}

function getPnlClass(value: number): string {
  if (value > 0) return 'text-green-500';
  if (value < 0) return 'text-red-500';

  return 'text-gray-500 dark:text-gray-400';
}

// ============================================
// CALCULATION
// ============================================

interface DistanceResult {
  priceDistance: number;
  pips: number;
  percentage: number;
  estimatedUsd: number;
}

function calculateDistance(
  entryPrice: number,
  targetPrice: number | null,
  lot: number
): DistanceResult | null {
  if (
    targetPrice == null ||
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(targetPrice) ||
    !Number.isFinite(lot) ||
    entryPrice <= 0 ||
    lot <= 0
  ) {
    return null;
  }

  const priceDistance = Math.abs(targetPrice - entryPrice);

  const pips = priceDistance / PIP_SIZE;

  const percentage =
    (priceDistance / entryPrice) * 100;

  const estimatedUsd =
    priceDistance * lot * CONTRACT_SIZE;

  return {
    priceDistance,
    pips,
    percentage,
    estimatedUsd,
  };
}

// ============================================
// SMALL COMPONENTS
// ============================================

interface InfoItemProps {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}

function InfoItem({
  label,
  value,
  valueClassName = '',
}: InfoItemProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] text-gray-500 dark:text-gray-400">
        {label}
      </span>

      <span
        className={[
          'truncate text-sm font-semibold text-gray-900 dark:text-gray-100',
          valueClassName,
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================
// PRICE / USD DISPLAY
// ============================================

interface TradingLevelProps {
  label: string;
  price: number | null;
  entryPrice: number;
  lot: number;
  direction: 'BUY' | 'SELL';
  color: 'green' | 'red';
  mode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
}

function TradingLevel({
  label,
  price,
  entryPrice,
  lot,
  direction,
  color,
  mode,
  onModeChange,
}: TradingLevelProps) {
  const distance = calculateDistance(
    entryPrice,
    price,
    lot
  );

  const colorClass =
    color === 'green'
      ? 'text-green-500'
      : 'text-red-500';

  const backgroundClass =
    color === 'green'
      ? 'bg-green-500/10'
      : 'bg-red-500/10';

  const isAvailable = distance !== null;

  return (
    <div className="border-b border-gray-100 py-3 last:border-b-0 dark:border-gray-800">

      {/* HEADER */}

      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-bold ${colorClass}`}>
          {label}
        </span>

        <div className="flex items-center rounded-md bg-gray-100 p-0.5 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => onModeChange('PRICE')}
            className={[
              'rounded px-2.5 py-1 text-[10px] font-semibold transition',
              mode === 'PRICE'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 dark:text-gray-400',
            ].join(' ')}
          >
            By Price
          </button>

          <button
            type="button"
            onClick={() => onModeChange('USD')}
            className={[
              'rounded px-2.5 py-1 text-[10px] font-semibold transition',
              mode === 'USD'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 dark:text-gray-400',
            ].join(' ')}
          >
            By USD
          </button>
        </div>
      </div>

      {/* MAIN VALUE */}

      <div className="mt-2 flex items-center justify-between gap-3">
        <div>
          <div className={`text-lg font-bold tabular-nums ${colorClass}`}>
            {!isAvailable
              ? '-'
              : mode === 'PRICE'
                ? formatPrice(price)
                : formatMoney(distance.estimatedUsd)}
          </div>

          <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
            {mode === 'PRICE'
              ? 'Target Price'
              : 'Estimasi nilai USD'}
          </div>
        </div>

        {isAvailable && (
          <div className="text-right">
            <div className="text-sm font-semibold tabular-nums text-gray-800 dark:text-gray-200">
              {mode === 'PRICE'
                ? formatMoney(distance.estimatedUsd)
                : formatPrice(price)}
            </div>

            <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
              {mode === 'PRICE'
                ? 'Estimasi USD'
                : 'Target Price'}
            </div>
          </div>
        )}
      </div>

      {/* DISTANCE INFORMATION */}

      {isAvailable && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className={`rounded-md p-2 ${backgroundClass}`}>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">
              Jarak Harga
            </div>

            <div className={`mt-0.5 text-xs font-semibold ${colorClass}`}>
              {formatPrice(distance.priceDistance)}
            </div>
          </div>

          <div className={`rounded-md p-2 ${backgroundClass}`}>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">
              Jarak Pip
            </div>

            <div className={`mt-0.5 text-xs font-semibold ${colorClass}`}>
              {formatNumber(distance.pips, 1)} pips
            </div>
          </div>
        </div>
      )}

      {!isAvailable && (
        <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
          Belum ada harga {label}
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENT
// ============================================

export default function OrderDetailModal({
  isOpen,
  order,
  onClose,
}: OrderDetailModalProps) {
  const [showMore, setShowMore] = useState(false);

  const [slMode, setSlMode] = useState<DisplayMode>('PRICE');
  const [tpMode, setTpMode] = useState<DisplayMode>('PRICE');

  // ==========================================
  // RESET STATE
  // ==========================================

  useEffect(() => {
    setShowMore(false);
    setSlMode('PRICE');
    setTpMode('PRICE');
  }, [order?.id, isOpen]);

  // ==========================================
  // ESCAPE KEY
  // ==========================================

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // ==========================================
  // ORDER CALCULATIONS
  // ==========================================

  const calculated = useMemo(() => {
    if (!order) return null;

    const slDistance = calculateDistance(
      order.openPrice,
      order.stopLoss,
      order.lot
    );

    const tpDistance = calculateDistance(
      order.openPrice,
      order.takeProfit,
      order.lot
    );

    const riskReward =
      slDistance &&
      tpDistance &&
      slDistance.estimatedUsd > 0
        ? tpDistance.estimatedUsd / slDistance.estimatedUsd
        : null;

    const riskAmount = slDistance
      ? slDistance.estimatedUsd
      : null;

    const rewardAmount = tpDistance
      ? tpDistance.estimatedUsd
      : null;

    // Margin = Contract Size x Entry Price x Lot / Leverage
    const estimatedMargin =
      order.openPrice > 0 && order.lot > 0
        ? (CONTRACT_SIZE * order.openPrice * order.lot) /
          DEFAULT_LEVERAGE
        : null;

    return {
      slDistance,
      tpDistance,
      riskReward,
      riskAmount,
      rewardAmount,
      estimatedMargin,
    };
  }, [order]);

  if (!isOpen || !order || !calculated) {
    return null;
  }

  // ==========================================
  // ORDER INFORMATION
  // ==========================================

  const isBuy = order.direction === 'BUY';

  const status = getStatus(order.status);

  const directionClass = isBuy
    ? 'text-green-500'
    : 'text-red-500';

  const directionBg = isBuy
    ? 'bg-green-500/10 border-green-500/20'
    : 'bg-red-500/10 border-red-500/20';

  const pnlClass = getPnlClass(order.pnl);

  const isClosed = [
    'CLOSED_TP',
    'CLOSED_SL',
    'CLOSED_MANUAL',
  ].includes(order.status);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-3 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title"
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-[#111827]"
      >

        {/* ================================== */}
        {/* HEADER */}
        {/* ================================== */}

        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div className="min-w-0">
            <h2
              id="order-detail-title"
              className="text-sm font-bold text-gray-900 dark:text-white"
            >
              Order Details
            </h2>

            <p className="mt-0.5 truncate font-mono text-[10px] text-gray-500 dark:text-gray-400">
              #{order.id}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail order"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            ×
          </button>
        </div>

        {/* ================================== */}
        {/* BODY */}
        {/* ================================== */}

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">

          {/* SYMBOL / DIRECTION */}

          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                X
              </div>

              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  XAUUSD
                </div>

                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  Gold / US Dollar
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-md border px-2.5 py-1 text-xs font-bold ${directionBg} ${directionClass}`}
              >
                {order.direction}
              </span>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.className}`}
              >
                {status.label}
              </span>
            </div>
          </div>

          {/* ORDER TYPE / LOT */}

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/60">
            <InfoItem
              label="Order Type"
              value={getOrderTypeLabel(order.orderType)}
            />

            <InfoItem
              label="Volume"
              value={`${formatNumber(order.lot)} Lots`}
            />
          </div>

          {/* PROFIT / LOSS */}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/60">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isClosed
                  ? 'Realized Profit / Loss'
                  : 'Profit / Loss'}
              </span>

              <span
                className={`text-lg font-bold tabular-nums ${pnlClass}`}
              >
                {formatMoney(order.pnl)}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-200 pt-3 dark:border-gray-800">
              <InfoItem
                label="Open Price"
                value={formatPrice(order.openPrice)}
              />

              <InfoItem
                label="Close Price"
                value={formatPrice(order.closePrice)}
              />
            </div>
          </div>

          {/* ================================== */}
          {/* STOP LOSS / TAKE PROFIT */}
          {/* ================================== */}

          <section>
            <h3 className="mb-2 text-xs font-bold text-gray-900 dark:text-white">
              Trading Levels
            </h3>

            <div className="rounded-lg border border-gray-200 px-3 dark:border-gray-800">

              {/* TAKE PROFIT */}

              <TradingLevel
                label="Take Profit"
                price={order.takeProfit}
                entryPrice={order.openPrice}
                lot={order.lot}
                direction={order.direction}
                color="green"
                mode={tpMode}
                onModeChange={setTpMode}
              />

              {/* ENTRY PRICE */}

              <div className="flex items-center justify-between border-b border-gray-100 py-3 dark:border-gray-800">
                <div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Entry Price
                  </div>

                  <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                    Harga pembukaan order
                  </div>
                </div>

                <div className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                  {formatPrice(order.openPrice)}
                </div>
              </div>

              {/* STOP LOSS */}

              <TradingLevel
                label="Stop Loss"
                price={order.stopLoss}
                entryPrice={order.openPrice}
                lot={order.lot}
                direction={order.direction}
                color="red"
                mode={slMode}
                onModeChange={setSlMode}
              />
            </div>
          </section>

          {/* ================================== */}
          {/* ESTIMATED ORDER */}
          {/* ================================== */}

          <section className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">

            <h3 className="mb-3 text-xs font-bold text-gray-900 dark:text-white">
              Estimasi Order
            </h3>

            {/* RISK / REWARD */}

            <div className="grid grid-cols-2 gap-2">

              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                  Estimasi Risiko
                </div>

                <div className="mt-1 text-base font-bold tabular-nums text-red-500">
                  {calculated.riskAmount !== null
                    ? formatMoney(-calculated.riskAmount)
                    : '-'}
                </div>
              </div>

              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                  Potensi Profit
                </div>

                <div className="mt-1 text-base font-bold tabular-nums text-green-500">
                  {calculated.rewardAmount !== null
                    ? formatMoney(calculated.rewardAmount)
                    : '-'}
                </div>
              </div>
            </div>

            {/* RR */}

            <div className="mt-3 flex items-center justify-between border-b border-gray-100 py-2.5 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Risk / Reward
              </span>

              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {calculated.riskReward !== null
                  ? `1 : ${formatNumber(calculated.riskReward)}`
                  : '-'}
              </span>
            </div>

            {/* DISTANCE */}

            <div className="grid grid-cols-2 gap-3 border-b border-gray-100 py-3 dark:border-gray-800">
              <InfoItem
                label="Jarak SL"
                value={
                  calculated.slDistance
                    ? `${formatNumber(calculated.slDistance.pips, 1)} pips`
                    : '0.00'
                }
                valueClassName="text-red-500"
              />

              <InfoItem
                label="Jarak TP"
                value={
                  calculated.tpDistance
                    ? `${formatNumber(calculated.tpDistance.pips, 1)} pips`
                    : '0.00'
                }
                valueClassName="text-green-500"
              />
            </div>

            {/* MARGIN */}

            <div className="flex items-center justify-between py-3">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Estimasi Margin
                </div>

                <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                  Leverage 1:{DEFAULT_LEVERAGE}
                </div>
              </div>

              <div className="text-base font-bold tabular-nums text-gray-900 dark:text-white">
                {calculated.estimatedMargin !== null
                  ? formatMoney(calculated.estimatedMargin)
                  : '-'}
              </div>
            </div>

          </section>

          {/* ================================== */}
          {/* MORE DETAILS */}
          {/* ================================== */}

          <section className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setShowMore((previous) => !previous)}
              aria-expanded={showMore}
              className="flex w-full items-center justify-between px-3 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <div>
                <div className="text-xs font-bold text-gray-900 dark:text-white">
                  More Details
                </div>

                <div className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                  Informasi transaksi
                </div>
              </div>

              <span className="text-sm text-gray-500">
                {showMore ? '−' : '+'}
              </span>
            </button>

            {showMore && (
              <div className="space-y-3 border-t border-gray-200 p-3 dark:border-gray-800">

                <InfoItem
                  label="Open Time"
                  value={formatDate(order.openTime)}
                />

                <InfoItem
                  label="Close Time"
                  value={formatDate(order.closeTime)}
                />

                <InfoItem
                  label="Session ID"
                  value={order.sessionId}
                />

              </div>
            )}
          </section>
        </div>

        {/* ================================== */}
        {/* FOOTER */}
        {/* ================================== */}

        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}


import React from 'react';

import type {
  BacktestOrder,
  OrderStatus,
  OrderType,
} from '../../types/order';

// ============================================
// PROPS
// ============================================

interface OrderTableProps {
  orders: BacktestOrder[];

  loading?: boolean;

  onDetail?: (order: BacktestOrder) => void;

  onEdit?: (order: BacktestOrder) => void;

  onCancel?: (order: BacktestOrder) => void;

  onClose?: (order: BacktestOrder) => void;
}

// ============================================
// FORMAT HELPERS
// ============================================

function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '-';
  }

  return value.toFixed(2);
}

function formatLot(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '-';
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

function formatTime(value: number | null): string {
  if (value == null || !Number.isFinite(value)) {
    return '-';
  }

  // openTime dan closeTime menggunakan Unix timestamp detik.
  const date = new Date(value * 1000);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getOrderTypeLabel(type: OrderType): string {
  const labels: Record<OrderType, string> = {
    MARKET: 'Market',
    BUY_LIMIT: 'Buy Limit',
    SELL_LIMIT: 'Sell Limit',
    BUY_STOP: 'Buy Stop',
    SELL_STOP: 'Sell Stop',
  };

  return labels[type];
}

// ============================================
// STATUS CONFIGURATION
// ============================================

function getStatusConfig(status: OrderStatus): {
  label: string;
  className: string;
} {
  const configs: Record<
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
      label: 'Closed TP',
      className:
        'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
    },

    CLOSED_SL: {
      label: 'Closed SL',
      className:
        'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    },

    CLOSED_MANUAL: {
      label: 'Closed Manual',
      className:
        'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    },

    CANCELLED: {
      label: 'Cancelled',
      className:
        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    },
  };

  return configs[status];
}

// ============================================
// COMPONENT
// ============================================

export default function OrderTable({
  orders,
  loading = false,
  onDetail,
  onEdit,
  onCancel,
  onClose,
}: OrderTableProps) {
  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500 dark:text-gray-400">
        Memuat data order...
      </div>
    );
  }

  // ==========================================
  // EMPTY
  // ==========================================

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 px-4 py-12 text-center dark:border-gray-700">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Belum ada order
        </div>

        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Order yang dibuat akan muncul di sini.
        </p>
      </div>
    );
  }

  // ==========================================
  // TABLE
  // ==========================================

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">
              ID Order
            </th>

            <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">
              Waktu
            </th>

            <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">
              Tipe
            </th>

            <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">
              Arah
            </th>

            <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">
              Lot
            </th>

            <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">
              Entry
            </th>

            <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">
              SL
            </th>

            <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">
              TP
            </th>

            <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">
              Close
            </th>

            <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">
              P/L
            </th>

            <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">
              Status
            </th>

            <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">
              Aksi
            </th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order) => {
            const status = getStatusConfig(order.status);

            const isBuy = order.direction === 'BUY';

            const isOpen = order.status === 'OPEN';

            const isPending = order.status === 'PENDING';

            const isClosed =
              order.status === 'CLOSED_TP' ||
              order.status === 'CLOSED_SL' ||
              order.status === 'CLOSED_MANUAL';

            return (
              <tr
                key={order.id}
                className="border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/60"
              >
                {/* ID */}
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onDetail?.(order)}
                    className="font-mono text-xs text-blue-600 hover:underline dark:text-blue-400"
                    title="Lihat detail order"
                  >
                    {order.id.length > 14
                      ? `${order.id.slice(0, 14)}...`
                      : order.id}
                  </button>
                </td>

                {/* TIME */}
                <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                  {formatTime(
                    isClosed ? order.closeTime : order.openTime
                  )}
                </td>

                {/* TYPE */}
                <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                  {getOrderTypeLabel(order.orderType)}
                </td>

                {/* DIRECTION */}
                <td className="px-4 py-3">
                  <span
                    className={[
                      'font-semibold',
                      isBuy ? 'text-green-600' : 'text-red-600',
                    ].join(' ')}
                  >
                    {order.direction}
                  </span>
                </td>

                {/* LOT */}
                <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                  {formatLot(order.lot)}
                </td>

                {/* ENTRY */}
                <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                  {formatPrice(order.openPrice)}
                </td>

                {/* SL */}
                <td className="px-4 py-3 text-right tabular-nums text-red-600">
                  {formatPrice(order.stopLoss)}
                </td>

                {/* TP */}
                <td className="px-4 py-3 text-right tabular-nums text-green-600">
                  {formatPrice(order.takeProfit)}
                </td>

                {/* CLOSE */}
                <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                  {formatPrice(order.closePrice)}
                </td>

                {/* PNL */}
                <td className="px-4 py-3 text-right tabular-nums">
                  <span
                    className={[
                      'font-semibold',
                      order.pnl > 0
                        ? 'text-green-600'
                        : order.pnl < 0
                          ? 'text-red-600'
                          : 'text-gray-500',
                    ].join(' ')}
                  >
                    {formatMoney(order.pnl)}
                  </span>
                </td>

                {/* STATUS */}
                <td className="px-4 py-3">
                  <span
                    className={[
                      'inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
                      status.className,
                    ].join(' ')}
                  >
                    {status.label}
                  </span>
                </td>

                {/* ACTIONS */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {onDetail && (
                      <button
                        type="button"
                        onClick={() => onDetail(order)}
                        title="Detail"
                        className="rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        Detail
                      </button>
                    )}

                    {isPending && onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(order)}
                        title="Edit pending order"
                        className="rounded-md px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                      >
                        Edit
                      </button>
                    )}

                    {isPending && onCancel && (
                      <button
                        type="button"
                        onClick={() => onCancel(order)}
                        title="Batalkan pending order"
                        className="rounded-md px-2 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
                      >
                        Cancel
                      </button>
                    )}

                    {isOpen && onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(order)}
                        title="Ubah SL/TP"
                        className="rounded-md px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                      >
                        Edit
                      </button>
                    )}

                    {isOpen && onClose && (
                      <button
                        type="button"
                        onClick={() => onClose(order)}
                        title="Tutup posisi"
                        className="rounded-md px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* FOOTER */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Total {orders.length} order
      </div>
    </div>
  );
}

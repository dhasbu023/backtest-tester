
import React, { useMemo, useState } from 'react';

import type {
  BacktestOrder,
  OrderStatus,
} from '../../types/order';

import OrderTable from './OrderTable';

type HistoryFilter =
  | 'ALL'
  | 'CLOSED_TP'
  | 'CLOSED_SL'
  | 'CLOSED_MANUAL'
  | 'CANCELLED';

interface OrderHistoryProps {
  orders: BacktestOrder[];
  loading?: boolean;

  onDetail?: (order: BacktestOrder) => void;
  onRefresh?: () => void;
}

const HISTORY_STATUSES: OrderStatus[] = [
  'CLOSED_TP',
  'CLOSED_SL',
  'CLOSED_MANUAL',
  'CANCELLED',
];

export default function OrderHistory({
  orders,
  loading = false,
  onDetail,
  onRefresh,
}: OrderHistoryProps) {
  const [activeFilter, setActiveFilter] =
    useState<HistoryFilter>('ALL');

  // ==========================================
  // FILTER HISTORY
  // ==========================================

  const historyOrders = useMemo(
    () =>
      orders.filter((order) =>
        HISTORY_STATUSES.includes(order.status)
      ),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'ALL') {
      return historyOrders;
    }

    return historyOrders.filter(
      (order) => order.status === activeFilter
    );
  }, [historyOrders, activeFilter]);

  // ==========================================
  // SUMMARY
  // ==========================================

  const summary = useMemo(() => {
    const closedOrders = historyOrders.filter(
      (order) => order.status !== 'CANCELLED'
    );

    const cancelledOrders = historyOrders.filter(
      (order) => order.status === 'CANCELLED'
    );

    const totalPnl = closedOrders.reduce(
      (total, order) => total + (order.pnl || 0),
      0
    );

    const wins = closedOrders.filter(
      (order) => order.pnl > 0
    ).length;

    const losses = closedOrders.filter(
      (order) => order.pnl < 0
    ).length;

    return {
      total: historyOrders.length,
      closed: closedOrders.length,
      cancelled: cancelledOrders.length,
      wins,
      losses,
      totalPnl,
    };
  }, [historyOrders]);

  const pnlColor =
    summary.totalPnl > 0
      ? 'text-green-600'
      : summary.totalPnl < 0
        ? 'text-red-600'
        : 'text-gray-500';

  // ==========================================
  // FILTER CONFIGURATION
  // ==========================================

  const filters: {
    id: HistoryFilter;
    label: string;
    count: number;
  }[] = [
    {
      id: 'ALL',
      label: 'All',
      count: summary.total,
    },
    {
      id: 'CLOSED_TP',
      label: 'Take Profit',
      count: historyOrders.filter(
        (order) => order.status === 'CLOSED_TP'
      ).length,
    },
    {
      id: 'CLOSED_SL',
      label: 'Stop Loss',
      count: historyOrders.filter(
        (order) => order.status === 'CLOSED_SL'
      ).length,
    },
    {
      id: 'CLOSED_MANUAL',
      label: 'Manual',
      count: historyOrders.filter(
        (order) => order.status === 'CLOSED_MANUAL'
      ).length,
    },
    {
      id: 'CANCELLED',
      label: 'Cancelled',
      count: summary.cancelled,
    },
  ];

  return (
    <section className="w-full space-y-4">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Trading History
          </h2>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Riwayat transaksi yang sudah ditutup atau dibatalkan.
          </p>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {loading ? 'Memuat...' : 'Refresh'}
          </button>
        )}
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Closed Trades
          </div>
          <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
            {summary.closed}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Total P/L
          </div>
          <div className={`mt-1 text-lg font-bold tabular-nums ${pnlColor}`}>
            {summary.totalPnl >= 0 ? '+' : '-'}$
            {Math.abs(summary.totalPnl).toFixed(2)}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Winning Trades
          </div>
          <div className="mt-1 text-lg font-bold text-green-600">
            {summary.wins}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Losing Trades
          </div>
          <div className="mt-1 text-lg font-bold text-red-600">
            {summary.losses}
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {filters.map((filter) => {
          const active = activeFilter === filter.id;

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={[
                'flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition',
                active
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
              ].join(' ')}
            >
              {filter.label}

              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {filter.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TABLE */}
      <OrderTable
        orders={filteredOrders}
        loading={loading}
        onDetail={onDetail}
      />

      {/* FOOTER */}
      {!loading && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Menampilkan {filteredOrders.length} dari {summary.total} transaksi.
        </div>
      )}
    </section>
  );
}

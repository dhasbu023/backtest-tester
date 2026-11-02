
import React, { useMemo, useState } from 'react';

import type {
  BacktestOrder,
} from '../../types/order';

import OrderTable from './OrderTable';

// ============================================
// TYPES
// ============================================

type OrderTab = 'ALL' | 'OPEN' | 'PENDING' | 'HISTORY';

interface OrderListProps {
  orders: BacktestOrder[];

  loading?: boolean;
  error?: string | null;

  onDetail?: (order: BacktestOrder) => void;
  onEdit?: (order: BacktestOrder) => void;
  onCancel?: (order: BacktestOrder) => void;
  onClose?: (order: BacktestOrder) => void;

  onRefresh?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export default function OrderList({
  orders,
  loading = false,
  error = null,
  onDetail,
  onEdit,
  onCancel,
  onClose,
  onRefresh,
}: OrderListProps) {
  const [activeTab, setActiveTab] = useState<OrderTab>('ALL');

  // ==========================================
  // FILTER ORDERS
  // ==========================================

  const filteredOrders = useMemo(() => {
    switch (activeTab) {
      case 'OPEN':
        return orders.filter(
          (order) => order.status === 'OPEN'
        );

      case 'PENDING':
        return orders.filter(
          (order) => order.status === 'PENDING'
        );

      case 'HISTORY':
        return orders.filter(
          (order) =>
            order.status === 'CLOSED_TP' ||
            order.status === 'CLOSED_SL' ||
            order.status === 'CLOSED_MANUAL' ||
            order.status === 'CANCELLED'
        );

      case 'ALL':
      default:
        return orders;
    }
  }, [orders, activeTab]);

  // ==========================================
  // COUNTS
  // ==========================================

  const counts = useMemo(() => {
    return {
      all: orders.length,

      open: orders.filter(
        (order) => order.status === 'OPEN'
      ).length,

      pending: orders.filter(
        (order) => order.status === 'PENDING'
      ).length,

      history: orders.filter(
        (order) =>
          order.status === 'CLOSED_TP' ||
          order.status === 'CLOSED_SL' ||
          order.status === 'CLOSED_MANUAL' ||
          order.status === 'CANCELLED'
      ).length,
    };
  }, [orders]);

  // ==========================================
  // TAB CONFIGURATION
  // ==========================================

  const tabs: {
    id: OrderTab;
    label: string;
    count: number;
  }[] = [
    {
      id: 'ALL',
      label: 'All Orders',
      count: counts.all,
    },
    {
      id: 'OPEN',
      label: 'Open Positions',
      count: counts.open,
    },
    {
      id: 'PENDING',
      label: 'Pending Orders',
      count: counts.pending,
    },
    {
      id: 'HISTORY',
      label: 'History',
      count: counts.history,
    },
  ];

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <section className="w-full space-y-4">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Trading Orders
          </h2>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Kelola posisi aktif, pending order, dan riwayat transaksi.
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

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition',
                active
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
              ].join(' ')}
            >
              {tab.label}

              <span
                className={[
                  'rounded-full px-2 py-0.5 text-[10px]',
                  active
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                ].join(' ')}
              >
                {tab.count}
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
        onEdit={onEdit}
        onCancel={onCancel}
        onClose={onClose}
      />

      {/* FOOTER */}
      {!loading && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Menampilkan {filteredOrders.length} dari {orders.length} order
          </span>

          <span>
            {counts.open} posisi aktif · {counts.pending} pending
          </span>
        </div>
      )}
    </section>
  );
}

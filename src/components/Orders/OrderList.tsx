
import { useMemo, useState } from 'react';

import type { BacktestOrder } from '../../types/order';
import OrderTable from './OrderTable';

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

export default function OrderList({
  orders,
  loading = false,
  error = null,
  onDetail,
  onEdit,
  onCancel,
  onClose,
}: OrderListProps) {
  const [activeTab, setActiveTab] = useState<OrderTab>('ALL');

  const historyStatuses = [
    'CLOSED_TP',
    'CLOSED_SL',
    'CLOSED_MANUAL',
    'CANCELLED',
  ];

  const filteredOrders = useMemo(() => {
    switch (activeTab) {
      case 'OPEN':
        return orders.filter(order => order.status === 'OPEN');

      case 'PENDING':
        return orders.filter(order => order.status === 'PENDING');

      case 'HISTORY':
        return orders.filter(order =>
          historyStatuses.includes(order.status)
        );

      default:
        return orders;
    }
  }, [orders, activeTab]);

  const counts = useMemo(() => ({
    all: orders.length,
    open: orders.filter(order => order.status === 'OPEN').length,
    pending: orders.filter(order => order.status === 'PENDING').length,
    history: orders.filter(order =>
      historyStatuses.includes(order.status)
    ).length,
  }), [orders]);

  const tabs: {
    id: OrderTab;
    label: string;
    count: number;
  }[] = [
    { id: 'ALL', label: 'All Orders', count: counts.all },
    { id: 'OPEN', label: 'Open Positions', count: counts.open },
    { id: 'PENDING', label: 'Pending Orders', count: counts.pending },
    { id: 'HISTORY', label: 'History', count: counts.history },
  ];

  return (
    <section
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
      style={{
        minWidth: 0,
        contain: 'layout',
      }}
    >
      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="mb-3 shrink-0 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {/* TABS */}
      <div className="mb-3 shrink-0 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => {
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
      </div>

      {/* TABLE SCROLL */}
      <div
        className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain"
        style={{
          scrollbarGutter: 'stable',
        }}
      >
        <OrderTable
          orders={filteredOrders}
          loading={loading}
          onDetail={onDetail}
          onEdit={onEdit}
          onCancel={onCancel}
          onClose={onClose}
        />
      </div>

      {/* FOOTER */}
      {!loading && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-200 bg-white py-3 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
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

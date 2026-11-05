import { useMemo, useState } from 'react';

import type {
  BacktestOrder,
  UpdateOrderInput,
} from '../../types/order';

import OrderTable from './OrderTable';

type OrderTab = 'OPEN' | 'PENDING' | 'CLOSE';

interface OrderListProps {
  orders: BacktestOrder[];
  currentPrice: number;
  loading?: boolean;
  error?: string | null;

  onDetail?: (order: BacktestOrder) => void;
  onEdit?: (order: BacktestOrder) => void;
  onUpdate?: (
    orderId: string,
    input: UpdateOrderInput
  ) => Promise<void>;
  onCancel?: (order: BacktestOrder) => void;
  onClose?: (order: BacktestOrder) => void;
  onRefresh?: () => void;
}

const CLOSE_STATUSES = [
  'CLOSED_TP',
  'CLOSED_SL',
  'CLOSED_MANUAL',
  'CANCELLED',
] as const;

export default function OrderList({
  orders,
  currentPrice,
  loading = false,
  error = null,

  onDetail,
  onEdit,
  onUpdate,
  onCancel,
  onClose,
  onRefresh,
}: OrderListProps) {
  const [activeTab, setActiveTab] = useState<OrderTab>('OPEN');

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

      case 'CLOSE':
        return orders.filter((order) =>
          CLOSE_STATUSES.includes(
            order.status as (typeof CLOSE_STATUSES)[number]
          )
        );

      default:
        return orders;
    }
  }, [orders, activeTab]);

  const openCount = useMemo(
    () =>
      orders.filter((order) => order.status === 'OPEN').length,
    [orders]
  );

  const pendingCount = useMemo(
    () =>
      orders.filter((order) => order.status === 'PENDING').length,
    [orders]
  );

  const closeCount = useMemo(
    () =>
      orders.filter((order) =>
        CLOSE_STATUSES.includes(
          order.status as (typeof CLOSE_STATUSES)[number]
        )
      ).length,
    [orders]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* HEADER DAN TAB */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('OPEN')}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'OPEN'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Open
            <span className="ml-2 text-xs opacity-70">
              {openCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'PENDING'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Pending
            <span className="ml-2 text-xs opacity-70">
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CLOSE')}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'CLOSE'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Close
            <span className="ml-2 text-xs opacity-70">
              {closeCount}
            </span>
          </button>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh orders"
            className="mr-3 rounded-md px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        )}
      </div>

      {/* ERROR */}
      {error && (
        <div className="mx-3 mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ORDER TABLE */}
      <div className="min-h-0 flex-1 overflow-auto">
        <OrderTable
          orders={filteredOrders}
          currentPrice={currentPrice}
          loading={loading}
          onDetail={onDetail}
          onEdit={onEdit}
          onUpdate={onUpdate}
          onCancel={onCancel}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
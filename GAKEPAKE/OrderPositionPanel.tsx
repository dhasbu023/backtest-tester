
import React, { useMemo } from 'react';

import type {
  BacktestOrder,
} from '../src/types/order';

import OrderTable from '../src/components/Orders/OrderTable';

interface OrderPositionPanelProps {
  orders: BacktestOrder[];
  loading?: boolean;

  onDetail?: (order: BacktestOrder) => void;
  onEdit?: (order: BacktestOrder) => void;
  onCancel?: (order: BacktestOrder) => void;
  onClose?: (order: BacktestOrder) => void;
}

export default function OrderPositionPanel({
  orders,
  loading = false,
  onDetail,
  onEdit,
  onCancel,
  onClose,
}: OrderPositionPanelProps) {
  const openOrders = useMemo(
    () => orders.filter((order) => order.status === 'OPEN'),
    [orders]
  );

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status === 'PENDING'),
    [orders]
  );

  const floatingPnl = useMemo(
    () =>
      openOrders.reduce(
        (total, order) => total + (order.pnl || 0),
        0
      ),
    [openOrders]
  );

  const pnlColor =
    floatingPnl > 0
      ? 'text-green-600'
      : floatingPnl < 0
        ? 'text-red-600'
        : 'text-gray-500';

  return (
    <section className="w-full space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Positions & Orders
          </h2>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Pantau posisi aktif dan pending order pada sesi backtest.
          </p>
        </div>

        <div className="flex gap-2">
          <div className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
            <div className="text-[10px] text-gray-500 dark:text-gray-400">
              Open Positions
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {openOrders.length}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
            <div className="text-[10px] text-gray-500 dark:text-gray-400">
              Pending
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {pendingOrders.length}
            </div>
          </div>
        </div>
      </div>

      {/* OPEN POSITION SUMMARY */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Total P/L pada posisi terbuka
        </div>

        <div className={`mt-1 text-xl font-bold tabular-nums ${pnlColor}`}>
          {floatingPnl >= 0 ? '+' : '-'}$
          {Math.abs(floatingPnl).toFixed(2)}
        </div>

        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          Nilai ini mengikuti nilai P/L yang tersedia pada data order.
          Pastikan Replay Engine memperbaruinya berdasarkan harga candle berjalan.
        </p>
      </div>

      {/* OPEN POSITIONS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Open Positions
          </h3>

          <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {openOrders.length}
          </span>
        </div>

        <OrderTable
          orders={openOrders}
          loading={loading}
          onDetail={onDetail}
          onEdit={onEdit}
          onClose={onClose}
        />
      </div>

      {/* PENDING ORDERS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Pending Orders
          </h3>

          <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            {pendingOrders.length}
          </span>
        </div>

        <OrderTable
          orders={pendingOrders}
          loading={loading}
          onDetail={onDetail}
          onEdit={onEdit}
          onCancel={onCancel}
        />
      </div>
    </section>
  );
}

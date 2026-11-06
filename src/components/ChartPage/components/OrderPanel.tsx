
import { ChevronUp, ChevronDown } from 'lucide-react';

import type {
  PointerEventHandler,
  KeyboardEventHandler,
} from 'react';

import OrderList from '../../Orders/OrderList.js';

import type { BacktestOrder } from '../../../types/order';
import type { useOrders } from '../../../hooks/useOrders';

// ==========================================
// TYPES
// ==========================================

type OrderResult = ReturnType<typeof useOrders>;

type OrderPanelProps = {
  orders: BacktestOrder[];
  currentPrice: number;
  loading: OrderResult['loading'];
  error: OrderResult['error'];

  floatingPnL: number;
  formattedFloatingPnL: string;

  showOrderPanel: boolean;
  orderPanelHeight: number;
  maxPanelHeight: number;

  onToggle: () => void;

  onResizeStart: PointerEventHandler<HTMLDivElement>;
  onResizeMove: PointerEventHandler<HTMLDivElement>;
  onResizeEnd: PointerEventHandler<HTMLDivElement>;
  onResizeKeyboard: KeyboardEventHandler<HTMLDivElement>;

  onRefresh: () => void;
  onUpdate: OrderResult['update'];
  onCancel: (order: { id: string }) => void;
};

// ==========================================
// CONSTANTS
// ==========================================

const COLLAPSED_HEIGHT = 44;

// ==========================================
// COMPONENT
// ==========================================

export default function OrderPanel({
  orders,
  currentPrice,
  loading,
  error,
  floatingPnL,
  formattedFloatingPnL,
  showOrderPanel,
  orderPanelHeight,
  maxPanelHeight,
  onToggle,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  onResizeKeyboard,
  onRefresh,
  onUpdate,
  onCancel,
}: OrderPanelProps) {
  return (
    <section
      className="
        relative z-20 flex w-full shrink-0 flex-col
        min-h-0 overflow-hidden
        border-t border-slate-300
        bg-white dark:border-slate-700 dark:bg-slate-950
      "
      style={{
        height: showOrderPanel
          ? `${orderPanelHeight}px`
          : `${COLLAPSED_HEIGHT}px`,
        minHeight: `${COLLAPSED_HEIGHT}px`,
        flexShrink: 0,
      }}
    >
      {/* RESIZE HANDLE */}

      {showOrderPanel && (
        <div
          role="separator"
          aria-label="Ubah tinggi Trading Orders"
          aria-orientation="horizontal"
          aria-valuemin={150}
          aria-valuemax={maxPanelHeight}
          aria-valuenow={orderPanelHeight}
          tabIndex={0}
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
          onKeyDown={onResizeKeyboard}
          className="
            group relative flex h-2 w-full shrink-0
            cursor-row-resize touch-none
            items-center justify-center
            bg-slate-100 hover:bg-blue-100
            dark:bg-slate-900 dark:hover:bg-blue-950
          "
        >
          <div
            className="
              h-1 w-12 rounded-full
              bg-slate-400 transition-colors
              group-hover:bg-blue-500
              dark:bg-slate-600
              dark:group-hover:bg-blue-400
            "
          />
        </div>
      )}

      {/* HEADER */}

      <div
        className="
          flex h-10 w-full shrink-0 items-center
          justify-between border-b border-slate-200
          px-3 dark:border-slate-800
        "
      >
        <div className="flex min-w-0 items-center gap-5">
          <span className="shrink-0 text-sm font-semibold text-slate-800 dark:text-slate-100">
            Trading Orders
          </span>

          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Floating PnL
            </span>

            <span
              className={[
                'text-xs font-semibold tabular-nums',
                floatingPnL >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400',
              ].join(' ')}
            >
              {formattedFloatingPnL}
            </span>
          </div>
        </div>

        {/* TOGGLE BUTTON */}

        <button
          type="button"
          onClick={onToggle}
          title={
            showOrderPanel
              ? 'Sembunyikan Trading Orders'
              : 'Tampilkan Trading Orders'
          }
          aria-label={
            showOrderPanel
              ? 'Sembunyikan Trading Orders'
              : 'Tampilkan Trading Orders'
          }
          aria-expanded={showOrderPanel}
          className="
            ml-3 flex h-7 w-7 shrink-0 items-center
            justify-center rounded-md text-slate-500
            transition-colors
            hover:bg-slate-100 hover:text-slate-900
            dark:text-slate-400 dark:hover:bg-slate-800
            dark:hover:text-white
          "
        >
          {showOrderPanel ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* ORDER LIST */}

      {showOrderPanel && (
        <div
          className="
            min-h-0 min-w-0 flex-1
            overflow-x-auto overflow-y-auto
            overscroll-contain p-3
          "
        >
          <OrderList
            orders={orders}
            currentPrice={currentPrice}
            loading={loading}
            error={error}
            onRefresh={onRefresh}
            onEdit={(order) => {
              console.log('[ORDER] Edit:', order);
            }}
            onUpdate={async (orderId, input) => {
              await onUpdate(orderId, input);
            }}
            onCancel={onCancel}
          />
        </div>
      )}
    </section>
  );
}

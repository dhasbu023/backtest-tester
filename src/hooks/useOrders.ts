
/**
 * useOrders Hook
 * File: src/hooks/useOrders.ts
 *
 * Mengelola state dan operasi CRUD Backtest Order.
 */

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import type {
  BacktestOrder,
  CreateOrderInput,
  UpdateOrderInput,
  CloseOrderInput,
  OrderFilter,
} from '../types/order';

import {
  getOrders as fetchOrders,
  createOrder as createOrderRequest,
  updateOrder as updateOrderRequest,
  closeOrder as closeOrderRequest,
  cancelOrder as cancelOrderRequest,
  deleteOrder as deleteOrderRequest,
} from '../services/orderService';

// ============================================
// HOOK OPTIONS
// ============================================

interface UseOrdersOptions {
  autoFetch?: boolean;
  filter?: Omit<OrderFilter, 'sessionId'>;
}

// ============================================
// HOOK RETURN TYPE
// ============================================

interface UseOrdersReturn {
  orders: BacktestOrder[];

  loading: boolean;
  error: string | null;

  refresh: () => Promise<void>;

  create: (input: CreateOrderInput) => Promise<BacktestOrder>;
  update: (
    orderId: string,
    input: UpdateOrderInput
  ) => Promise<BacktestOrder>;

  close: (
    orderId: string,
    input: CloseOrderInput
  ) => Promise<BacktestOrder>;

  cancel: (orderId: string) => Promise<BacktestOrder>;

  remove: (orderId: string) => Promise<void>;

  clearError: () => void;

  openOrders: BacktestOrder[];
  pendingOrders: BacktestOrder[];
  historyOrders: BacktestOrder[];
}

// ============================================
// ERROR HELPER
// ============================================

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan pada sistem order.';
}

// ============================================
// HOOK
// ============================================

export function useOrders(
  sessionId: string | null,
  options: UseOrdersOptions = {}
): UseOrdersReturn {
  const {
    autoFetch = true,
    filter,
  } = options;

  const [orders, setOrders] = useState<BacktestOrder[]>([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // REFRESH ORDERS
  // ==========================================

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setOrders([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchOrders(sessionId, {
        sessionId,
        ...filter,
      });

      setOrders(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [
    sessionId,
    filter?.status,
    filter?.direction,
    filter?.orderType,
  ]);

  // ==========================================
  // AUTO FETCH
  // ==========================================

  useEffect(() => {
    if (!autoFetch) {
      return;
    }

    void refresh();
  }, [autoFetch, refresh]);

  // ==========================================
  // CREATE
  // ==========================================

  const create = useCallback(
    async (input: CreateOrderInput): Promise<BacktestOrder> => {
      if (!sessionId) {
        throw new Error('Session belum dipilih.');
      }

      setError(null);

      try {
        const result = await createOrderRequest({
          ...input,
          sessionId,
        });

        await refresh();

        return result;
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        throw err;
      }
    },
    [sessionId, refresh]
  );

  // ==========================================
  // UPDATE
  // ==========================================

  const update = useCallback(
    async (
      orderId: string,
      input: UpdateOrderInput
    ): Promise<BacktestOrder> => {
      setError(null);

      try {
        const result = await updateOrderRequest(orderId, input);

        await refresh();

        return result;
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        throw err;
      }
    },
    [refresh]
  );

  // ==========================================
  // CLOSE POSITION
  // ==========================================

  const close = useCallback(
    async (
      orderId: string,
      input: CloseOrderInput
    ): Promise<BacktestOrder> => {
      setError(null);

      try {
        const result = await closeOrderRequest(orderId, input);

        await refresh();

        return result;
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        throw err;
      }
    },
    [refresh]
  );

  // ==========================================
  // CANCEL PENDING ORDER
  // ==========================================

  const cancel = useCallback(
    async (orderId: string): Promise<BacktestOrder> => {
      setError(null);

      try {
        const result = await cancelOrderRequest(orderId);

        await refresh();

        return result;
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        throw err;
      }
    },
    [refresh]
  );

  // ==========================================
  // DELETE
  // ==========================================

  const remove = useCallback(
    async (orderId: string): Promise<void> => {
      setError(null);

      try {
        await deleteOrderRequest(orderId);

        await refresh();
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        throw err;
      }
    },
    [refresh]
  );

  // ==========================================
  // CLEAR ERROR
  // ==========================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ==========================================
  // DERIVED ORDER LISTS
  // ==========================================

  const openOrders = orders.filter(
    (order) => order.status === 'OPEN'
  );

  const pendingOrders = orders.filter(
    (order) => order.status === 'PENDING'
  );

  const historyOrders = orders.filter(
    (order) =>
      order.status === 'CLOSED_TP' ||
      order.status === 'CLOSED_SL' ||
      order.status === 'CLOSED_MANUAL' ||
      order.status === 'CANCELLED'
  );

  // ==========================================
  // RETURN
  // ==========================================

  return {
    orders,

    loading,
    error,

    refresh,

    create,
    update,
    close,
    cancel,
    remove,

    clearError,

    openOrders,
    pendingOrders,
    historyOrders,
  };
}


/**
 * Order Service
 * File: src/services/orderService.ts
 *
 * Seluruh komunikasi API untuk Backtest Order.
 */

import type {
  BacktestOrder,
  CreateOrderInput,
  UpdateOrderInput,
  CloseOrderInput,
  OrderFilter,
} from '../types/order';

// ============================================
// API CONFIGURATION
// ============================================

const API_BASE_URL = '/api';

const ENDPOINTS = {
  sessionOrders: (sessionId: string) =>
    `${API_BASE_URL}/backtest-sessions/${encodeURIComponent(sessionId)}/orders`,

  order: (orderId: string) =>
    `${API_BASE_URL}/orders/${encodeURIComponent(orderId)}`,

  closeOrder: (orderId: string) =>
    `${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/close`,

  cancelOrder: (orderId: string) =>
    `${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/cancel`,
};

// ============================================
// API ERROR
// ============================================

export class OrderServiceError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'OrderServiceError';
    this.status = status;
  }
}

// ============================================
// RESPONSE HELPERS
// ============================================

async function parseResponse<T>(
  response: Response
): Promise<T> {
  const contentType =
    response.headers.get('content-type') ?? '';

  let result: unknown;

  if (contentType.includes('application/json')) {
    result = await response.json();
  } else {
    const text = await response.text();
    result = text ? { message: text } : {};
  }

  if (!response.ok) {
    let message = `Request gagal (${response.status}).`;

    if (typeof result === 'object' && result !== null) {
      const data = result as Record<string, unknown>;

      if (typeof data.message === 'string') {
        message = data.message;
      } else if (typeof data.error === 'string') {
        message = data.error;
      }
    }

    throw new OrderServiceError(
      message,
      response.status
    );
  }

  // Mendukung response langsung maupun { data: ... }
  if (
    typeof result === 'object' &&
    result !== null &&
    'data' in result
  ) {
    return (result as { data: T }).data;
  }

  return result as T;
}

function jsonHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

// ============================================
// GET ORDERS
// ============================================

export async function getOrders(
  sessionId: string,
  filter?: OrderFilter
): Promise<BacktestOrder[]> {
  if (!sessionId.trim()) {
    throw new OrderServiceError(
      'Session ID tidak boleh kosong.',
      400
    );
  }

  const url = new URL(
    ENDPOINTS.sessionOrders(sessionId),
    window.location.origin
  );

  if (filter?.status) {
    const status = Array.isArray(filter.status)
      ? filter.status.join(',')
      : filter.status;

    url.searchParams.set('status', status);
  }

  if (filter?.direction) {
    url.searchParams.set(
      'direction',
      filter.direction
    );
  }

  if (filter?.orderType) {
    url.searchParams.set(
      'orderType',
      filter.orderType
    );
  }

  const response = await fetch(
    `${url.pathname}${url.search}`,
    {
      method: 'GET',
      headers: jsonHeaders(),
    }
  );

  const result = await parseResponse<
    BacktestOrder[] | { orders: BacktestOrder[] }
  >(response);

  if (Array.isArray(result)) {
    return result;
  }

  return result.orders ?? [];
}

// ============================================
// CREATE ORDER
// ============================================

export async function createOrder(
  input: CreateOrderInput
): Promise<BacktestOrder> {
  if (!input.sessionId.trim()) {
    throw new OrderServiceError(
      'Session ID tidak boleh kosong.',
      400
    );
  }

  const response = await fetch(
    ENDPOINTS.sessionOrders(input.sessionId),
    {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(input),
    }
  );

  return parseResponse<BacktestOrder>(response);
}

// ============================================
// UPDATE ORDER
// ============================================

export async function updateOrder(
  orderId: string,
  input: UpdateOrderInput
): Promise<BacktestOrder> {
  if (!orderId.trim()) {
    throw new OrderServiceError(
      'Order ID tidak boleh kosong.',
      400
    );
  }

  const response = await fetch(
    ENDPOINTS.order(orderId),
    {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify({
        stopLoss: input.stopLoss,
        takeProfit: input.takeProfit,
      }),
    }
  );

  return parseResponse<BacktestOrder>(response);
}

// ============================================
// CLOSE OPEN POSITION
// ============================================

export async function closeOrder(
  orderId: string,
  input: CloseOrderInput
): Promise<BacktestOrder> {
  if (!orderId.trim()) {
    throw new OrderServiceError(
      'Order ID tidak boleh kosong.',
      400
    );
  }

  const response = await fetch(
    ENDPOINTS.closeOrder(orderId),
    {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(input),
    }
  );

  return parseResponse<BacktestOrder>(response);
}

// ============================================
// CANCEL PENDING ORDER
// ============================================

export async function cancelOrder(
  orderId: string
): Promise<BacktestOrder> {
  if (!orderId.trim()) {
    throw new OrderServiceError(
      'Order ID tidak boleh kosong.',
      400
    );
  }

  const response = await fetch(
    ENDPOINTS.cancelOrder(orderId),
    {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({}),
    }
  );

  return parseResponse<BacktestOrder>(response);
}

// ============================================
// DELETE ORDER
// ============================================

export async function deleteOrder(
  orderId: string
): Promise<void> {
  if (!orderId.trim()) {
    throw new OrderServiceError(
      'Order ID tidak boleh kosong.',
      400
    );
  }

  const response = await fetch(
    ENDPOINTS.order(orderId),
    {
      method: 'DELETE',
      headers: jsonHeaders(),
    }
  );

  await parseResponse<unknown>(response);
}

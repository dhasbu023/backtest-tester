
import React from 'react';

import type {
  OrderDirection,
  OrderType,
} from '../../types/order';

interface OrderTypeSelectorProps {
  direction: OrderDirection;
  orderType: OrderType;
  onDirectionChange: (direction: OrderDirection) => void;
  onOrderTypeChange: (orderType: OrderType) => void;
  disabled?: boolean;
}

export default function OrderTypeSelector({
  direction,
  orderType,
  onDirectionChange,
  onOrderTypeChange,
  disabled = false,
}: OrderTypeSelectorProps) {
  const isMarket = orderType === 'MARKET';

  const handleDirectionChange = (nextDirection: OrderDirection) => {
    onDirectionChange(nextDirection);

    // Jika Pending, gunakan jenis sementara sesuai arah.
    // Jenis final ditentukan otomatis di OrderForm.
    if (!isMarket) {
      onOrderTypeChange(
        nextDirection === 'BUY' ? 'BUY_LIMIT' : 'SELL_LIMIT'
      );
    }
  };

  return (
    <div className="space-y-3">
      {/* BUY / SELL */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
          Arah Transaksi
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleDirectionChange('BUY')}
            className={[
              'rounded-md border px-3 py-2 text-xs font-semibold transition',
              direction === 'BUY'
                ? 'border-green-600 bg-green-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
              disabled ? 'cursor-not-allowed opacity-50' : '',
            ].join(' ')}
          >
            BUY
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleDirectionChange('SELL')}
            className={[
              'rounded-md border px-3 py-2 text-xs font-semibold transition',
              direction === 'SELL'
                ? 'border-red-600 bg-red-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
              disabled ? 'cursor-not-allowed opacity-50' : '',
            ].join(' ')}
          >
            SELL
          </button>
        </div>
      </div>

      {/* MARKET / PENDING */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
          Eksekusi Order
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onOrderTypeChange('MARKET')}
            className={[
              'rounded-md border px-3 py-2 text-xs font-semibold transition',
              isMarket
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
              disabled ? 'cursor-not-allowed opacity-50' : '',
            ].join(' ')}
          >
            Market Order
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onOrderTypeChange(
                direction === 'BUY' ? 'BUY_LIMIT' : 'SELL_LIMIT'
              )
            }
            className={[
              'rounded-md border px-3 py-2 text-xs font-semibold transition',
              !isMarket
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
              disabled ? 'cursor-not-allowed opacity-50' : '',
            ].join(' ')}
          >
            Pending Order
          </button>
        </div>
      </div>
    </div>
  );
}

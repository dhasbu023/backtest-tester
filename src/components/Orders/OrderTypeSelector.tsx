
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

const pendingTypes: {
  value: OrderType;
  label: string;
  description: string;
}[] = [
  {
    value: 'BUY_LIMIT',
    label: 'Buy Limit',
    description: 'Buy di bawah harga sekarang',
  },
  {
    value: 'BUY_STOP',
    label: 'Buy Stop',
    description: 'Buy di atas harga sekarang',
  },
  {
    value: 'SELL_LIMIT',
    label: 'Sell Limit',
    description: 'Sell di atas harga sekarang',
  },
  {
    value: 'SELL_STOP',
    label: 'Sell Stop',
    description: 'Sell di bawah harga sekarang',
  },
];

export default function OrderTypeSelector({
  direction,
  orderType,
  onDirectionChange,
  onOrderTypeChange,
  disabled = false,
}: OrderTypeSelectorProps) {
  const isMarket = orderType === 'MARKET';

  const availablePendingTypes = pendingTypes.filter((item) =>
    item.value.startsWith(direction)
  );

  const handleDirectionChange = (nextDirection: OrderDirection) => {
    onDirectionChange(nextDirection);

    // Jika sedang memilih pending, sesuaikan jenis pending
    // agar arah dan jenis order tetap konsisten.
    if (orderType !== 'MARKET') {
      onOrderTypeChange(
        nextDirection === 'BUY' ? 'BUY_LIMIT' : 'SELL_LIMIT'
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* BUY / SELL */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Arah Transaksi
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleDirectionChange('BUY')}
            className={[
              'rounded-lg border px-4 py-3 text-sm font-semibold transition',
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
              'rounded-lg border px-4 py-3 text-sm font-semibold transition',
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
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Eksekusi Order
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onOrderTypeChange('MARKET')}
            className={[
              'rounded-lg border px-3 py-2.5 text-sm font-medium transition',
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
              'rounded-lg border px-3 py-2.5 text-sm font-medium transition',
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

      {/* PENDING TYPE */}
      {!isMarket && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Jenis Pending Order
          </label>

          <div className="grid grid-cols-2 gap-2">
            {availablePendingTypes.map((item) => (
              <button
                key={item.value}
                type="button"
                disabled={disabled}
                title={item.description}
                onClick={() => onOrderTypeChange(item.value)}
                className={[
                  'rounded-lg border px-3 py-2 text-left transition',
                  orderType === item.value
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
                  disabled ? 'cursor-not-allowed opacity-50' : '',
                ].join(' ')}
              >
                <span className="block text-sm font-semibold">
                  {item.label}
                </span>

                <span className="mt-1 block text-xs opacity-70">
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

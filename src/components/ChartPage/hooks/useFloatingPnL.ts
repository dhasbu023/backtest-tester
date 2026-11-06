
import { useMemo } from 'react';

import type { BacktestOrder } from '../../../types/order';

const CONTRACT_SIZE = 100;

type UseFloatingPnLProps = {
  orders: BacktestOrder[];
  currentPrice: number;
};

export function useFloatingPnL({
  orders,
  currentPrice,
}: UseFloatingPnLProps) {
  const floatingPnL = useMemo(() => {
    return orders
      .filter((order) => order.status === 'OPEN')
      .reduce((total, order) => {
        const marketPrice =
          order.currentPrice ?? currentPrice;

        const priceDifference =
          order.direction === 'BUY'
            ? marketPrice - order.openPrice
            : order.openPrice - marketPrice;

        return (
          total +
          priceDifference * order.lot * CONTRACT_SIZE
        );
      }, 0);
  }, [orders, currentPrice]);

  const formattedFloatingPnL =
    `${floatingPnL >= 0 ? '+' : '-'}$${Math.abs(
      floatingPnL
    ).toFixed(2)}`;

  return {
    floatingPnL,
    formattedFloatingPnL,
  };
}

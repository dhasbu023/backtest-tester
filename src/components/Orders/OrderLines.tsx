
import { useEffect } from 'react';

import {
  LineStyle,
  type ISeriesApi,
} from 'lightweight-charts';

import type { BacktestOrder } from '../../types/order';

interface OrderLinesProps {
  series: ISeriesApi<'Candlestick'> | null;
  orders: BacktestOrder[];
}

export default function OrderLines({
  series,
  orders,
}: OrderLinesProps) {
  useEffect(() => {
    if (!series) return;

    const createdLines: Array<{
      priceLine: ReturnType<typeof series.createPriceLine>;
    }> = [];

    const addLine = (
      price: number | null | undefined,
      title: string,
      color: string,
      lineStyle: LineStyle,
    ) => {
      if (
        price == null ||
        !Number.isFinite(price) ||
        price <= 0
      ) {
        return;
      }

      const priceLine = series.createPriceLine({
        price,
        color,
        lineWidth: 1,
        lineStyle,
        axisLabelVisible: true,
        title,
        axisLabelColor: color,
        axisLabelTextColor: '#ffffff',
      });

      createdLines.push({ priceLine });
    };

    const activeOrders = orders.filter(
      (order) =>
        order.status === 'OPEN' ||
        order.status === 'PENDING',
    );

    activeOrders.forEach((order) => {
      const isPending = order.status === 'PENDING';

      const directionColor =
        order.direction === 'BUY' ? '#16a34a' : '#dc2626';

      const orderLabel = isPending
        ? order.orderType.replace(/_/g, ' ')
        : `${order.direction} #${order.orderNumber}`;

      // ENTRY
      addLine(
        order.openPrice,
        `${isPending ? 'PENDING' : 'OPEN'} ${orderLabel}`,
        directionColor,
        isPending ? LineStyle.Dashed : LineStyle.Solid,
      );

      // STOP LOSS
      addLine(
        order.stopLoss,
        `SL #${order.orderNumber}`,
        '#ef4444',
        LineStyle.Dashed,
      );

      // TAKE PROFIT
      addLine(
        order.takeProfit,
        `TP #${order.orderNumber}`,
        '#22c55e',
        LineStyle.Dashed,
      );
    });

    return () => {
      createdLines.forEach(({ priceLine }) => {
        series.removePriceLine(priceLine);
      });
    };
  }, [series, orders]);

  return null;
}

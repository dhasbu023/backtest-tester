
import { useEffect, useState } from 'react';

import {
  LineStyle,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';

import type { BacktestOrder } from '../../types/order';

interface OrderLinesProps {
  chart: IChartApi | null;
  series: ISeriesApi<'Candlestick'> | null;
  orders: BacktestOrder[];
  onCancelPendingOrder?: (orderId: string) => void | Promise<void>;
}

function formatPnl(
  entryPrice: number,
  targetPrice: number,
  direction: 'BUY' | 'SELL',
  lot: number,
): string {
  const difference =
    direction === 'BUY'
      ? targetPrice - entryPrice
      : entryPrice - targetPrice;

  const pnl = difference * lot * 100;
  const sign = pnl > 0 ? '+' : '';

  return `${sign}$${pnl.toFixed(2)}`;
}

export default function OrderLines({
  chart,
  series,
  orders,
  onCancelPendingOrder,
}: OrderLinesProps) {
  const [, forceUpdate] = useState(0);

  // Perbarui posisi tombol ketika chart digeser atau crosshair bergerak.
  useEffect(() => {
    if (!chart) return;

    const updatePosition = () => {
      forceUpdate((value) => value + 1);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(updatePosition);
    chart.subscribeCrosshairMove(updatePosition);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(updatePosition);
      chart.unsubscribeCrosshairMove(updatePosition);
    };
  }, [chart]);

  // Buat garis harga.
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

      // ENTRY LABEL
      let entryLabel: string;

      if (isPending) {
        entryLabel = order.orderType.replace(/_/g, ' ');
      } else if (
        order.currentPrice != null &&
        Number.isFinite(order.currentPrice)
      ) {
        entryLabel = `PnL: ${formatPnl(
          order.openPrice,
          order.currentPrice,
          order.direction,
          order.lot,
        )}`;
      } else {
        entryLabel = 'PnL: --';
      }

      // ENTRY
      addLine(
        order.openPrice,
        entryLabel,
        directionColor,
        isPending ? LineStyle.Dashed : LineStyle.Solid,
      );

      // STOP LOSS - ESTIMASI PNL USD
      if (order.stopLoss != null) {
        const slPnl = formatPnl(
          order.openPrice,
          order.stopLoss,
          order.direction,
          order.lot,
        );

        addLine(
          order.stopLoss,
          `SL: ${slPnl}`,
          '#ef4444',
          LineStyle.Dashed,
        );
      }

      // TAKE PROFIT - ESTIMASI PNL USD
      if (order.takeProfit != null) {
        const tpPnl = formatPnl(
          order.openPrice,
          order.takeProfit,
          order.direction,
          order.lot,
        );

        addLine(
          order.takeProfit,
          `TP: ${tpPnl}`,
          '#22c55e',
          LineStyle.Dashed,
        );
      }
    });

    return () => {
      createdLines.forEach(({ priceLine }) => {
        series.removePriceLine(priceLine);
      });
    };
  }, [series, orders]);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {orders
        .filter((order) => order.status === 'PENDING')
        .map((order) => {
          const coordinate = series?.priceToCoordinate(
            order.openPrice,
          );

          if (coordinate == null) return null;

          return (
            <button
              key={order.id}
              type="button"
              title={`Batalkan ${order.orderType}`}
              aria-label={`Batalkan pending order ${order.orderNumber}`}
              onClick={() => {
                if (!onCancelPendingOrder) return;

                void Promise.resolve(
                  onCancelPendingOrder(order.id),
                ).catch((error) => {
                  console.error('Gagal membatalkan order:', error);
                });
              }}
              className="
                pointer-events-auto absolute
                flex h-5 w-5 items-center justify-center
                rounded-full border border-red-500
                bg-red-600 text-white shadow
                transition-colors hover:bg-red-700
              "
              style={{
                top: coordinate - 10,
                right: 72,
              }}
            >
              <span className="text-xs font-bold">×</span>
            </button>
          );
        })}
    </div>
  );
}

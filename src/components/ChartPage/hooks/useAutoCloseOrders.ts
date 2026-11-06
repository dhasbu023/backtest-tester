
import { useEffect, useRef } from 'react';

import type { Candle } from '../../../types/index.js';
import type { BacktestOrder } from '../../../types/order';

type CloseOrderInput = {
  closePrice: number;
  closeTime: number;
  status: 'CLOSED_SL' | 'CLOSED_TP';
};

type UseAutoCloseOrdersProps = {
  currentIndex: number;
  currentTimestamp: number;
  sourceCandles: Candle[];
  activeSessionId: string;
  orders: BacktestOrder[];
  closeOrder: (
    orderId: string,
    input: CloseOrderInput
  ) => Promise<unknown>;
};

export function useAutoCloseOrders({
  currentIndex,
  currentTimestamp,
  sourceCandles,
  activeSessionId,
  orders,
  closeOrder,
}: UseAutoCloseOrdersProps): void {
  // Mencegah order yang sama diproses berulang kali.
  const processedCloseRef = useRef<Set<string>>(new Set());

  // Menyimpan posisi replay sebelumnya.
  const previousReplayIndexRef = useRef(currentIndex);

  useEffect(() => {
    // Hanya proses ketika replay bergerak maju.
    if (currentIndex <= previousReplayIndexRef.current) {
      previousReplayIndexRef.current = currentIndex;
      return;
    }

    previousReplayIndexRef.current = currentIndex;

    const candle = sourceCandles[currentIndex];

    if (
      !candle ||
      !activeSessionId ||
      !Number.isFinite(currentTimestamp)
    ) {
      return;
    }

    // Hanya periksa order OPEN.
    const openOrders = orders.filter(
      (order) => order.status === 'OPEN'
    );

    for (const order of openOrders) {
      // Jangan proses candle sebelum atau saat order dibuka.
      if (
        order.openTime != null &&
        currentTimestamp <= order.openTime
      ) {
        continue;
      }

      const stopLoss = Number(order.stopLoss);
      const takeProfit = Number(order.takeProfit);

      const hasStopLoss =
        Number.isFinite(stopLoss) && stopLoss > 0;

      const hasTakeProfit =
        Number.isFinite(takeProfit) && takeProfit > 0;

      let closePrice: number | null = null;

      let closeStatus:
        | 'CLOSED_SL'
        | 'CLOSED_TP'
        | null = null;

      if (order.direction === 'BUY') {
        const slHit =
          hasStopLoss && candle.low <= stopLoss;

        const tpHit =
          hasTakeProfit && candle.high >= takeProfit;

        // SL diprioritaskan jika keduanya tersentuh.
        if (slHit) {
          closePrice = stopLoss;
          closeStatus = 'CLOSED_SL';
        } else if (tpHit) {
          closePrice = takeProfit;
          closeStatus = 'CLOSED_TP';
        }
      } else if (order.direction === 'SELL') {
        const slHit =
          hasStopLoss && candle.high >= stopLoss;

        const tpHit =
          hasTakeProfit && candle.low <= takeProfit;

        if (slHit) {
          closePrice = stopLoss;
          closeStatus = 'CLOSED_SL';
        } else if (tpHit) {
          closePrice = takeProfit;
          closeStatus = 'CLOSED_TP';
        }
      }

      if (closePrice === null || closeStatus === null) {
        continue;
      }

      const closeKey = `${order.id}-${currentIndex}`;

      if (processedCloseRef.current.has(closeKey)) {
        continue;
      }

      processedCloseRef.current.add(closeKey);

      console.log('[AUTO CLOSE] Candle menyentuh SL/TP:', {
        orderId: order.id,
        direction: order.direction,
        candleIndex: currentIndex,
        candleHigh: candle.high,
        candleLow: candle.low,
        closePrice,
        closeStatus,
      });

      void closeOrder(order.id, {
        closePrice,
        closeTime: currentTimestamp,
        status: closeStatus,
      })
        .then(() => {
          console.log('[AUTO CLOSE] Order berhasil ditutup:', {
            orderId: order.id,
            closePrice,
            closeStatus,
          });
        })
        .catch((error) => {
          // Izinkan percobaan ulang jika gagal.
          processedCloseRef.current.delete(closeKey);

          console.error(
            '[AUTO CLOSE] Gagal menutup order:',
            order.id,
            error
          );
        });
    }
  }, [
    currentIndex,
    currentTimestamp,
    sourceCandles,
    activeSessionId,
    orders,
    closeOrder,
  ]);
}

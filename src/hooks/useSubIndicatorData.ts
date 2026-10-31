import { useCallback, useMemo } from 'react';

import type {
  Candle,
  IndicatorConfig,
} from '../types/index.js';

import {
  calculateRSI,
  calculateATR,
} from '../utils/indicators.js';

interface UseSubIndicatorDataParams {
  candles: Candle[];
  indicators: IndicatorConfig[];
  onUpdateIndicators: (indicators: IndicatorConfig[]) => void;
}

export function useSubIndicatorData({
  candles,
  indicators,
  onUpdateIndicators,
}: UseSubIndicatorDataParams) {
  // =========================================================
  // FILTER ACTIVE SUB-INDICATORS
  // =========================================================

  const subIndicators = useMemo(
    () =>
      indicators.filter(
        (indicator) =>
          indicator.pane === 'sub' &&
          indicator.visible &&
          (indicator.type === 'RSI' || indicator.type === 'ATR'),
      ),
    [indicators],
  );

  // =========================================================
  // CALCULATE LATEST INDICATOR VALUES
  // =========================================================

  const subIndicatorReadouts = useMemo(() => {
    const readouts: Record<string, number | null> = {};

    for (const indicator of subIndicators) {
      const points =
        indicator.type === 'RSI'
          ? calculateRSI(candles, indicator.period || 14)
          : calculateATR(candles, indicator.period || 14);

      const latest = points.length
        ? points[points.length - 1]?.value
        : undefined;

      readouts[indicator.id] =
        typeof latest === 'number' && Number.isFinite(latest)
          ? latest
          : null;
    }

    return readouts;
  }, [candles, subIndicators]);

  // =========================================================
  // GROUP INDICATORS BY TYPE
  // =========================================================

  const subIndicatorGroups = useMemo(() => {
    const groups: Partial<
      Record<'RSI' | 'ATR', IndicatorConfig[]>
    > = {};

    for (const indicator of subIndicators) {
      if (
        indicator.type !== 'RSI' &&
        indicator.type !== 'ATR'
      ) {
        continue;
      }

      const group = groups[indicator.type] || [];

      group.push(indicator);
      groups[indicator.type] = group;
    }

    return groups;
  }, [subIndicators]);

  // =========================================================
  // REMOVE / HIDE SUB-INDICATOR
  // =========================================================

  const handleRemoveSubIndicator = useCallback(
    (id: string) => {
      onUpdateIndicators(
        indicators.map((indicator) =>
          indicator.id === id
            ? { ...indicator, visible: false }
            : indicator,
        ),
      );
    },
    [indicators, onUpdateIndicators],
  );

  return {
    subIndicators,
    subIndicatorReadouts,
    subIndicatorGroups,
    handleRemoveSubIndicator,
  };
}
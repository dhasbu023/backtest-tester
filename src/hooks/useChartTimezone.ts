// ============================================================
// IMPORTS
// ============================================================

import { useEffect, type RefObject } from 'react';
import type { IChartApi } from 'lightweight-charts';

import { formatDateTimeWithTz } from '../utils/timezone.js';

// ============================================================
// TYPES
// ============================================================

interface UseChartTimezoneProps {
  chartRef: RefObject<IChartApi | null>;
  activeTimezone: string;
  activeTimezoneRef: RefObject<string>;
}

// ============================================================
// HOOK: UPDATE CHART TIMEZONE
// Memperbarui format waktu chart ketika timezone berubah.
// ============================================================

export function useChartTimezone({
  chartRef,
  activeTimezone,
  activeTimezoneRef,
}: UseChartTimezoneProps): void {
  useEffect(() => {
    // --------------------------------------------------------
    // 1. UPDATE TIMEZONE REF
    // --------------------------------------------------------

    activeTimezoneRef.current = activeTimezone;

    // --------------------------------------------------------
    // 2. UPDATE FORMATTER CHART
    // --------------------------------------------------------

    const chart = chartRef.current;

    if (!chart) return;

    chart.applyOptions({
      localization: {
        timeFormatter: (timeValue: number) =>
          formatDateTimeWithTz(timeValue, activeTimezone),
      },
    });

  }, [chartRef, activeTimezone, activeTimezoneRef]);
}
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
  chart: IChartApi | null;
  activeTimezone: string;
  activeTimezoneRef: RefObject<string>;
}

// ============================================================
// HOOK: UPDATE CHART TIMEZONE
// Memperbarui formatter waktu ketika timezone berubah.
// ============================================================

export function useChartTimezone({
  chart,
  activeTimezone,
  activeTimezoneRef,
}: UseChartTimezoneProps): void {
  useEffect(() => {
    // --------------------------------------------------------
    // 1. SIMPAN TIMEZONE TERBARU KE REF
    // --------------------------------------------------------
    // useChartInitialization menggunakan ref ini agar formatter
    // selalu membaca timezone terbaru tanpa membuat ulang chart.

    activeTimezoneRef.current = activeTimezone;

    // --------------------------------------------------------
    // 2. PERBARUI FORMATTER WAKTU CHART
    // --------------------------------------------------------

    chart?.applyOptions({
      localization: {
        timeFormatter: (timeValue: number) =>
          formatDateTimeWithTz(timeValue, activeTimezone),
      },
    });
  }, [chart, activeTimezone, activeTimezoneRef]);
}
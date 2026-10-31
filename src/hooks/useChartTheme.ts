// ============================================================
// IMPORTS
// ============================================================

import { useEffect } from 'react';
import { ColorType, type IChartApi } from 'lightweight-charts';

// ============================================================
// TYPES
// ============================================================

interface UseChartThemeProps {
  chart: IChartApi | null;
  isDarkMode: boolean;
}

// ============================================================
// HOOK: UPDATE CHART THEME
// ============================================================

export function useChartTheme({
  chart,
  isDarkMode,
}: UseChartThemeProps): void {
  useEffect(() => {
    // Chart belum tersedia, tidak ada yang perlu diperbarui.
    if (!chart) return;

    // --------------------------------------------------------
    // 1. WARNA DASAR
    // --------------------------------------------------------

    const backgroundColor = isDarkMode ? '#0b0f19' : '#ffffff';

    const textColor = isDarkMode ? '#94a3b8' : '#475569';

    // --------------------------------------------------------
    // 2. WARNA GRID
    // --------------------------------------------------------

    const gridColor = isDarkMode
      ? 'rgba(30, 41, 59, 0.6)'
      : '#f1f5f9';

    // --------------------------------------------------------
    // 3. WARNA CROSSHAIR
    // --------------------------------------------------------

    const crosshairColor = isDarkMode ? '#3b82f6' : '#2563eb';

    const crosshairLabelColor = isDarkMode ? '#1e293b' : '#2563eb';

    // --------------------------------------------------------
    // 4. WARNA BORDER
    // --------------------------------------------------------

    const borderColor = isDarkMode ? '#1e293b' : '#e2e8f0';

    // --------------------------------------------------------
    // 5. TERAPKAN TEMA KE CHART
    // --------------------------------------------------------

    chart.applyOptions({
      // Background dan teks chart.
      layout: {
        background: {
          type: ColorType.Solid,
          color: backgroundColor,
        },
        textColor,
      },

      // Garis grid horizontal dan vertikal.
      grid: {
        vertLines: {
          color: gridColor,
        },
        horzLines: {
          color: gridColor,
        },
      },

      // Warna garis crosshair dan label harganya.
      crosshair: {
        vertLine: {
          color: crosshairColor,
          labelBackgroundColor: crosshairLabelColor,
        },
        horzLine: {
          color: crosshairColor,
          labelBackgroundColor: crosshairLabelColor,
        },
      },

      // Garis pembatas skala harga.
      rightPriceScale: {
        borderColor,
      },

      // Garis pembatas skala waktu.
      timeScale: {
        borderColor,
      },
    });
  }, [chart, isDarkMode]);
}

import { useCallback } from 'react';
import type {
  IChartApi,
  Logical,
  LogicalRange,
} from 'lightweight-charts';

// ============================================================
// TYPES
// ============================================================

interface RefLike<T> {
  current: T;
}

interface UseChartControlsProps {
  chartRef: RefLike<IChartApi | null>;
}

interface UseChartControlsReturn {
  fitContent: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  scrollToRealTime: () => void;
  resetView: () => void;
}

// ============================================================
// CONSTANTS
// ============================================================

const ZOOM_IN_FACTOR = 0.7;
const ZOOM_OUT_FACTOR = 1.4;
const MIN_VISIBLE_BARS = 2;

// ============================================================
// HELPERS
// ============================================================

function createLogicalRange(
  from: number,
  to: number,
): LogicalRange {
  return {
    from: from as Logical,
    to: to as Logical,
  };
}

// ============================================================
// HOOK
// ============================================================

export function useChartControls({
  chartRef,
}: UseChartControlsProps): UseChartControlsReturn {

  // ==========================================================
  // FIT CONTENT
  // Menampilkan seluruh candle yang tersedia.
  // ==========================================================

  const fitContent = useCallback(() => {
    const chart = chartRef.current;

    if (!chart) return;

    try {
      chart.timeScale().fitContent();

      chart.priceScale('right').applyOptions({
        autoScale: true,
      });

    } catch (error) {
      console.error(
        '[Chart Controls] Fit Content gagal:',
        error,
      );
    }
  }, [chartRef]);


  // ==========================================================
  // ZOOM IN
  // Memperbesar tampilan chart.
  // ==========================================================

  const zoomIn = useCallback(() => {
    const chart = chartRef.current;

    if (!chart) return;

    try {
      const timeScale = chart.timeScale();
      const range = timeScale.getVisibleLogicalRange();

      if (!range) return;

      const center =
        (Number(range.from) + Number(range.to)) / 2;

      const currentWidth =
        Number(range.to) - Number(range.from);

      if (currentWidth <= 0) return;

      const newWidth = Math.max(
        MIN_VISIBLE_BARS,
        currentWidth * ZOOM_IN_FACTOR,
      );

      const newRange = createLogicalRange(
        center - newWidth / 2,
        center + newWidth / 2,
      );

      timeScale.setVisibleLogicalRange(newRange);

    } catch (error) {
      console.error(
        '[Chart Controls] Zoom In gagal:',
        error,
      );
    }
  }, [chartRef]);


  // ==========================================================
  // ZOOM OUT
  // Memperkecil tampilan chart.
  // ==========================================================

  const zoomOut = useCallback(() => {
    const chart = chartRef.current;

    if (!chart) return;

    try {
      const timeScale = chart.timeScale();
      const range = timeScale.getVisibleLogicalRange();

      if (!range) return;

      const center =
        (Number(range.from) + Number(range.to)) / 2;

      const currentWidth =
        Number(range.to) - Number(range.from);

      if (currentWidth <= 0) return;

      const newWidth = currentWidth * ZOOM_OUT_FACTOR;

      const newRange = createLogicalRange(
        center - newWidth / 2,
        center + newWidth / 2,
      );

      timeScale.setVisibleLogicalRange(newRange);

    } catch (error) {
      console.error(
        '[Chart Controls] Zoom Out gagal:',
        error,
      );
    }
  }, [chartRef]);


  // ==========================================================
  // SCROLL TO REAL TIME
  // Mengarahkan chart ke candle paling terbaru.
  // ==========================================================

  const scrollToRealTime = useCallback(() => {
    const chart = chartRef.current;

    if (!chart) return;

    try {
      chart.timeScale().scrollToRealTime();

    } catch (error) {
      console.error(
        '[Chart Controls] Scroll To Real Time gagal:',
        error,
      );
    }
  }, [chartRef]);


  // ==========================================================
  // RESET VIEW
  // Mengembalikan tampilan chart ke seluruh data.
  // ==========================================================

  const resetView = useCallback(() => {
    fitContent();
  }, [fitContent]);


  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    fitContent,
    zoomIn,
    zoomOut,
    scrollToRealTime,
    resetView,
  };
}

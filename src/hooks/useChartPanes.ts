
import { useCallback, useState } from 'react';

import type {
  IChartApi,
  IPaneApi,
  Time,
} from 'lightweight-charts';

import { SUB_PANE_HEIGHT } from '../components/Chart/utils/chartConstants.js';

export type SubPaneType = 'RSI' | 'ATR' | 'VOLUME';

type ChartRef = {
  current: IChartApi | null;
};

type PaneRef = {
  current: IPaneApi<Time> | null;
};

type SubIndicatorPanesRef = {
  current: Map<SubPaneType, IPaneApi<Time>>;
};

interface UseChartPanesResult {
  subPaneElements: Partial<Record<SubPaneType, HTMLElement>>;
  syncPaneElements: () => void;
  normalizePaneHeights: (chart: IChartApi) => void;
  schedulePaneElementsSync: () => void;
}

function getPaneOverlayHost(
  pane: IPaneApi<Time>,
): HTMLElement | null {
  const row = pane.getHTMLElement();
  if (!row) return null;

  const paneCell = row.children[1];
  const paneWrapper = paneCell?.firstElementChild;

  if (paneWrapper instanceof HTMLElement) {
    paneWrapper.style.position = 'relative';
    return paneWrapper;
  }

  if (paneCell instanceof HTMLElement) {
    paneCell.style.position = 'relative';
    return paneCell;
  }

  return row;
}

export function useChartPanes(
  chartRef: ChartRef,
  volumePaneRef: PaneRef,
  subIndicatorPanesRef: SubIndicatorPanesRef,
): UseChartPanesResult {
  const [subPaneElements, setSubPaneElements] = useState<
    Partial<Record<SubPaneType, HTMLElement>>
  >({});

  const syncPaneElements = useCallback(() => {
    const next: Partial<Record<SubPaneType, HTMLElement>> = {};

    const volumePane = volumePaneRef.current;

    if (volumePane) {
      const host = getPaneOverlayHost(volumePane);
      if (host) next.VOLUME = host;
    }

    for (const [type, pane] of subIndicatorPanesRef.current) {
      if (type === 'VOLUME') continue;

      const host = getPaneOverlayHost(pane);
      if (host) next[type] = host;
    }

    setSubPaneElements((previous) => {
      const nextTypes = Object.keys(next) as SubPaneType[];
      const previousTypes = Object.keys(previous) as SubPaneType[];

      const isSame =
        nextTypes.length === previousTypes.length &&
        nextTypes.every((type) => previous[type] === next[type]);

      return isSame ? previous : next;
    });
  }, [volumePaneRef, subIndicatorPanesRef]);

  const normalizePaneHeights = useCallback((chart: IChartApi) => {
    const panes = chart.panes();
    if (panes.length < 2) return;

    const heights = panes.map((pane) => pane.getHeight());

    if (
      heights.some(
        (height) => !Number.isFinite(height) || height <= 0,
      )
    ) {
      return;
    }

    const separators = panes.length - 1;
    const total =
      heights.reduce((sum, height) => sum + height, 0) +
      separators;

    const subCount = panes.length - 1;
    const minMainHeight = 120;
    const maxSubHeight = (total - minMainHeight) / subCount;

    const subHeight = Math.max(
      30,
      Math.min(SUB_PANE_HEIGHT, maxSubHeight),
    );

    const mainHeight = total - subHeight * subCount;

    panes.forEach((pane, index) => {
      try {
        pane.setStretchFactor(
          index === 0 ? mainHeight : subHeight,
        );
      } catch {
        // Pane mungkin sudah dilepas.
      }
    });
  }, []);

  const schedulePaneElementsSync = useCallback(() => {
    const delays = [0, 60, 200, 500, 1000];
    let attempt = 0;

    const trySync = () => {
      syncPaneElements();

      const chart = chartRef.current;

      if (chart) {
        const panes = chart.panes();

        const layoutReady =
          panes.length > 0 &&
          panes.every((pane) => pane.getHeight() > 0);

        if (layoutReady) {
          normalizePaneHeights(chart);
        }
      }

      attempt += 1;

      if (attempt < delays.length) {
        window.setTimeout(trySync, delays[attempt]);
      }
    };

    trySync();
  }, [chartRef, normalizePaneHeights, syncPaneElements]);

  return {
    subPaneElements,
    syncPaneElements,
    normalizePaneHeights,
    schedulePaneElementsSync,
  };
}

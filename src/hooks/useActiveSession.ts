
import {
  useCallback,
  useEffect,
  useRef,
} from 'react';

import type {
  Dispatch,
  SetStateAction,
} from 'react';

import type {
  BacktestSession,
  Dataset,
  Candle,
  Timeframe,
} from '../types/index.js';

import {
  fetchSession,
  fetchDataset,
  fetchCandles,
  fetchDrawings,
  fetchPreference,
} from '../services/api.js';

import {
  isTimeframeAllowed,
} from '../server/timeframeAggregator.js';

// =========================================================
// TYPES
// =========================================================

type UseActiveSessionOptions = {
  setActiveSession: Dispatch<
    SetStateAction<BacktestSession | null>
  >;

  setActiveDataset: Dispatch<
    SetStateAction<Dataset | null>
  >;

  setSourceCandles: Dispatch<
    SetStateAction<Candle[]>
  >;

  setDisplayCandles: Dispatch<
    SetStateAction<Candle[]>
  >;

  setCurrentIndex: Dispatch<
    SetStateAction<number>
  >;

  setActiveTimeframe: Dispatch<
    SetStateAction<Timeframe>
  >;

  setReplaySpeed: Dispatch<
    SetStateAction<number>
  >;

  setIsPlaying: Dispatch<
    SetStateAction<boolean>
  >;

  setIsChartLoading: Dispatch<
    SetStateAction<boolean>
  >;

  setGlobalError: Dispatch<
    SetStateAction<string | null>
  >;

  getAggregatedCandles: (
    source: Candle[],
    sourceTf: Timeframe,
    targetTf: Timeframe,
    sourceIndex: number
  ) => Candle[];

  findCandleIndexAtOrAfter: (
    candles: Candle[],
    targetTimestamp: number
  ) => number;

  loadChartPreferences: (
    drawings: any[],
    preference: any,
    sessionId: string
  ) => void;

  resetChartPreferences: () => void;

  clearAggregationCache: () => void;
};

// =========================================================
// HOOK
// =========================================================

export function useActiveSession({
  setActiveSession,
  setActiveDataset,
  setSourceCandles,
  setDisplayCandles,
  setCurrentIndex,
  setActiveTimeframe,
  setReplaySpeed,
  setIsPlaying,
  setIsChartLoading,
  setGlobalError,
  getAggregatedCandles,
  findCandleIndexAtOrAfter,
  loadChartPreferences,
  resetChartPreferences,
  clearAggregationCache,
}: UseActiveSessionOptions) {

  // Mencegah request lama menimpa sesi terbaru.
  const requestIdRef = useRef(0);

  // =======================================================
  // CANCEL OPEN SESSION
  // =======================================================

  const cancelOpenSession = useCallback(() => {
    requestIdRef.current += 1;
    setIsChartLoading(false);
  }, [setIsChartLoading]);

  // =======================================================
  // OPEN SESSION
  // =======================================================

  const handleOpenSession = useCallback(
    async (id: string) => {
      const requestId = ++requestIdRef.current;

      setIsChartLoading(true);
      setIsPlaying(false);
      setGlobalError(null);

      clearAggregationCache();

      try {
        // ================================================
        // 1. LOAD SESSION
        // ================================================

        const session = await fetchSession(id);

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (!session) {
          throw new Error('Sesi tidak ditemukan.');
        }

        // ================================================
        // 2. LOAD DATASET
        // ================================================

        const dataset = await fetchDataset(
          session.datasetId
        );

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (!dataset) {
          throw new Error(
            'Dataset untuk sesi ini tidak ditemukan.'
          );
        }

        setActiveSession(session);
        setActiveDataset(dataset);

        // ================================================
        // 3. RESTORE TIMEFRAME
        // ================================================

        let timeframe = (
          session.activeTimeframe || dataset.timeframe
        ) as Timeframe;

        if (
          !isTimeframeAllowed(
            dataset.timeframe,
            timeframe
          )
        ) {
          timeframe = dataset.timeframe;
        }

        setActiveTimeframe(timeframe);

        setReplaySpeed(
          session.replaySpeed || 1
        );

        // ================================================
        // 4. LOAD DRAWINGS & PREFERENCES
        // ================================================

        const [
          loadedDrawings,
          loadedPreference,
        ] = await Promise.all([
          fetchDrawings(session.id).catch(() => []),
          fetchPreference(session.id).catch(() => null),
        ]);

        if (requestId !== requestIdRef.current) {
          return;
        }

        loadChartPreferences(
          loadedDrawings || [],
          loadedPreference,
          session.id
        );

        // ================================================
        // 5. LOAD CANDLES
        // ================================================

        const candlesData = await fetchCandles({
          datasetId: session.datasetId,
          timeframe: dataset.timeframe,
          limit: 200000,
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        const rawCandles = candlesData?.candles || [];

        setSourceCandles(rawCandles);

        // ================================================
        // 6. RESTORE REPLAY POSITION
        // ================================================

        let targetIndex =
          rawCandles.length > 0
            ? rawCandles.length - 1
            : 0;

        if (rawCandles.length > 0) {
          const targetTime = Number(
            session.currentReplayTime
          );

          if (
            Number.isFinite(targetTime) &&
            targetTime > 0
          ) {
            const foundIndex =
              findCandleIndexAtOrAfter(
                rawCandles,
                targetTime
              );

            targetIndex =
              foundIndex !== -1
                ? foundIndex
                : rawCandles.length - 1;

          } else if (
            session.currentCandleIndex !== undefined &&
            session.currentCandleIndex !== null &&
            Number(session.currentCandleIndex) > 0
          ) {
            targetIndex = Math.max(
              0,
              Math.min(
                Number(session.currentCandleIndex) || 0,
                rawCandles.length - 1
              )
            );
          }

          // ==============================================
          // 7. AGGREGATE CANDLES
          // ==============================================

          const aggregatedCandles =
            getAggregatedCandles(
              rawCandles,
              dataset.timeframe,
              timeframe,
              targetIndex
            );

          setDisplayCandles(aggregatedCandles);

        } else {
          clearAggregationCache();
          setDisplayCandles([]);
        }

        setCurrentIndex(targetIndex);

        // ================================================
        // 8. SAVE ACTIVE SESSION
        // ================================================

        localStorage.setItem(
          'active_session_id',
          session.id
        );

      } catch (error: unknown) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        console.error(
          '[useActiveSession] Error opening session:',
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : String(error);

        setGlobalError(
          'Gagal membuka sesi: ' + message
        );

        clearAggregationCache();

        setActiveSession(null);
        setActiveDataset(null);
        setSourceCandles([]);
        setDisplayCandles([]);
        setCurrentIndex(0);

        resetChartPreferences();

      } finally {
        if (requestId === requestIdRef.current) {
          setIsChartLoading(false);
        }
      }
    },
    [
      setActiveSession,
      setActiveDataset,
      setSourceCandles,
      setDisplayCandles,
      setCurrentIndex,
      setActiveTimeframe,
      setReplaySpeed,
      setIsPlaying,
      setIsChartLoading,
      setGlobalError,
      getAggregatedCandles,
      findCandleIndexAtOrAfter,
      loadChartPreferences,
      resetChartPreferences,
      clearAggregationCache,
    ]
  );

  // =======================================================
  // CLEANUP
  // =======================================================

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
    };
  }, []);

  // =======================================================
  // RETURN
  // =======================================================

  return {
    handleOpenSession,
    cancelOpenSession,
  };
}

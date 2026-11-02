
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  BacktestSession,
  Candle,
  Timeframe,
} from '../types/index.js';

import { saveReplayState } from '../services/api.js';

import {
  isTimeframeAllowed,
} from '../server/timeframeAggregator.js';

type UseReplayControlsOptions = {
  activeSession: BacktestSession | null;
  sourceCandles: Candle[];
  currentIndex: number;
  activeTimeframe: Timeframe;
  replaySpeed: number;
  activeDatasetTimeframe: Timeframe | null;
  isPlaying: boolean;

  setCurrentIndex: (
    index: number | ((previous: number) => number)
  ) => void;

  setActiveTimeframe: (timeframe: Timeframe) => void;

  setReplaySpeed: (speed: number) => void;

  setIsPlaying: (
    playing: boolean | ((previous: boolean) => boolean)
  ) => void;

  setGlobalError: (message: string | null) => void;

  updateVisibleCandles: (
    index: number,
    timeframe: Timeframe
  ) => void;

  findCandleIndexAtOrAfter: (
    candles: Candle[],
    targetTimestamp: number
  ) => number;
};

export function useReplayControls({
  activeSession,
  sourceCandles,
  currentIndex,
  activeTimeframe,
  replaySpeed,
  activeDatasetTimeframe,
  isPlaying,
  setCurrentIndex,
  setActiveTimeframe,
  setReplaySpeed,
  setIsPlaying,
  setGlobalError,
  updateVisibleCandles,
  findCandleIndexAtOrAfter,
}: UseReplayControlsOptions) {
  const [isSaving, setIsSaving] = useState(false);

  const replayTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const saveTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  // =========================================================
  // SAVE REPLAY POSITION
  // =========================================================

  const triggerDebouncedSave = useCallback(
    (
      index: number,
      timeframe: Timeframe,
      speed: number
    ) => {
      if (!activeSession || sourceCandles.length === 0) {
        return;
      }

      const safeIndex = Math.max(
        0,
        Math.min(index, sourceCandles.length - 1)
      );

      const candle = sourceCandles[safeIndex];

      if (!candle) {
        return;
      }

      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
      }

      setIsSaving(true);

      const sessionIdToSave = activeSession.id;

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await saveReplayState(sessionIdToSave, {
            currentTime: candle.timestamp,
            currentIndex: safeIndex,
            speed,
            activeTimeframe: timeframe,
            isPlaying: false,
          });
        } catch (err) {
          console.warn('Auto-save error:', err);
        } finally {
          setIsSaving(false);
          saveTimeoutRef.current = null;
        }
      }, 600);
    },
    [activeSession, sourceCandles]
  );

  // =========================================================
  // NEXT CANDLE
  // =========================================================

  const handleNextCandle = useCallback(() => {
    if (currentIndex >= sourceCandles.length - 1) {
      setIsPlaying(false);
      return;
    }

    const nextIndex = currentIndex + 1;

    setCurrentIndex(nextIndex);

    updateVisibleCandles(
      nextIndex,
      activeTimeframe
    );

    triggerDebouncedSave(
      nextIndex,
      activeTimeframe,
      replaySpeed
    );
  }, [
    currentIndex,
    sourceCandles.length,
    setIsPlaying,
    setCurrentIndex,
    updateVisibleCandles,
    activeTimeframe,
    triggerDebouncedSave,
    replaySpeed,
  ]);

  // =========================================================
  // PREVIOUS CANDLE
  // =========================================================

  const handlePrevCandle = useCallback(() => {
    if (currentIndex <= 0) {
      return;
    }

    const prevIndex = currentIndex - 1;

    setCurrentIndex(prevIndex);

    updateVisibleCandles(
      prevIndex,
      activeTimeframe
    );

    triggerDebouncedSave(
      prevIndex,
      activeTimeframe,
      replaySpeed
    );
  }, [
    currentIndex,
    setCurrentIndex,
    updateVisibleCandles,
    activeTimeframe,
    triggerDebouncedSave,
    replaySpeed,
  ]);

  // =========================================================
  // RESET
  // =========================================================

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);

    updateVisibleCandles(
      0,
      activeTimeframe
    );

    triggerDebouncedSave(
      0,
      activeTimeframe,
      replaySpeed
    );
  }, [
    setIsPlaying,
    setCurrentIndex,
    updateVisibleCandles,
    activeTimeframe,
    triggerDebouncedSave,
    replaySpeed,
  ]);

  // =========================================================
  // SEEK
  // =========================================================

  const handleSeek = useCallback(
    (newIndex: number) => {
      if (sourceCandles.length === 0) {
        return;
      }

      const clampedIndex = Math.max(
        0,
        Math.min(newIndex, sourceCandles.length - 1)
      );

      setCurrentIndex(clampedIndex);

      updateVisibleCandles(
        clampedIndex,
        activeTimeframe
      );

      triggerDebouncedSave(
        clampedIndex,
        activeTimeframe,
        replaySpeed
      );
    },
    [
      sourceCandles.length,
      setCurrentIndex,
      updateVisibleCandles,
      activeTimeframe,
      triggerDebouncedSave,
      replaySpeed,
    ]
  );

  // =========================================================
  // CHANGE TIMEFRAME
  // =========================================================

  const handleChangeTimeframe = useCallback(
    (newTimeframe: Timeframe) => {
      if (!activeDatasetTimeframe) {
        return;
      }

      // Validasi timeframe sumber dan target.
      if (
        !isTimeframeAllowed(
          activeDatasetTimeframe,
          newTimeframe
        )
      ) {
        setGlobalError(
          `Timeframe ${newTimeframe} tidak diperbolehkan ` +
          `untuk timeframe sumber ${activeDatasetTimeframe}`
        );

        return;
      }

      setGlobalError(null);

      if (newTimeframe === activeTimeframe) {
        return;
      }

      const safeIndex = sourceCandles.length > 0
        ? Math.max(
            0,
            Math.min(
              currentIndex,
              sourceCandles.length - 1
            )
          )
        : 0;

      setActiveTimeframe(newTimeframe);

      updateVisibleCandles(
        safeIndex,
        newTimeframe
      );

      triggerDebouncedSave(
        safeIndex,
        newTimeframe,
        replaySpeed
      );
    },
    [
      activeDatasetTimeframe,
      activeTimeframe,
      sourceCandles.length,
      currentIndex,
      setActiveTimeframe,
      setGlobalError,
      replaySpeed,
      updateVisibleCandles,
      triggerDebouncedSave,
    ]
  );

  // =========================================================
  // CHANGE REPLAY SPEED
  // =========================================================

  const handleChangeSpeed = useCallback(
    (speed: number) => {
      setReplaySpeed(speed);

      triggerDebouncedSave(
        currentIndex,
        activeTimeframe,
        speed
      );
    },
    [
      setReplaySpeed,
      currentIndex,
      activeTimeframe,
      triggerDebouncedSave,
    ]
  );

  // =========================================================
  // JUMP TO DATE / TIMESTAMP
  // =========================================================

  const handleJumpToTimestamp = useCallback(
    (targetTimestamp: number) => {
      if (sourceCandles.length === 0) {
        return;
      }

      const foundIndex = findCandleIndexAtOrAfter(
        sourceCandles,
        targetTimestamp
      );

      const targetIndex =
        foundIndex === -1
          ? sourceCandles.length - 1
          : foundIndex;

      setCurrentIndex(targetIndex);

      updateVisibleCandles(
        targetIndex,
        activeTimeframe
      );

      triggerDebouncedSave(
        targetIndex,
        activeTimeframe,
        replaySpeed
      );
    },
    [
      sourceCandles,
      findCandleIndexAtOrAfter,
      setCurrentIndex,
      updateVisibleCandles,
      activeTimeframe,
      triggerDebouncedSave,
      replaySpeed,
    ]
  );

  // =========================================================
  // AUTOPLAY TIMER
  // =========================================================

  useEffect(() => {
    if (replayTimerRef.current !== null) {
      clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }

    if (!isPlaying || sourceCandles.length === 0) {
      return;
    }

    const intervalMs = Math.max(
      30,
      Math.round(
        1000 / Math.max(replaySpeed, 0.1)
      )
    );

    replayTimerRef.current = setInterval(() => {
      setCurrentIndex((previousIndex) => {
        if (
          previousIndex >= sourceCandles.length - 1
        ) {
          setIsPlaying(false);
          return previousIndex;
        }

        const nextIndex = previousIndex + 1;

        updateVisibleCandles(
          nextIndex,
          activeTimeframe
        );

        return nextIndex;
      });
    }, intervalMs);

    return () => {
      if (replayTimerRef.current !== null) {
        clearInterval(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    };
  }, [
    isPlaying,
    replaySpeed,
    sourceCandles.length,
    setCurrentIndex,
    setIsPlaying,
    updateVisibleCandles,
    activeTimeframe,
  ]);

  // =========================================================
  // CLEANUP TIMERS
  // =========================================================

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
      }

      if (replayTimerRef.current !== null) {
        clearInterval(replayTimerRef.current);
      }
    };
  }, []);

  // =========================================================
  // RETURN
  // =========================================================

  return {
    isSaving,
    handleNextCandle,
    handlePrevCandle,
    handleReset,
    handleSeek,
    handleChangeTimeframe,
    handleChangeSpeed,
    handleJumpToTimestamp,
  };
}


import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { Header } from './components/Header.js';
import SessionsPage from './pages/SessionsPage.js';
import ChartPage from './pages/ChartPage.js';

import { useTheme } from './hooks/useTheme.js';
import { useChartPreferences } from './hooks/useChartPreferences.js';
import { useReplayKeyboard } from './hooks/useReplayKeyboard.js';

import type {
  BacktestSession,
  Dataset,
  Candle,
  Timeframe,
} from './types/index.js';

import {
  fetchSessions,
  fetchSession,
  fetchDataset,
  fetchCandles,
  saveReplayState,
  fetchDrawings,
  fetchPreference,
  deleteSession as apiDeleteSession,
} from './services/api.js';

import {
  aggregateCandles,
  isTimeframeAllowed,
} from './server/timeframeAggregator.js';

import { AlertCircle } from 'lucide-react';

type AppProps = {
  mode: 'SESSIONS' | 'CHART' | 'BACKTEST';
};

export default function App({ mode }: AppProps) {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  const currentView: 'SESSIONS' | 'CHART' =
    mode === 'SESSIONS' ? 'SESSIONS' : 'CHART';

  // =========================================================
  // THEME
  // =========================================================

  const { isDarkMode, toggleTheme } = useTheme();

  // =========================================================
  // SESSIONS & NAVIGATION
  // =========================================================

  const [sessions, setSessions] = useState<BacktestSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // =========================================================
  // ACTIVE SESSION & DATASET
  // =========================================================

  const [activeSession, setActiveSession] =
    useState<BacktestSession | null>(null);

  const {
    activeTimezone,
    showVolume,
    volumeType,
    indicators,
    drawings,
    setDrawings,
    loadChartPreferences,
    resetChartPreferences,
    handleUpdateDrawings,
    handleChangeTimezone,
    handleToggleVolume,
    handleChangeVolumeType,
    handleUpdateIndicators,
  } = useChartPreferences({ activeSession });

  const [activeDataset, setActiveDataset] =
    useState<Dataset | null>(null);

  const [sourceCandles, setSourceCandles] = useState<Candle[]>([]);
  const [displayCandles, setDisplayCandles] = useState<Candle[]>([]);

  // =========================================================
  // REPLAY STATE
  // =========================================================

  const [currentIndex, setCurrentIndex] = useState(0);

  const [activeTimeframe, setActiveTimeframe] =
    useState<Timeframe>('M1');

  const [isPlaying, setIsPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1.0);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // =========================================================
  // TIMER & DEBOUNCE REFERENCES
  // =========================================================

  const replayTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const saveTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentLoadedSessionIdRef =
    useRef<string | null>(null);

  // =========================================================
  // LOAD SESSIONS
  // =========================================================

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    setGlobalError(null);

    try {
      const data = await fetchSessions();
      setSessions(data);
      return data;
    } catch (err: unknown) {
      console.error('Failed to load sessions:', err);

      const message =
        err instanceof Error ? err.message : String(err);

      setGlobalError(
        'Gagal memuat daftar sesi dari database: ' + message
      );

      return [];
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // =========================================================
  // OPEN SESSION FROM URL
  // =========================================================

  const handleOpenSession = useCallback(
    async (id: string) => {
      setIsChartLoading(true);
      setIsPlaying(false);
      setGlobalError(null);

      try {
        const session = await fetchSession(id);

        if (!session) {
          throw new Error('Sesi tidak ditemukan.');
        }

        const dataset = await fetchDataset(session.datasetId);

        if (!dataset) {
          throw new Error('Dataset untuk sesi ini tidak ditemukan.');
        }

        setActiveSession(session);
        setActiveDataset(dataset);

        let tf = (
          session.activeTimeframe || dataset.timeframe
        ) as Timeframe;

        if (!isTimeframeAllowed(dataset.timeframe, tf)) {
          tf = dataset.timeframe;
        }

        setActiveTimeframe(tf);
        setReplaySpeed(session.replaySpeed || 1.0);

        const [loadedDrawings, loadedPref] = await Promise.all([
          fetchDrawings(session.id).catch(() => []),
          fetchPreference(session.id).catch(() => null),
        ]);

        loadChartPreferences(
          loadedDrawings || [],
          loadedPref
        );

        const candlesData = await fetchCandles({
          datasetId: session.datasetId,
          timeframe: dataset.timeframe,
          limit: 200000,
        });

        const raw = candlesData?.candles || [];

        setSourceCandles(raw);

        // Defaultnya tampilkan FULL semua bar (raw.length - 1)
        let targetIndex = raw.length > 0 ? raw.length - 1 : 0;

        if (raw.length > 0) {
          const targetTime = Number(session.currentReplayTime);

          if (targetTime && !Number.isNaN(targetTime) && targetTime > 0) {
            const found = raw.findIndex(
              (candle) => candle.timestamp >= targetTime
            );

            targetIndex =
              found !== -1 ? found : raw.length - 1;
          } else if (
            session.currentCandleIndex !== undefined &&
            session.currentCandleIndex !== null &&
            Number(session.currentCandleIndex) > 0
          ) {
            targetIndex = Math.max(
              0,
              Math.min(
                Number(session.currentCandleIndex) || 0,
                raw.length - 1
              )
            );
          } else {
            // Default: full semua bar
            targetIndex = raw.length - 1;
          }

          const cutoffTime =
            raw[targetIndex]?.timestamp ||
            raw[0]?.timestamp ||
            0;

          const aggregated = aggregateCandles(
            raw,
            dataset.timeframe,
            tf,
            cutoffTime
          );

          setDisplayCandles(aggregated);
        } else {
          setDisplayCandles([]);
        }

        setCurrentIndex(targetIndex);

        localStorage.setItem('active_session_id', session.id);
      } catch (err: unknown) {
        console.error('Error opening session:', err);

        const message =
          err instanceof Error ? err.message : String(err);

        setGlobalError('Gagal membuka sesi: ' + message);

        setActiveSession(null);
        setActiveDataset(null);
        setSourceCandles([]);
        setDisplayCandles([]);
        resetChartPreferences();
      } finally {
        setIsChartLoading(false);
      }
    },
    [loadChartPreferences, resetChartPreferences]
  );

  // =========================================================
  // INITIAL LOAD & URL SESSION CHANGES
  // =========================================================

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (sessionId) {
      // Hanya muat sesi jika ID sesi di URL benar-benar berubah
      if (currentLoadedSessionIdRef.current !== sessionId) {
        currentLoadedSessionIdRef.current = sessionId;
        void handleOpenSession(sessionId);
      }
      return;
    }

    currentLoadedSessionIdRef.current = null;
    setIsPlaying(false);
    setActiveSession(null);
    setActiveDataset(null);
    setSourceCandles([]);
    setDisplayCandles([]);
    resetChartPreferences();
    setCurrentIndex(0);
    setIsChartLoading(false);
  }, [sessionId, handleOpenSession, resetChartPreferences]);

  // =========================================================
  // UPDATE VISIBLE CANDLES
  // =========================================================

  const updateVisibleCandles = useCallback(
    (index: number, tf: Timeframe) => {
      if (sourceCandles.length === 0 || !activeDataset) {
        return;
      }

      const clampedIndex = Math.max(
        0,
        Math.min(index, sourceCandles.length - 1)
      );

      const currentCandle = sourceCandles[clampedIndex];

      if (!currentCandle) {
        return;
      }

      const aggregated = aggregateCandles(
        sourceCandles,
        activeDataset.timeframe,
        tf,
        currentCandle.timestamp
      );

      setDisplayCandles(aggregated);
    },
    [sourceCandles, activeDataset]
  );

  // =========================================================
  // SAVE REPLAY POSITION
  // =========================================================

  const triggerDebouncedSave = useCallback(
    (index: number, tf: Timeframe, speed: number) => {
      if (!activeSession || sourceCandles.length === 0) {
        return;
      }

      const candle = sourceCandles[index];

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
            currentIndex: index,
            speed,
            activeTimeframe: tf,
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
  // REPLAY: NEXT CANDLE
  // =========================================================

  const handleNextCandle = useCallback(() => {
    if (currentIndex >= sourceCandles.length - 1) {
      setIsPlaying(false);
      return;
    }

    const nextIndex = currentIndex + 1;

    setCurrentIndex(nextIndex);
    updateVisibleCandles(nextIndex, activeTimeframe);

    triggerDebouncedSave(
      nextIndex,
      activeTimeframe,
      replaySpeed
    );
  }, [
    currentIndex,
    sourceCandles.length,
    updateVisibleCandles,
    activeTimeframe,
    triggerDebouncedSave,
    replaySpeed,
  ]);

  // =========================================================
  // REPLAY: PREVIOUS CANDLE
  // =========================================================

  const handlePrevCandle = useCallback(() => {
    if (currentIndex <= 0) {
      return;
    }

    const prevIndex = currentIndex - 1;

    setCurrentIndex(prevIndex);
    updateVisibleCandles(prevIndex, activeTimeframe);

    triggerDebouncedSave(
      prevIndex,
      activeTimeframe,
      replaySpeed
    );
  }, [
    currentIndex,
    updateVisibleCandles,
    activeTimeframe,
    triggerDebouncedSave,
    replaySpeed,
  ]);

  // =========================================================
  // REPLAY: RESET
  // =========================================================

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);

    updateVisibleCandles(0, activeTimeframe);

    triggerDebouncedSave(0, activeTimeframe, replaySpeed);
  }, [
    updateVisibleCandles,
    activeTimeframe,
    triggerDebouncedSave,
    replaySpeed,
  ]);

  // =========================================================
  // REPLAY: SEEK
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
      updateVisibleCandles(clampedIndex, activeTimeframe);

      triggerDebouncedSave(
        clampedIndex,
        activeTimeframe,
        replaySpeed
      );
    },
    [
      sourceCandles.length,
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
      if (!activeDataset) {
        return;
      }

      if (
        !isTimeframeAllowed(
          activeDataset.timeframe,
          newTimeframe
        )
      ) {
        setGlobalError(
          `Timeframe ${newTimeframe} tidak diperbolehkan ` +
          `untuk timeframe sumber ${activeDataset.timeframe}`
        );
        return;
      }

      setGlobalError(null);
      setActiveTimeframe(newTimeframe);

      updateVisibleCandles(currentIndex, newTimeframe);

      triggerDebouncedSave(
        currentIndex,
        newTimeframe,
        replaySpeed
      );
    },
    [
      activeDataset,
      currentIndex,
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

      let foundIndex = sourceCandles.findIndex(
        (candle) => candle.timestamp >= targetTimestamp
      );

      if (foundIndex === -1) {
        foundIndex = sourceCandles.length - 1;
      }

      setCurrentIndex(foundIndex);
      updateVisibleCandles(foundIndex, activeTimeframe);

      triggerDebouncedSave(
        foundIndex,
        activeTimeframe,
        replaySpeed
      );
    },
    [
      sourceCandles,
      updateVisibleCandles,
      activeTimeframe,
      triggerDebouncedSave,
      replaySpeed,
    ]
  );

  // =========================================================
  // REPLAY AUTOPLAY TIMER
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
      Math.round(1000 / Math.max(replaySpeed, 0.1))
    );

    replayTimerRef.current = setInterval(() => {
      setCurrentIndex((previousIndex) => {
        if (previousIndex >= sourceCandles.length - 1) {
          setIsPlaying(false);
          return previousIndex;
        }

        const nextIndex = previousIndex + 1;

        updateVisibleCandles(nextIndex, activeTimeframe);

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
    updateVisibleCandles,
    activeTimeframe,
  ]);

  // =========================================================
  // KEYBOARD SHORTCUTS — MOVED TO useReplayKeyboard
  // =========================================================

  useReplayKeyboard({
    enabled: currentView === 'CHART',
    setIsPlaying,
    handleNextCandle,
    handlePrevCandle,
  });

  // =========================================================
  // DELETE SESSION
  // =========================================================

  const handleDeleteSession = async (id: string) => {
    try {
      await apiDeleteSession(id);

      if (activeSession?.id === id) {
        setIsPlaying(false);

        localStorage.removeItem('active_session_id');

        setActiveSession(null);
        setActiveDataset(null);
        setSourceCandles([]);
        setDisplayCandles([]);
        resetChartPreferences();
        setCurrentIndex(0);

        navigate('/sessions');
      }

      await loadSessions();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : String(err);

      setGlobalError('Gagal menghapus sesi: ' + message);
    }
  };

  // =========================================================
  // CHART DATA
  // =========================================================

  const hasRealVolume = useMemo(
    () =>
      sourceCandles.some(
        (candle) => (candle.realVolume || 0) > 0
      ),
    [sourceCandles]
  );

  const currentTimestamp =
    sourceCandles[currentIndex]?.timestamp || 0;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors font-sans">
      <Header
        currentView={currentView}
        activeSessionName={activeSession?.name}
        activeSessionSymbol={activeSession?.symbol || 'XAUUSD'}
        onBackToSessions={() => {
          setIsPlaying(false);
          localStorage.removeItem('active_session_id');
          navigate('/sessions');
          void loadSessions();
        }}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      {globalError && (
        <div className="bg-rose-50 dark:bg-rose-950/80 border-b border-rose-200 dark:border-rose-900 px-4 py-2 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 z-40">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{globalError}</span>
          </div>

          <button
            type="button"
            onClick={() => setGlobalError(null)}
            className="text-xs font-bold hover:underline ml-4 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {mode === 'SESSIONS' ? (
          <SessionsPage
            sessions={sessions}
            isLoading={isLoadingSessions}
            isCreateModalOpen={isCreateModalOpen}
            onSelectSession={(id) => {
              navigate(`/chart/${encodeURIComponent(id)}`);
            }}
            onOpenCreateModal={() => {
              setIsCreateModalOpen(true);
            }}
            onDeleteSession={handleDeleteSession}
            onCloseCreateModal={() => {
              setIsCreateModalOpen(false);
            }}
            onSessionCreated={async (id) => {
              setIsCreateModalOpen(false);
              await loadSessions();
              navigate(`/chart/${encodeURIComponent(id)}`);
            }}
          />
        ) : (
          <ChartPage
            mode={mode}
            sessionId={sessionId}
            activeSession={activeSession}
            activeDataset={activeDataset}
            sourceCandles={sourceCandles}
            displayCandles={displayCandles}
            currentIndex={currentIndex}
            currentTimestamp={currentTimestamp}
            activeTimeframe={activeTimeframe}
            activeTimezone={activeTimezone}
            isDarkMode={isDarkMode}
            isChartLoading={isChartLoading}
            isPlaying={isPlaying}
            replaySpeed={replaySpeed}
            isSaving={isSaving}
            drawings={drawings}
            indicators={indicators}
            showVolume={showVolume}
            volumeType={volumeType}
            hasRealVolume={hasRealVolume}
            onRetryOpenSession={() => {
              if (sessionId) {
                currentLoadedSessionIdRef.current = null;
                void handleOpenSession(sessionId);
              }
            }}
            onChangeTimeframe={handleChangeTimeframe}
            onChangeTimezone={handleChangeTimezone}
            onUpdateDrawings={handleUpdateDrawings}
            onUpdateIndicators={handleUpdateIndicators}
            onToggleVolume={handleToggleVolume}
            onChangeVolumeType={handleChangeVolumeType}
            onPlayPause={() => {
              setIsPlaying((playing) => !playing);
            }}
            onNextCandle={handleNextCandle}
            onPrevCandle={handlePrevCandle}
            onReset={handleReset}
            onSeek={handleSeek}
            onChangeSpeed={handleChangeSpeed}
            onJumpToTimestamp={handleJumpToTimestamp}
          />
        )}
      </main>
    </div>
  );
}

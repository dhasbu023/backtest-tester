
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';


import { useNavigate, useParams } from 'react-router-dom';
import SessionsPage from './pages/SessionsPage.js';
import ChartPage from './pages/ChartPage.js';
import DashboardPage from './pages/DashboardPage.js';

import MainLayout from './layouts/MainLayout.js';

import { useTheme } from './hooks/useTheme.js';
import { useChartPreferences } from './hooks/useChartPreferences.js';
import { useReplayKeyboard } from './hooks/useReplayKeyboard.js';
import { useReplayControls } from './hooks/useReplayControls.js';
import { useActiveSession } from './hooks/useActiveSession.js';

import type {
  BacktestSession,
  Dataset,
  Candle,
  Timeframe,
} from './types/index.js';

import { useSessions } from './hooks/useSessions.js';

import {
  aggregateCandles,
} from './server/timeframeAggregator.js';

import { AlertCircle } from 'lucide-react';

type AppProps = {
  mode:
    | 'DASHBOARD'
    | 'SESSIONS'
    | 'STATISTICS'
    | 'CHART'
    | 'BACKTEST';
};

type AggregationCache = {
  source: Candle[];
  sourceTimeframe: Timeframe;
  targetTimeframe: Timeframe;
  sourceIndex: number;
  result: Candle[];
};

export default function App({ mode }: AppProps) {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();



  // =========================================================
  // THEME
  // =========================================================

  const { isDarkMode, toggleTheme } = useTheme();

  // =========================================================
  // SESSIONS & NAVIGATION
  // =========================================================

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
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [isChartLoading, setIsChartLoading] = useState(false);


  // =========================================================
  // REFERENCES
  // =========================================================

  const currentLoadedSessionIdRef = useRef<string | null>(null);

  const aggregationCacheRef =
    useRef<AggregationCache | null>(null);



  // =========================================================
// SESSIONS HOOK
// =========================================================

const handleSessionError = useCallback((message: string) => {
  setGlobalError(message);
}, []);

const handleActiveSessionDeleted = useCallback(() => {
  setIsPlaying(false);

  localStorage.removeItem('active_session_id');

  setActiveSession(null);
  setActiveDataset(null);
  setSourceCandles([]);
  setDisplayCandles([]);
  setCurrentIndex(0);

  aggregationCacheRef.current = null;

  resetChartPreferences();

  navigate('/sessions');
}, [resetChartPreferences, navigate]);

const {
  sessions,
  isLoadingSessions,
  loadSessions,
  handleDeleteSession,
} = useSessions({
  activeSessionId: activeSession?.id ?? null,
  onActiveSessionDeleted: handleActiveSessionDeleted,
  onError: handleSessionError,
});

  // =========================================================
  // AGGREGATION HELPER
  // =========================================================

  const getAggregatedCandles = useCallback(
    (
      source: Candle[],
      sourceTf: Timeframe,
      targetTf: Timeframe,
      sourceIndex: number
    ): Candle[] => {
      if (source.length === 0) {
        return [];
      }

      const safeIndex = Math.max(
        0,
        Math.min(sourceIndex, source.length - 1)
      );

      const cached = aggregationCacheRef.current;

      if (
        cached &&
        cached.source === source &&
        cached.sourceTimeframe === sourceTf &&
        cached.targetTimeframe === targetTf &&
        cached.sourceIndex === safeIndex
      ) {
        return cached.result;
      }

      const currentCandle = source[safeIndex];

      if (!currentCandle) {
        return [];
      }

      const result = aggregateCandles(
        source,
        sourceTf,
        targetTf,
        currentCandle.timestamp
      );

      aggregationCacheRef.current = {
        source,
        sourceTimeframe: sourceTf,
        targetTimeframe: targetTf,
        sourceIndex: safeIndex,
        result,
      };

      return result;
    },
    []
  );


  // =========================================================
// CLEAR AGGREGATION CACHE
// =========================================================

const clearAggregationCache = useCallback(() => {
  aggregationCacheRef.current = null;
}, []);

  // =========================================================
  // TIMESTAMP SEARCH
  // =========================================================

  const findCandleIndexAtOrAfter = useCallback(
    (candles: Candle[], targetTimestamp: number): number => {
      let left = 0;
      let right = candles.length;

      while (left < right) {
        const middle = left + Math.floor((right - left) / 2);

        if (candles[middle].timestamp < targetTimestamp) {
          left = middle + 1;
        } else {
          right = middle;
        }
      }

      return left < candles.length ? left : -1;
    },
    []
  );

  // =========================================================
  // ACTIVE SESSION HOOK
  // =========================================================

  const {
    handleOpenSession,
    cancelOpenSession,
  } = useActiveSession({
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
  });


  // =========================================================
  // INITIAL LOAD & URL SESSION CHANGES
  // =========================================================

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  
useEffect(() => {
  if (sessionId) {
    if (currentLoadedSessionIdRef.current !== sessionId) {
      currentLoadedSessionIdRef.current = sessionId;
      void handleOpenSession(sessionId);
    }

    return;
  }

  // Batalkan proses loading sesi sebelumnya.
  cancelOpenSession();

  currentLoadedSessionIdRef.current = null;

  setIsPlaying(false);
  setActiveSession(null);
  setActiveDataset(null);
  setSourceCandles([]);
  setDisplayCandles([]);
  setCurrentIndex(0);
  setIsChartLoading(false);

  aggregationCacheRef.current = null;

  resetChartPreferences();
}, [
  sessionId,
  handleOpenSession,
  cancelOpenSession,
  resetChartPreferences,
]);


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

      const cached = aggregationCacheRef.current;

      if (
        cached &&
        cached.source === sourceCandles &&
        cached.sourceTimeframe === activeDataset.timeframe &&
        cached.targetTimeframe === tf &&
        cached.sourceIndex === clampedIndex
      ) {
        return;
      }

      const aggregated = getAggregatedCandles(
        sourceCandles,
        activeDataset.timeframe,
        tf,
        clampedIndex
      );

      setDisplayCandles(aggregated);
    },
    [sourceCandles, activeDataset, getAggregatedCandles]
  );


  // =========================================================
// REPLAY CONTROLS HOOK
// =========================================================

const {
  isSaving,
  handleNextCandle,
  handlePrevCandle,
  handleReset,
  handleSeek,
  handleChangeTimeframe,
  handleChangeSpeed,
  handleJumpToTimestamp,
} = useReplayControls({
  activeSession,
  sourceCandles,
  currentIndex,
  activeTimeframe,
  replaySpeed,
  activeDatasetTimeframe: activeDataset?.timeframe ?? null,
  isPlaying,
  setCurrentIndex,
  setActiveTimeframe,
  setReplaySpeed,
  setIsPlaying,
  setGlobalError,
  updateVisibleCandles,
  findCandleIndexAtOrAfter,
});
  
  


  // =========================================================
  // KEYBOARD SHORTCUTS
  // =========================================================

  useReplayKeyboard({
  enabled: mode === 'CHART' || mode === 'BACKTEST',
  setIsPlaying,
  handleNextCandle,
  handlePrevCandle,
});
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
    <MainLayout
      isDarkMode={isDarkMode}
      onToggleTheme={toggleTheme}
    >
      {/* GLOBAL ERROR */}
      {globalError && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{globalError}</span>
          </div>

          <button
            type="button"
            onClick={() => setGlobalError(null)}
            className="text-xs font-bold hover:underline shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* DASHBOARD */}
      {mode === 'DASHBOARD' && (
        <DashboardPage
          sessions={sessions}
          isLoading={isLoadingSessions}
          onOpenCreateSession={() => {
            navigate('/sessions');
          }}
        />
      )}

      {/* SESSIONS */}
      {mode === 'SESSIONS' && (
        <SessionsPage
          sessions={sessions}
          isLoading={isLoadingSessions}
          isCreateModalOpen={isCreateModalOpen}
          onSelectSession={(id) => {
            setIsPlaying(false);
            localStorage.setItem('active_session_id', id);

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
      )}

      {/* CHART / BACKTEST */}
      {(mode === 'CHART' || mode === 'BACKTEST') && (
        <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
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
              setIsPlaying((previous) => !previous);
            }}
            onNextCandle={handleNextCandle}
            onPrevCandle={handlePrevCandle}
            onReset={handleReset}
            onSeek={handleSeek}
            onChangeSpeed={handleChangeSpeed}
            onJumpToTimestamp={handleJumpToTimestamp}
          />
        </div>
      )}

      {/* STATISTICS */}
      {mode === 'STATISTICS' && (
        <div className="p-6">
          <h1 className="text-xl font-bold">Statistics</h1>
          <p className="text-sm text-slate-500 mt-2">
            Halaman statistik belum dihubungkan.
          </p>
        </div>
      )}
    </MainLayout>
  );
}
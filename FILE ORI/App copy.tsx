import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Header } from './components/Header.js';
import { SessionList } from './components/SessionList.js';
import { CreateSessionModal } from './components/CreateSessionModal.js';
import { TradingChart } from './components/TradingChart.js';
import { ReplayControlPanel } from './components/ReplayControlPanel.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import {
  BacktestSession,
  Dataset,
  Candle,
  Timeframe,
  DrawingObject,
  IndicatorConfig,
} from './types/index.js';
import {
  fetchSessions,
  fetchSession,
  fetchDataset,
  fetchCandles,
  saveReplayState,
  fetchDrawings,
  saveDrawings,
  fetchPreference,
  savePreference,
  deleteSession as apiDeleteSession,
} from './services/api.js';
import { aggregateCandles, isTimeframeAllowed } from './server/timeframeAggregator.js';
import { AlertCircle } from 'lucide-react';

const DEFAULT_INDICATORS: IndicatorConfig[] = [
  { id: 'ema-9', type: 'EMA', name: 'EMA 9', visible: true, period: 9, color: '#3b82f6', strokeWidth: 2, pane: 'main' },
  { id: 'ema-21', type: 'EMA', name: 'EMA 21', visible: true, period: 21, color: '#f59e0b', strokeWidth: 2, pane: 'main' },
  { id: 'ema-200', type: 'EMA', name: 'EMA 200', visible: false, period: 200, color: '#ef4444', strokeWidth: 2, pane: 'main' },
];

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return true; // Default dark workstation
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Navigation & Sessions
  const [currentView, setCurrentView] = useState<'SESSIONS' | 'CHART'>('SESSIONS');
  const [sessions, setSessions] = useState<BacktestSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Active Replay Session State
  const [activeSession, setActiveSession] = useState<BacktestSession | null>(null);
  const [activeDataset, setActiveDataset] = useState<Dataset | null>(null);
  const [sourceCandles, setSourceCandles] = useState<Candle[]>([]);
  const [displayCandles, setDisplayCandles] = useState<Candle[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('M1');
  const [isPlaying, setIsPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1.0);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Preferences & Analysis State
  const [activeTimezone, setActiveTimezone] = useState<string>('Asia/Jakarta');
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [volumeType, setVolumeType] = useState<'TICK' | 'REAL'>('TICK');
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(DEFAULT_INDICATORS);
  const [drawings, setDrawings] = useState<DrawingObject[]>([]);

  const replayTimerRef = useRef<any>(null);
  const saveTimeoutRef = useRef<any>(null);
  const drawingSaveTimeoutRef = useRef<any>(null);
  const prefSaveTimeoutRef = useRef<any>(null);

  // Load Sessions from DB
  const loadSessions = async () => {
    setIsLoadingSessions(true);
    setGlobalError(null);
    try {
      const data = await fetchSessions();
      setSessions(data);
      return data;
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
      setGlobalError('Gagal memuat daftar sesi dari database: ' + err.message);
      return [];
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Open & Initialize a Session smoothly
  const handleOpenSession = async (sessionId: string) => {
    setIsChartLoading(true);
    setIsPlaying(false);
    setGlobalError(null);

    try {
      const session = await fetchSession(sessionId);
      if (!session) {
        throw new Error('Sesi tidak ditemukan.');
      }

      const dataset = await fetchDataset(session.datasetId);
      if (!dataset) {
        throw new Error('Dataset untuk sesi ini tidak ditemukan.');
      }

      setActiveSession(session);
      setActiveDataset(dataset);

      // Safe timeframe fallback: ensure activeTimeframe is never lower than source timeframe
      let tf = (session.activeTimeframe || dataset.timeframe) as Timeframe;
      if (!isTimeframeAllowed(dataset.timeframe, tf)) {
        tf = dataset.timeframe;
      }
      setActiveTimeframe(tf);
      setReplaySpeed(session.replaySpeed || 1.0);

      // Restore drawings & chart preferences
      try {
        const [loadedDrawings, loadedPref] = await Promise.all([
          fetchDrawings(session.id).catch(() => []),
          fetchPreference(session.id).catch(() => null),
        ]);
        setDrawings(loadedDrawings || []);
        if (loadedPref) {
          if (loadedPref.timezone) setActiveTimezone(loadedPref.timezone);
          if (loadedPref.showVolume !== undefined) setShowVolume(loadedPref.showVolume);
          if (loadedPref.volumeType) setVolumeType(loadedPref.volumeType);
          if (loadedPref.indicators && loadedPref.indicators.length > 0) {
            setIndicators(loadedPref.indicators);
          }
        }
      } catch (prefErr) {
        console.warn('Could not load preferences:', prefErr);
      }

      // Fetch all raw candles for this dataset (high limit to prevent cutting off data)
      const candlesData = await fetchCandles({
        datasetId: session.datasetId,
        timeframe: dataset.timeframe,
        limit: 200000,
      });

      const raw = candlesData?.candles || [];
      setSourceCandles(raw);

      let targetIndex = 0;
      if (raw.length > 0) {
        const targetTime = Number(session.currentReplayTime);
        if (targetTime && !isNaN(targetTime)) {
          const found = raw.findIndex((c) => c.timestamp >= targetTime);
          targetIndex = found !== -1 ? found : Math.max(0, raw.length - 1);
        } else if (session.currentCandleIndex !== undefined) {
          targetIndex = Math.min(Number(session.currentCandleIndex) || 0, Math.max(0, raw.length - 1));
        }

        const cutoffTime = raw[targetIndex]?.timestamp || raw[0]?.timestamp || 0;
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
      setCurrentView('CHART');
    } catch (err: any) {
      console.error('Error opening session:', err);
      setGlobalError('Gagal membuka sesi: ' + err.message);
    } finally {
      setIsChartLoading(false);
    }
  };

  // Restore session on initial load if saved in localStorage
  useEffect(() => {
    loadSessions().then((loadedSessions) => {
      const savedId = localStorage.getItem('active_session_id');
      if (savedId && loadedSessions && loadedSessions.some((s) => s.id === savedId)) {
        handleOpenSession(savedId);
      }
    });
  }, []);

  // Re-aggregate display candles whenever index or timeframe changes
  const updateVisibleCandles = useCallback((index: number, tf: Timeframe) => {
    if (sourceCandles.length === 0 || !activeDataset) return;

    const clampedIndex = Math.max(0, Math.min(index, sourceCandles.length - 1));
    const currentCandle = sourceCandles[clampedIndex];
    if (!currentCandle) return;

    const cutoffTimestamp = currentCandle.timestamp;
    const aggregated = aggregateCandles(
      sourceCandles,
      activeDataset.timeframe,
      tf,
      cutoffTimestamp
    );

    setDisplayCandles(aggregated);
  }, [sourceCandles, activeDataset]);

  // Debounced Save Replay Position
  const triggerDebouncedSave = useCallback((index: number, tf: Timeframe, speed: number) => {
    if (!activeSession || sourceCandles.length === 0) return;

    const candle = sourceCandles[index];
    if (!candle) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveReplayState(activeSession.id, {
          currentTime: candle.timestamp,
          currentIndex: index,
          speed,
          activeTimeframe: tf,
          isPlaying: false,
        });
      } catch (e) {
        console.warn('Auto-save error:', e);
      } finally {
        setIsSaving(false);
      }
    }, 600);
  }, [activeSession, sourceCandles]);

  // Debounced Save Drawings
  const handleUpdateDrawings = useCallback((newDrawings: DrawingObject[]) => {
    setDrawings(newDrawings);
    if (!activeSession) return;

    if (drawingSaveTimeoutRef.current) clearTimeout(drawingSaveTimeoutRef.current);
    drawingSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveDrawings(activeSession.id, newDrawings);
      } catch (err) {
        console.warn('Failed to save drawings:', err);
      }
    }, 500);
  }, [activeSession]);

  // Debounced Save Preferences
  const saveCurrentPreferences = useCallback((
    tz: string,
    volShow: boolean,
    vType: 'TICK' | 'REAL',
    inds: IndicatorConfig[]
  ) => {
    if (!activeSession) return;
    if (prefSaveTimeoutRef.current) clearTimeout(prefSaveTimeoutRef.current);

    prefSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await savePreference(activeSession.id, {
          sessionId: activeSession.id,
          timezone: tz,
          showVolume: volShow,
          volumeType: vType,
          indicators: inds,
        });
      } catch (err) {
        console.warn('Failed to save chart preferences:', err);
      }
    }, 500);
  }, [activeSession]);

  const handleChangeTimezone = (newTz: string) => {
    setActiveTimezone(newTz);
    saveCurrentPreferences(newTz, showVolume, volumeType, indicators);
  };

  const handleToggleVolume = () => {
    const nextVal = !showVolume;
    setShowVolume(nextVal);
    saveCurrentPreferences(activeTimezone, nextVal, volumeType, indicators);
  };

  const handleChangeVolumeType = (newType: 'TICK' | 'REAL') => {
    setVolumeType(newType);
    saveCurrentPreferences(activeTimezone, showVolume, newType, indicators);
  };

  const handleUpdateIndicators = (newInds: IndicatorConfig[]) => {
    setIndicators(newInds);
    saveCurrentPreferences(activeTimezone, showVolume, volumeType, newInds);
  };

  // Replay Step Forward
  const handleNextCandle = useCallback(() => {
    if (currentIndex >= sourceCandles.length - 1) {
      setIsPlaying(false);
      return;
    }
    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);
    updateVisibleCandles(nextIdx, activeTimeframe);
    triggerDebouncedSave(nextIdx, activeTimeframe, replaySpeed);
  }, [currentIndex, sourceCandles.length, updateVisibleCandles, activeTimeframe, triggerDebouncedSave, replaySpeed]);

  // Replay Step Backward
  const handlePrevCandle = useCallback(() => {
    if (currentIndex <= 0) return;
    const prevIdx = currentIndex - 1;
    setCurrentIndex(prevIdx);
    updateVisibleCandles(prevIdx, activeTimeframe);
    triggerDebouncedSave(prevIdx, activeTimeframe, replaySpeed);
  }, [currentIndex, updateVisibleCandles, activeTimeframe, triggerDebouncedSave, replaySpeed]);

  // Replay Reset
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
    updateVisibleCandles(0, activeTimeframe);
    triggerDebouncedSave(0, activeTimeframe, replaySpeed);
  }, [updateVisibleCandles, activeTimeframe, triggerDebouncedSave, replaySpeed]);

  // Seek / Scrub
  const handleSeek = (newIndex: number) => {
    const clamped = Math.max(0, Math.min(newIndex, sourceCandles.length - 1));
    setCurrentIndex(clamped);
    updateVisibleCandles(clamped, activeTimeframe);
    triggerDebouncedSave(clamped, activeTimeframe, replaySpeed);
  };

  // Change Timeframe
  const handleChangeTimeframe = (newTf: Timeframe) => {
    if (!activeDataset) return;
    if (!isTimeframeAllowed(activeDataset.timeframe, newTf)) {
      setGlobalError(`Timeframe ${newTf} tidak diperbolehkan untuk timeframe sumber ${activeDataset.timeframe}`);
      return;
    }

    setActiveTimeframe(newTf);
    updateVisibleCandles(currentIndex, newTf);
    triggerDebouncedSave(currentIndex, newTf, replaySpeed);
  };

  // Change Speed
  const handleChangeSpeed = (speed: number) => {
    setReplaySpeed(speed);
    triggerDebouncedSave(currentIndex, activeTimeframe, speed);
  };

  // Jump to specific timestamp
  const handleJumpToTimestamp = (targetTimestamp: number) => {
    if (sourceCandles.length === 0) return;
    let foundIdx = sourceCandles.findIndex((c) => c.timestamp >= targetTimestamp);
    if (foundIdx === -1) {
      foundIdx = sourceCandles.length - 1;
    }
    setCurrentIndex(foundIdx);
    updateVisibleCandles(foundIdx, activeTimeframe);
    triggerDebouncedSave(foundIdx, activeTimeframe, replaySpeed);
  };

  // Autoplay Timer Loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(30, Math.round(1000 / replaySpeed));
      replayTimerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= sourceCandles.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          const next = prev + 1;
          updateVisibleCandles(next, activeTimeframe);
          return next;
        });
      }, intervalMs);
    } else {
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
      }
      if (sourceCandles.length > 0) {
        triggerDebouncedSave(currentIndex, activeTimeframe, replaySpeed);
      }
    }

    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [isPlaying, replaySpeed, sourceCandles.length, updateVisibleCandles, activeTimeframe, triggerDebouncedSave, currentIndex]);

  // Keyboard Shortcuts (Space: Play/Pause, Right: Next, Left: Prev)
  useEffect(() => {
    if (currentView !== 'CHART') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNextCandle();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrevCandle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, handleNextCandle, handlePrevCandle]);

  // Delete session
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await apiDeleteSession(sessionId);
      await loadSessions();
      if (activeSession?.id === sessionId) {
        localStorage.removeItem('active_session_id');
        setCurrentView('SESSIONS');
        setActiveSession(null);
      }
    } catch (err: any) {
      setGlobalError('Gagal menghapus sesi: ' + err.message);
    }
  };

  const hasRealVolume = useMemo(() => {
    return sourceCandles.some((c) => (c.realVolume || 0) > 0);
  }, [sourceCandles]);

  const currentRevealedCandle = sourceCandles[currentIndex];
  const currentTimestamp = currentRevealedCandle?.timestamp || 0;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors font-sans">
      {/* Workstation Header */}
      <Header
        currentView={currentView}
        activeSessionName={activeSession?.name}
        activeSessionSymbol={activeSession?.symbol || 'XAUUSD'}
        onBackToSessions={() => {
          setIsPlaying(false);
          localStorage.removeItem('active_session_id');
          setCurrentView('SESSIONS');
          loadSessions();
        }}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((d) => !d)}
      />

      {/* Global Error Banner */}
      {globalError && (
        <div className="bg-rose-50 dark:bg-rose-950/80 border-b border-rose-200 dark:border-rose-900 px-4 py-2 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 z-40">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{globalError}</span>
          </div>
          <button
            onClick={() => setGlobalError(null)}
            className="text-xs font-bold hover:underline ml-4 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {currentView === 'SESSIONS' ? (
          <div className="flex-1 overflow-y-auto">
            <SessionList
              sessions={sessions}
              isLoading={isLoadingSessions}
              onSelectSession={handleOpenSession}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              onDeleteSession={handleDeleteSession}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 w-full h-full">
            {/* Chart Area protected with ErrorBoundary */}
            <div className="flex-1 w-full min-h-0 relative">
              <ErrorBoundary
                fallbackTitle="Terjadi kendala visual pada chart replay"
                onReset={() => {
                  if (activeSession) handleOpenSession(activeSession.id);
                }}
              >
                <TradingChart
                  candles={displayCandles}
                  symbol={activeSession?.symbol || 'XAUUSD'}
                  timeframe={activeTimeframe}
                  sourceTimeframe={activeDataset?.timeframe || 'M1'}
                  onChangeTimeframe={handleChangeTimeframe}
                  isDarkMode={isDarkMode}
                  isLoading={isChartLoading}
                  sessionId={activeSession?.id || ''}
                  activeTimezone={activeTimezone}
                  onChangeTimezone={handleChangeTimezone}
                  drawings={drawings}
                  onUpdateDrawings={handleUpdateDrawings}
                  indicators={indicators}
                  onUpdateIndicators={handleUpdateIndicators}
                  showVolume={showVolume}
                  onToggleVolume={handleToggleVolume}
                  volumeType={volumeType}
                  onChangeVolumeType={handleChangeVolumeType}
                  hasRealVolume={hasRealVolume}
                />
              </ErrorBoundary>
            </div>

            {/* Bottom Replay Control Panel */}
            <ReplayControlPanel
              currentIndex={currentIndex}
              totalCandles={sourceCandles.length}
              currentTimestamp={currentTimestamp}
              sourceTimeframe={activeDataset?.timeframe || 'M1'}
              activeTimeframe={activeTimeframe}
              activeTimezone={activeTimezone}
              isPlaying={isPlaying}
              replaySpeed={replaySpeed}
              isSaving={isSaving}
              onPlayPause={() => setIsPlaying((p) => !p)}
              onNextCandle={handleNextCandle}
              onPrevCandle={handlePrevCandle}
              onReset={handleReset}
              onSeek={handleSeek}
              onChangeSpeed={handleChangeSpeed}
              onChangeTimeframe={handleChangeTimeframe}
              onJumpToTimestamp={handleJumpToTimestamp}
            />
          </div>
        )}
      </main>

      {/* Create Session & Upload Modal */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSessionCreated={async (id) => {
          await loadSessions();
          await handleOpenSession(id);
        }}
      />
    </div>
  );
}

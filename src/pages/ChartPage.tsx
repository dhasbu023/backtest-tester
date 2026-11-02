
import { useState } from 'react';

import { TradingChart } from '../components/Chart/TradingChart.js';
import { ReplayControlPanel } from '../components/Chart/ReplayControlPanel.js';
import { ErrorBoundary } from '../components/Chart/ErrorBoundary.js';
import OrderModal from '../components/Orders/OrderModal.js';

import type {
  BacktestSession,
  Dataset,
  Candle,
  Timeframe,
  DrawingObject,
  IndicatorConfig,
} from '../types/index.js';

import type { CreateOrderInput } from '../types/order';

type ChartPageProps = {
  mode: 'CHART' | 'BACKTEST';
  sessionId?: string;

  activeSession: BacktestSession | null;
  activeDataset: Dataset | null;

  sourceCandles: Candle[];
  displayCandles: Candle[];
  currentIndex: number;
  currentTimestamp: number;

  activeTimeframe: Timeframe;
  activeTimezone: string;
  isDarkMode: boolean;
  isChartLoading: boolean;

  isPlaying: boolean;
  replaySpeed: number;
  isSaving: boolean;

  drawings: DrawingObject[];
  indicators: IndicatorConfig[];

  showVolume: boolean;
  volumeType: 'TICK' | 'REAL';
  hasRealVolume: boolean;

  onRetryOpenSession: () => void;

  onChangeTimeframe: (timeframe: Timeframe) => void;
  onChangeTimezone: (timezone: string) => void;
  onUpdateDrawings: (drawings: DrawingObject[]) => void;
  onUpdateIndicators: (indicators: IndicatorConfig[]) => void;
  onToggleVolume: () => void;
  onChangeVolumeType: (type: 'TICK' | 'REAL') => void;

  onPlayPause: () => void;
  onNextCandle: () => void;
  onPrevCandle: () => void;
  onReset: () => void;
  onSeek: (index: number) => void;
  onChangeSpeed: (speed: number) => void;
  onJumpToTimestamp: (timestamp: number) => void;
};

export default function ChartPage({
  mode,
  sessionId,
  activeSession,
  activeDataset,
  sourceCandles,
  displayCandles,
  currentIndex,
  currentTimestamp,
  activeTimeframe,
  activeTimezone,
  isDarkMode,
  isChartLoading,
  isPlaying,
  replaySpeed,
  isSaving,
  drawings,
  indicators,
  showVolume,
  volumeType,
  hasRealVolume,
  onRetryOpenSession,
  onChangeTimeframe,
  onChangeTimezone,
  onUpdateDrawings,
  onUpdateIndicators,
  onToggleVolume,
  onChangeVolumeType,
  onPlayPause,
  onNextCandle,
  onPrevCandle,
  onReset,
  onSeek,
  onChangeSpeed,
  onJumpToTimestamp,
}: ChartPageProps) {
  const symbol = activeSession?.symbol || 'XAUUSD';
  const sourceTimeframe = activeDataset?.timeframe || 'M1';
  const activeSessionId = activeSession?.id || '';

  // REPLAY CONTROL
  const [showReplayControls, setShowReplayControls] = useState(false);

  // ORDER MODAL
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Ambil harga dari candle sumber pada posisi replay saat ini.
  // Ambil harga dari candle terakhir yang terlihat di chart.
// displayCandles berasal dari data replay yang sedang ditampilkan.
const lastDisplayedCandle =
  displayCandles.length > 0
    ? displayCandles[displayCandles.length - 1]
    : null;

// Fallback ke source candle pada posisi replay.
const currentReplayCandle =
  sourceCandles[currentIndex] ?? null;

const currentPrice =
  lastDisplayedCandle?.close ??
  currentReplayCandle?.close ??
  0;

const leverage = activeSession?.leverage || 500;

// Tombol aktif jika sesi tersedia dan harga valid.
// Tidak bergantung pada isChartLoading.
const canCreateOrder =
  showReplayControls &&
  Boolean(activeSessionId) &&
  Number.isFinite(currentPrice) &&
  currentPrice > 0;
  console.log('[DEBUG CREATE ORDER]', {
  showReplayControls,
  activeSessionId,
  currentPrice,
  isFinite: Number.isFinite(currentPrice),
  canCreateOrder,
});

  const handleToggleReplay = () => {
    setShowReplayControls((previous) => !previous);
  };

  const handleChartErrorReset = () => {
    if (sessionId) {
      onRetryOpenSession();
    }
  };

  // Sementara hanya mengaktifkan tampilan form.
  // Penyimpanan order akan dihubungkan ke backend pada tahap berikutnya.
  const handleCreateOrder = async (
    _input: CreateOrderInput
  ): Promise<void> => {
    throw new Error(
      'Penyimpanan order belum dihubungkan ke backend. Form order sudah aktif.'
    );
  };

  
  return (
    <main className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">

      {/* CHART AREA */}
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <ErrorBoundary
          fallbackTitle="Terjadi kendala visual pada chart"
          onReset={handleChartErrorReset}
        >
          <div className="relative h-full min-h-0 min-w-0 w-full flex-1 overflow-hidden">
           <TradingChart
              candles={displayCandles}
              symbol={symbol}
              timeframe={activeTimeframe}
              sourceTimeframe={sourceTimeframe}
              onChangeTimeframe={onChangeTimeframe}
              isDarkMode={isDarkMode}
              isLoading={isChartLoading}
              sessionId={activeSessionId}
              activeTimezone={activeTimezone}
              onChangeTimezone={onChangeTimezone}
              drawings={drawings}
              onUpdateDrawings={onUpdateDrawings}
              indicators={indicators}
              onUpdateIndicators={onUpdateIndicators}
              showVolume={showVolume}
              onToggleVolume={onToggleVolume}
              volumeType={volumeType}
              onChangeVolumeType={onChangeVolumeType}
              hasRealVolume={hasRealVolume}
              showReplayControls={showReplayControls}
              onToggleReplay={handleToggleReplay}
              onCreateOrderClick={() => setIsOrderModalOpen(true)}
              canCreateOrder={canCreateOrder}
            />
          </div>
        </ErrorBoundary>
      </section>

      {/* REPLAY CONTROL PANEL */}
      {showReplayControls && (
        <section className="relative z-20 w-full shrink-0 border-t border-slate-200 dark:border-slate-800">
          <ReplayControlPanel
            currentIndex={currentIndex}
            totalCandles={sourceCandles.length}
            currentTimestamp={currentTimestamp}
            sourceTimeframe={sourceTimeframe}
            activeTimeframe={activeTimeframe}
            activeTimezone={activeTimezone}
            isPlaying={isPlaying}
            replaySpeed={replaySpeed}
            isSaving={isSaving}
            onPlayPause={onPlayPause}
            onNextCandle={onNextCandle}
            onPrevCandle={onPrevCandle}
            onReset={onReset}
            onSeek={onSeek}
            onChangeSpeed={onChangeSpeed}
            onChangeTimeframe={onChangeTimeframe}
            onJumpToTimestamp={onJumpToTimestamp}
          />
        </section>
      )}

      {/* ORDER MODAL */}
      {showReplayControls && activeSessionId && (
        <OrderModal
          isOpen={isOrderModalOpen}
          sessionId={activeSessionId}
          currentPrice={currentPrice}
          leverage={leverage}
          onClose={() => setIsOrderModalOpen(false)}
          onSubmit={handleCreateOrder}
        />
      )}
    </main>
  );
}



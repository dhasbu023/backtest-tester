
import {
  useCallback,
  useState,
} from 'react';

import { createPortal } from 'react-dom';

import { useOrders } from '../hooks/useOrders';

import { TradingChart } from '../components/Chart/TradingChart.js';
import { DrawingToolbar } from '../components/Chart/DrawingToolbar.js';
import { ReplayControlPanel } from '../components/Chart/ReplayControlPanel.js';
import { ErrorBoundary } from '../components/Chart/ErrorBoundary.js';

import OrderModal from '../components/Orders/OrderModal.js';
import OrderPanel from '../components/ChartPage/components/OrderPanel';

import { useOrderPanelResize } from '../components/ChartPage/hooks/useOrderPanelResize';
import { useAutoCloseOrders } from '../components/ChartPage/hooks/useAutoCloseOrders';
import { useFloatingPnL } from '../components/ChartPage/hooks/useFloatingPnL';

import type {
  BacktestSession,
  Dataset,
  Candle,
  Timeframe,
  DrawingObject,
  IndicatorConfig,
  DrawingToolType,
} from '../types/index.js';

import type { CreateOrderInput } from '../types/order';

// ============================================
// DRAWING HISTORY TYPE
// ============================================

type DrawingHistoryControls = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearAll: () => void;
};

// ============================================
// PROPS
// ============================================

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

// ============================================
// COMPONENT
// ============================================

export default function ChartPage({
  mode,
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
  void mode;

  const symbol = activeSession?.symbol || 'XAUUSD';
  const sourceTimeframe = activeDataset?.timeframe || 'M1';
  const activeSessionId = activeSession?.id || '';

  // ==========================================
  // DRAWING TOOLBAR STATE
  // ==========================================

  const [activeTool, setActiveTool] =
    useState<DrawingToolType>('CURSOR');

  const [currentColor, setCurrentColor] =
    useState('#2962ff');

  const [currentStrokeWidth, setCurrentStrokeWidth] =
    useState(2);

  // ==========================================
  // DRAWING HISTORY
  // ==========================================

  const [drawingHistory, setDrawingHistory] =
    useState<DrawingHistoryControls>({
      canUndo: false,
      canRedo: false,
      onUndo: () => {},
      onRedo: () => {},
      onClearAll: () => {},
    });

  const handleDrawingHistoryChange = useCallback(
    (controls: DrawingHistoryControls) => {
      setDrawingHistory(controls);
    },
    []
  );

  // ==========================================
  // ORDER MANAGEMENT
  // ==========================================

  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
    refresh: refreshOrders,
    create: createOrder,
    cancel: cancelOrder,
    close: closeOrder,
    update: updateOrder,
  } = useOrders(activeSessionId || null);

  // ==========================================
  // CURRENT PRICE
  // ==========================================

  const currentReplayCandle =
    sourceCandles[currentIndex] ?? null;

  const currentPrice =
    currentReplayCandle?.close ?? 0;

  // ==========================================
  // AUTO CLOSE ORDERS
  // ==========================================

  useAutoCloseOrders({
    currentIndex,
    currentTimestamp,
    sourceCandles,
    activeSessionId,
    orders,
    closeOrder,
  });

  // ==========================================
  // FLOATING PNL
  // ==========================================

  const {
    floatingPnL,
    formattedFloatingPnL,
  } = useFloatingPnL({
    orders,
    currentPrice,
  });

  // ==========================================
  // REPLAY CONTROL
  // ==========================================

  const [showReplayControls, setShowReplayControls] =
    useState(false);

  const handleToggleReplay = useCallback(() => {
    setShowReplayControls((previous) => !previous);
  }, []);

  // ==========================================
  // ORDER PANEL
  // ==========================================

  const [showOrderPanel, setShowOrderPanel] =
    useState(true);

  const handleToggleOrderPanel = useCallback(() => {
    setShowOrderPanel((previous) => !previous);
  }, []);

  const {
    orderPanelHeight,
    getMaxPanelHeight,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
    handleResizeKeyboard,
  } = useOrderPanelResize();

  // ==========================================
  // ORDER MODAL
  // ==========================================

  const [isOrderModalOpen, setIsOrderModalOpen] =
    useState(false);

  const leverage = activeSession?.leverage ?? 1;

  const canCreateOrder =
    Boolean(activeSessionId) &&
    currentPrice > 0 &&
    !isChartLoading;

  const handleOpenOrderModal = useCallback(() => {
    if (!canCreateOrder) return;

    setIsOrderModalOpen(true);
  }, [canCreateOrder]);

  const handleCloseOrderModal = useCallback(() => {
    setIsOrderModalOpen(false);
  }, []);

  // ==========================================
  // CREATE ORDER
  // ==========================================

  const handleCreateOrder = useCallback(
    async (input: CreateOrderInput) => {
      if (!activeSessionId) {
        throw new Error('Session belum dipilih.');
      }

      await createOrder({
        ...input,
        sessionId: activeSessionId,
      });

      await refreshOrders();
    },
    [activeSessionId, createOrder, refreshOrders]
  );

  // ==========================================
  // CANCEL ORDER
  // ==========================================

  const handleCancelOrder = useCallback(
    async (order: { id: string }) => {
      await cancelOrder(order.id);
    },
    [cancelOrder]
  );

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main
      data-chart-page
      className="
        relative flex h-full min-h-0 min-w-0 w-full flex-1
        flex-col overflow-hidden overscroll-none
        bg-white dark:bg-slate-950
      "
    >
      {/* CHART AREA */}

      <section
        className="
          relative flex min-h-0 min-w-0 flex-1
          overflow-hidden
        "
      >
        <DrawingToolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          currentColor={currentColor}
          onChangeColor={setCurrentColor}
          currentStrokeWidth={currentStrokeWidth}
          onChangeStrokeWidth={setCurrentStrokeWidth}
          canUndo={drawingHistory.canUndo}
          canRedo={drawingHistory.canRedo}
          onUndo={drawingHistory.onUndo}
          onRedo={drawingHistory.onRedo}
          onClearAll={drawingHistory.onClearAll}
        />

        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <ErrorBoundary
            fallbackTitle="Terjadi kendala visual pada chart"
          >
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
              activeTool={activeTool}
              onSelectDrawingTool={setActiveTool}
              currentColor={currentColor}
              onChangeDrawingColor={setCurrentColor}
              currentStrokeWidth={currentStrokeWidth}
              onChangeDrawingStrokeWidth={setCurrentStrokeWidth}
              onDrawingHistoryChange={handleDrawingHistoryChange}
              indicators={indicators}
              onUpdateIndicators={onUpdateIndicators}
              showVolume={showVolume}
              onToggleVolume={onToggleVolume}
              volumeType={volumeType}
              onChangeVolumeType={onChangeVolumeType}
              hasRealVolume={hasRealVolume}
              showReplayControls={showReplayControls}
              onToggleReplay={handleToggleReplay}
              canCreateOrder={canCreateOrder}
              onCreateOrderClick={handleOpenOrderModal}
              orders={orders}
              onCancelPendingOrder={(orderId) => {
                console.log('Membatalkan order:', orderId);
                return handleCancelOrder({ id: orderId });
              }}
            />
          </ErrorBoundary>
        </div>
      </section>

      {/* ORDER PANEL */}

      {activeSessionId && (
        <OrderPanel
          orders={orders}
          currentPrice={currentPrice}
          loading={ordersLoading}
          error={ordersError}
          floatingPnL={floatingPnL}
          formattedFloatingPnL={formattedFloatingPnL}
          showOrderPanel={showOrderPanel}
          orderPanelHeight={orderPanelHeight}
          maxPanelHeight={getMaxPanelHeight()}
          onToggle={handleToggleOrderPanel}
          onResizeStart={handleResizeStart}
          onResizeMove={handleResizeMove}
          onResizeEnd={handleResizeEnd}
          onResizeKeyboard={handleResizeKeyboard}
          onRefresh={() => {
            void refreshOrders();
          }}
          onUpdate={updateOrder}
          onCancel={handleCancelOrder}
        />
      )}

      {/* REPLAY CONTROL PANEL */}

      {showReplayControls &&
        createPortal(
          <div
            className="
              fixed inset-x-0 bottom-0
              z-[99999]
              border-t border-slate-200
              bg-white shadow-2xl
              dark:border-slate-800 dark:bg-slate-950
            "
          >
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
          </div>,
          document.body
        )}

      {/* ORDER MODAL */}

      {isOrderModalOpen &&
        activeSessionId &&
        createPortal(
          <OrderModal
            isOpen={isOrderModalOpen}
            sessionId={activeSessionId}
            currentPrice={currentPrice}
            leverage={leverage}
            onClose={handleCloseOrderModal}
            onSubmit={handleCreateOrder}
          />,
          document.body
        )}
    </main>
  );
}

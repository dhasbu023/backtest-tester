
import {
  useCallback,
  useRef,
  useState,
} from 'react';

import type {
  KeyboardEvent,
  PointerEvent,
} from 'react';

import { createPortal } from 'react-dom';
import { ChevronUp, ChevronDown } from 'lucide-react';

import { useOrders } from '../hooks/useOrders';

import { TradingChart } from '../components/Chart/TradingChart.js';
import { DrawingToolbar } from '../components/Chart/DrawingToolbar.js';
import { ReplayControlPanel } from '../components/Chart/ReplayControlPanel.js';
import { ErrorBoundary } from '../components/Chart/ErrorBoundary.js';

import OrderModal from '../components/Orders/OrderModal.js';
import OrderList from '../components/Orders/OrderList.js';

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
// CONSTANTS
// ============================================

const DEFAULT_ORDER_PANEL_HEIGHT = 300;
const MIN_ORDER_PANEL_HEIGHT = 150;
const COLLAPSED_ORDER_PANEL_HEIGHT = 44;

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
  } = useOrders(activeSessionId || null);

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

  const [orderPanelHeight, setOrderPanelHeight] =
    useState(DEFAULT_ORDER_PANEL_HEIGHT);

  const dragStartRef = useRef<{
    pointerY: number;
    panelHeight: number;
  } | null>(null);

  const handleToggleOrderPanel = useCallback(() => {
    setShowOrderPanel((previous) => !previous);
  }, []);

  // ==========================================
  // ORDER MODAL
  // ==========================================

  const [isOrderModalOpen, setIsOrderModalOpen] =
    useState(false);

  // ==========================================
  // CURRENT PRICE
  // ==========================================

  const currentReplayCandle =
    sourceCandles[currentIndex] ?? null;

  const currentPrice =
    currentReplayCandle?.close ?? 0;

  const leverage = activeSession?.leverage || 500;

  const canCreateOrder =
    showReplayControls &&
    Boolean(activeSessionId) &&
    Number.isFinite(currentPrice) &&
    currentPrice > 0;

  // ==========================================
  // OPEN ORDER MODAL
  // ==========================================

  const handleOpenOrderModal = useCallback(() => {
    if (!canCreateOrder) {
      console.warn('[ORDER] Tidak bisa membuat order:', {
        showReplayControls,
        activeSessionId,
        currentPrice,
      });

      return;
    }

    setIsOrderModalOpen(true);
  }, [
    canCreateOrder,
    showReplayControls,
    activeSessionId,
    currentPrice,
  ]);

  const handleCloseOrderModal = useCallback(() => {
    setIsOrderModalOpen(false);
  }, []);

  // ==========================================
  // CHART ERROR
  // ==========================================

  const handleChartErrorReset = useCallback(() => {
    if (sessionId) {
      onRetryOpenSession();
    }
  }, [sessionId, onRetryOpenSession]);

  // ==========================================
  // CREATE ORDER
  // ==========================================

  const handleCreateOrder = useCallback(
    async (input: CreateOrderInput): Promise<void> => {
      try {
        await createOrder(input);
        setIsOrderModalOpen(false);

        console.log('[ORDER] Berhasil membuat order:', input);
      } catch (error) {
        console.error('[ORDER] Gagal membuat order:', error);
        throw error;
      }
    },
    [createOrder]
  );

  // ==========================================
  // CANCEL ORDER
  // ==========================================

  const handleCancelOrder = useCallback(
    async (order: { id: string }) => {
      try {
        await cancelOrder(order.id);
      } catch (error) {
        console.error('[ORDER] Gagal membatalkan order:', error);
      }
    },
    [cancelOrder]
  );

  // ==========================================
  // ORDER PANEL RESIZE
  // ==========================================

  const getMaxPanelHeight = useCallback(() => {
    const mainHeight =
      document.querySelector('main[data-chart-page]')
        ?.clientHeight || window.innerHeight;

    // Sisakan ruang minimum untuk chart.
    const availableHeight = mainHeight - 150;

    return Math.max(
      MIN_ORDER_PANEL_HEIGHT,
      Math.floor(Math.min(mainHeight * 0.7, availableHeight))
    );
  }, []);

  const handleResizeStart = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    dragStartRef.current = {
      pointerY: event.clientY,
      panelHeight: orderPanelHeight,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizeMove = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (!dragStartRef.current) return;

    const deltaY =
      dragStartRef.current.pointerY - event.clientY;

    const nextHeight = Math.min(
      getMaxPanelHeight(),
      Math.max(
        MIN_ORDER_PANEL_HEIGHT,
        dragStartRef.current.panelHeight + deltaY
      )
    );

    setOrderPanelHeight(nextHeight);
  };

  const handleResizeEnd = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    dragStartRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  // ==========================================
  // KEYBOARD RESIZE
  // ==========================================

  const handleResizeKeyboard = (
    event: KeyboardEvent<HTMLDivElement>
  ) => {
    const step = event.shiftKey ? 50 : 20;
    const maxPanelHeight = getMaxPanelHeight();

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      setOrderPanelHeight((height) =>
        Math.min(maxPanelHeight, height + step)
      );
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      setOrderPanelHeight((height) =>
        Math.max(MIN_ORDER_PANEL_HEIGHT, height - step)
      );
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setOrderPanelHeight(MIN_ORDER_PANEL_HEIGHT);
    }

    if (event.key === 'End') {
      event.preventDefault();
      setOrderPanelHeight(maxPanelHeight);
    }
  };

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

        {/* Jangan ubah struktur dan props TradingChart */}

        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <ErrorBoundary
            fallbackTitle="Terjadi kendala visual pada chart"
            onReset={handleChartErrorReset}
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
            />
          </ErrorBoundary>
        </div>
      </section>

      {/* ORDER PANEL */}

      {activeSessionId && (
        <section
          className="
            relative z-20 flex w-full shrink-0 flex-col
            min-h-0 overflow-hidden
            border-t border-slate-300
            bg-white dark:border-slate-700 dark:bg-slate-950
          "
          style={{
            height: showOrderPanel
              ? `${orderPanelHeight}px`
              : `${COLLAPSED_ORDER_PANEL_HEIGHT}px`,
            minHeight: `${COLLAPSED_ORDER_PANEL_HEIGHT}px`,
            flexShrink: 0,
          }}
        >
          {/* RESIZE HANDLE */}

          {showOrderPanel && (
            <div
              role="separator"
              aria-label="Ubah tinggi Trading Orders"
              aria-orientation="horizontal"
              aria-valuemin={MIN_ORDER_PANEL_HEIGHT}
              aria-valuemax={getMaxPanelHeight()}
              aria-valuenow={orderPanelHeight}
              tabIndex={0}
              onPointerDown={handleResizeStart}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
              onPointerCancel={handleResizeEnd}
              onKeyDown={handleResizeKeyboard}
              className="
                group relative flex h-2 w-full shrink-0
                cursor-row-resize touch-none
                items-center justify-center
                bg-slate-100 hover:bg-blue-100
                dark:bg-slate-900 dark:hover:bg-blue-950
              "
            >
              <div
                className="
                  h-1 w-12 rounded-full
                  bg-slate-400 transition-colors
                  group-hover:bg-blue-500
                  dark:bg-slate-600
                  dark:group-hover:bg-blue-400
                "
              />
            </div>
          )}

          {/* ORDER HEADER */}

          <div
            className="
              flex h-10 w-full shrink-0 items-center
              justify-between border-b border-slate-200
              px-3 dark:border-slate-800
            "
          >
            {/* ORDER TABS */}
            <div className="flex h-full min-w-0 items-center gap-4">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Open
              </span>

              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Pending
              </span>

              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Close
              </span>
            </div>

            {/* TOGGLE ORDER PANEL */}
            <button
              type="button"
              onClick={handleToggleOrderPanel}
              title={
                showOrderPanel
                  ? 'Sembunyikan Trading Orders'
                  : 'Tampilkan Trading Orders'
              }
              aria-label={
                showOrderPanel
                  ? 'Sembunyikan Trading Orders'
                  : 'Tampilkan Trading Orders'
              }
              aria-expanded={showOrderPanel}
              className="
                ml-3 flex h-7 w-7 shrink-0 items-center
                justify-center rounded-md text-slate-500
                transition-colors
                hover:bg-slate-100 hover:text-slate-900
                dark:text-slate-400 dark:hover:bg-slate-800
                dark:hover:text-white
              "
            >
              {showOrderPanel ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* ORDER LIST */}

          {showOrderPanel && (
            <div
              className="
                min-h-0 min-w-0 flex-1
                overflow-x-auto overflow-y-auto
                overscroll-contain p-3
              "
            >
              <OrderList
                orders={orders}
                currentPrice={currentPrice}
                loading={ordersLoading}
                error={ordersError}
                onRefresh={() => {
                  void refreshOrders();
                }}
                onEdit={(order) => {
                  console.log('[ORDER] Edit:', order);
                }}
                onCancel={(order) => {
                  void handleCancelOrder(order);
                }}
              />
            </div>
          )}
        </section>
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

      {showReplayControls &&
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

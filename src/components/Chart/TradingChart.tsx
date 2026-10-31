// ============================================================
// TRADING CHART
// Komponen utama untuk menampilkan chart, indikator, drawing,
// volume, informasi candle, dan kontrol chart.
// ============================================================


// ============================================================
// 1. REACT IMPORTS
// ============================================================

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createPortal } from 'react-dom';


// ============================================================
// 2. THIRD-PARTY IMPORTS
// ============================================================

import {
  type CandlestickData,
  type IChartApi,
  type IPaneApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts';

import { Sliders, X } from 'lucide-react';


// ============================================================
// 3. CUSTOM HOOKS
// ============================================================

import { useChartInitialization } from '../../hooks/useChartInitialization.js';
import { useChartPanes } from '../../hooks/useChartPanes.js';
import { useCandleInformation } from '../../hooks/useCandleInformation.js';
import { useDrawingActions } from '../../hooks/useDrawingActions.js';
import { useDrawingHistory } from '../../hooks/useDrawingHistory.js';
import { useMainIndicatorSeries } from '../../hooks/useMainIndicatorSeries.js';
import { useSubIndicatorData } from '../../hooks/useSubIndicatorData.js';
import { useChartTheme } from '../../hooks/useChartTheme.js';
import { useChartTimezone } from '../../hooks/useChartTimezone.js';
import { useChartCandleUpdate } from '../../hooks/useChartCandleUpdate.js';
import { useIndicatorProperties } from '../../hooks/useIndicatorProperties.js';
import { useChartControls } from '../../hooks/useChartControls.js';

import {
  useSubIndicatorSeries,
  type SubPaneType,
} from '../../hooks/useSubIndicatorSeries.js';

import { useVolumeSeries } from '../../hooks/useVolumeSeries.js';


// ============================================================
// 4. INDICATOR UTILITIES
// ============================================================

import { getVolumeValue } from '../../Indikator/volume.js';


// ============================================================
// 5. TYPE IMPORTS
// ============================================================

import type {
  Candle,
  DrawingObject,
  DrawingToolType,
  IndicatorConfig,
  Timeframe,
} from '../../types/index.js';


// ============================================================
// 6. CHART COMPONENTS
// ============================================================

import { ChartToolbar } from './ChartToolbar.js';
import { DrawingToolbar } from './DrawingToolbar.js';
import { DrawingLayer } from './Drawing/DrawingLayer.js';
import { CandleInfoBar } from './ChartHeader/CandleInfoBar.js';


// ============================================================
// 7. INDICATOR COMPONENTS
// ============================================================

import IndicatorManagerModal from '../Indicators/IndicatorManagerModal.js';

import IndicatorPropertiesModal, {
  type IndicatorProperties,
} from '../Indicators/IndicatorPropertiesModal.js';




import {
  DEFAULT_DRAWING_COLOR,
  DEFAULT_STROKE_WIDTH,
  VOLUME_PROPERTIES_ID,
} from './utils/chartConstants.js';

import { formatVolumeValue } from './utils/chartFormatters.js';


// ============================================================
// 9. COMPONENT PROPS
// ============================================================

interface TradingChartProps {
  // Chart data
  candles: Candle[];
  symbol: string;
  timeframe: Timeframe;
  sourceTimeframe: Timeframe;

  // Timeframe controls
  onChangeTimeframe: (tf: Timeframe) => void;

  // Theme
  isDarkMode: boolean;
  isLoading?: boolean;

  // Session
  sessionId: string;

  // Timezone
  activeTimezone: string;
  onChangeTimezone: (tz: string) => void;

  // Drawing objects
  drawings: DrawingObject[];
  onUpdateDrawings: (drawings: DrawingObject[]) => void;

  // Indicators
  indicators: IndicatorConfig[];
  onUpdateIndicators: (indicators: IndicatorConfig[]) => void;

  // Volume
  showVolume: boolean;
  onToggleVolume: () => void;
  volumeType: 'TICK' | 'REAL';
  onChangeVolumeType: (type: 'TICK' | 'REAL') => void;
  hasRealVolume: boolean;

  // Replay controls
  showReplayControls: boolean;
  onToggleReplay: () => void;
}


// ============================================================
// 10. TRADING CHART COMPONENT
// ============================================================

export const TradingChart: React.FC<TradingChartProps> = ({
  // Chart data
  candles,
  symbol,
  timeframe,
  sourceTimeframe,

  // Timeframe
  onChangeTimeframe,

  // Theme
  isDarkMode,
  isLoading = false,

  // Session
  sessionId,

  // Timezone
  activeTimezone,
  onChangeTimezone,

  // Drawing objects
  drawings,
  onUpdateDrawings,

  // Indicators
  indicators,
  onUpdateIndicators,

  // Volume
  onToggleVolume,
  volumeType,
  hasRealVolume,

  // Replay
  showReplayControls,
  onToggleReplay,
}) => {

  // ==========================================================
  // 1. REFS
  // Menyimpan referensi chart, series, dan data terbaru.
  // ==========================================================

  // ----------------------------------------------------------
  // Chart container dan instance
  // ----------------------------------------------------------

  const containerRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);

  const {
    fitContent,
  } = useChartControls({
    chartRef,
  });

  const [chartInstance, setChartInstance] =
    useState<IChartApi | null>(null);


  // ----------------------------------------------------------
  // Candlestick series
  // ----------------------------------------------------------

  const candlestickSeriesRef =
    useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [candlestickSeriesInstance, setCandlestickSeriesInstance] =
    useState<ISeriesApi<'Candlestick'> | null>(null);


  // ----------------------------------------------------------
  // Main indicator series
  // ----------------------------------------------------------

  const lineSeriesMapRef =
    useRef<Map<string, ISeriesApi<'Line'>>>(new Map());


  // ----------------------------------------------------------
  // Sub-indicator series dan panes
  // ----------------------------------------------------------

  const subIndicatorSeriesMapRef =
    useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  const subIndicatorPanesRef =
    useRef<Map<SubPaneType, IPaneApi<Time>>>(new Map());


  // ----------------------------------------------------------
  // Volume series dan pane
  // ----------------------------------------------------------

  const volumeSeriesRef =
    useRef<ISeriesApi<'Histogram'> | null>(null);

  const volumePaneRef =
    useRef<IPaneApi<Time> | null>(null);


  // ----------------------------------------------------------
  // Data references
  // ----------------------------------------------------------

  const candlesRef = useRef<Candle[]>(candles);

  const drawingsRef = useRef<DrawingObject[]>(drawings);


  // ----------------------------------------------------------
  // Drawing drag history
  // ----------------------------------------------------------

  const drawingDragStartRef =
    useRef<DrawingObject[] | null>(null);


  // ----------------------------------------------------------
  // Theme dan timezone references
  // ----------------------------------------------------------

  const isDarkModeRef = useRef(isDarkMode);

  const activeTimezoneRef = useRef(activeTimezone);


  // ----------------------------------------------------------
  // Sinkronisasi nilai terbaru ke refs
  // ----------------------------------------------------------

  candlesRef.current = candles;
  drawingsRef.current = drawings;
  isDarkModeRef.current = isDarkMode;
  activeTimezoneRef.current = activeTimezone;


  // ==========================================================
  // 2. STATE
  // Menyimpan kondisi UI dan interaksi chart.
  // ==========================================================

  // ----------------------------------------------------------
  // Ukuran chart container
  // ----------------------------------------------------------

  const [containerDimensions, setContainerDimensions] = useState({
    width: 800,
    height: 500,
  });


  // ----------------------------------------------------------
  // Candle yang sedang diarahkan oleh crosshair
  // ----------------------------------------------------------

  const [hoveredCandle, setHoveredCandle] =
    useState<Candle | null>(null);


  // ----------------------------------------------------------
  // Drawing tool
  // ----------------------------------------------------------

  const [activeTool, setActiveTool] =
    useState<DrawingToolType>('CURSOR');

  const [currentColor, setCurrentColor] =
    useState(DEFAULT_DRAWING_COLOR);

  const [currentStrokeWidth, setCurrentStrokeWidth] =
    useState(DEFAULT_STROKE_WIDTH);


  // ----------------------------------------------------------
  // Drawing selection
  // ----------------------------------------------------------

  const [selectedDrawingId, setSelectedDrawingId] =
    useState<string | null>(null);


  // ----------------------------------------------------------
  // Indicator modals
  // ----------------------------------------------------------

  const [isIndicatorManagerModalOpen, setIsIndicatorManagerModalOpen] =
    useState(false)

  // ----------------------------------------------------------
  // Volume appearance
  // ----------------------------------------------------------

  const [volumeColorOverride, setVolumeColorOverride] =
    useState<string | null>(null);


  // ==========================================================
  // 3. CHART INITIALIZATION
  // Membuat chart dan candlestick melalui custom hook.
  // ==========================================================

  useChartInitialization({
    containerRef,
    chartRef,
    candlestickSeriesRef,

    // Data references
    candlesRef,
    isDarkModeRef,
    activeTimezoneRef,

    // Indicator references
    lineSeriesMapRef,
    subIndicatorSeriesMapRef,
    subIndicatorPanesRef,

    // Volume references
    volumeSeriesRef,
    volumePaneRef,

    // State setters
    setChartInstance,
    setCandlestickSeriesInstance,
    setContainerDimensions,

    // Interaction state
    setHoveredCandle,
    setSelectedDrawingId,
  });

  // ============================================================
  // CHART CANDLE UPDATE
  // Memperbarui data candle tanpa membuat ulang chart.
  // ============================================================

    useChartCandleUpdate({
      candles,
      candlestickSeriesRef,
      candlesRef,
      setHoveredCandle,
  });

  // ============================================================
  // INDICATOR PROPERTIES
  // Mengelola properti dan konfigurasi indikator.
  // ============================================================

  const {
    subPropertiesTargetId,
    setSubPropertiesTargetId,
    subPropertiesTarget,
    isVolumeProperties,
    subPropertiesInitialValues,
    handleSaveSubIndicatorProperties,
  } = useIndicatorProperties({
    indicators,
    onUpdateIndicators,
    volumeColorOverride,
    setVolumeColorOverride,
  });


    useChartTimezone({
    chartRef,
    activeTimezone,
    activeTimezoneRef,
  });

  // ==========================================================
  // 4. DRAWING HISTORY
  // Mengatur undo, redo, dan riwayat perubahan drawing.
  // ==========================================================

  const {
    canUndo,
    canRedo,
    commitDrawingsWithHistory,
    handleUndo,
    handleRedo,
    commitDragHistory,
  } = useDrawingHistory({
    drawings,
    drawingsRef,
    drawingDragStartRef,
    onUpdateDrawings,
    setSelectedDrawingId,
  });


  // ==========================================================
  // 5. DRAWING ACTIONS
  // Mengatur penambahan, perubahan, penghapusan, dan visibilitas
  // objek drawing.
  // ==========================================================

  const {
    handleAddDrawing,
    handleUpdateDrawing,
    handleDrawingDragStart,
    handleDrawingDragEnd,
    handleDeleteDrawing,
    handleClearAllDrawings,
    handleToggleDrawingVisible,
    handleToggleDrawingLock,
  } = useDrawingActions({
    sessionId,
    drawingsRef,
    drawingDragStartRef,
    commitDrawingsWithHistory,
    commitDragHistory,
    onUpdateDrawings,
    setSelectedDrawingId,
  });


  // ==========================================================
  // 6. SUB-INDICATOR DATA
  // Menghitung data RSI, ATR, dan readout indikator.
  // ==========================================================

  const {
    subIndicatorReadouts,
    subIndicatorGroups,
    handleRemoveSubIndicator,
  } = useSubIndicatorData({
    candles,
    indicators,
    onUpdateIndicators,
  });


  // ==========================================================
  // 7. CHART PANES
  // Mengatur pane utama dan pane indikator tambahan.
  // ==========================================================

  const {
    subPaneElements,
    schedulePaneElementsSync,
  } = useChartPanes(
    chartRef,
    volumePaneRef,
    subIndicatorPanesRef,
  );


  // ==========================================================
  // 8. SUB-INDICATOR SERIES
  // Mengatur series RSI, ATR, dan indikator di pane terpisah.
  // ==========================================================

  useSubIndicatorSeries({
    chartRef,
    candles,
    indicators,
    subIndicatorPanesRef,
    subIndicatorSeriesMapRef,
    volumePaneRef,
    schedulePaneElementsSync,
  });


  // ==========================================================
  // 9. MAIN INDICATOR SERIES
  // Mengatur indikator yang ditampilkan di chart utama.
  // ==========================================================

  useMainIndicatorSeries({
    chartRef,
    candlestickSeriesRef,
    lineSeriesMapRef,
    candles,
    indicators,
  });


  // ==========================================================
  // 10. RESET INDICATOR PROPERTIES
  // Menutup modal properties ketika session berubah.
  // ==========================================================

  useEffect(() => {
    setSubPropertiesTargetId(null);
  }, [sessionId]);


  // ==========================================================
  // 11. CANDLE INFORMATION
  // Mengambil candle aktif dan menghitung perubahan harga.
  // ==========================================================

  const {
    displayedCandle,
    candleChange,
    candleChangePercent,
  } = useCandleInformation(candles, hoveredCandle);


  // ==========================================================
  // 12. UPDATE CHART THEME
  // Mengubah warna chart ketika dark mode berubah.
  // ==========================================================

  useChartTheme({
  chart: chartInstance,
  isDarkMode,
});

  // ==========================================================
  // 15. VOLUME CONFIGURATION
  // Mengatur indikator volume yang aktif dan warnanya.
  // ==========================================================

  const volumeIndicators = useMemo(
    () => indicators.filter(
      (indicator) => indicator.type === 'VOLUME',
    ),
    [indicators],
  );

  const visibleVolumeIndicator = volumeIndicators.find(
    (indicator) => indicator.visible,
  );

  const volumeVisible = Boolean(visibleVolumeIndicator);

  const volumeColor =
    visibleVolumeIndicator?.color ||
    volumeColorOverride ||
    '#26a69a';


  // ----------------------------------------------------------
  // Nilai volume candle terakhir
  // ----------------------------------------------------------

  const latestVolumeValue = useMemo(() => {
    const lastCandle = candles[candles.length - 1];

    if (!lastCandle) return null;

    return getVolumeValue(
      {
        time: lastCandle.timestamp,
        open: lastCandle.open,
        close: lastCandle.close,
        tickVolume: lastCandle.tickVolume,
        realVolume: lastCandle.realVolume,
      },
      volumeType === 'REAL' ? 'realVolume' : 'tickVolume',
    );
  }, [candles, volumeType]);


  // ==========================================================
  // 16. VOLUME SERIES
  // Mengelola tampilan volume pada pane chart.
  // ==========================================================

  useVolumeSeries({
    chartRef,
    volumeSeriesRef,
    volumePaneRef,
    candles,
    volumeVisible,
    volumeType,
    hasRealVolume,
    volumeColor,
    schedulePaneElementsSync,
  });
  

  // ==========================================================
  // 19. RENDER
  // Menampilkan toolbar, chart, drawing, indikator, dan modal.
  // ==========================================================

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white text-slate-900 dark:bg-[#0b0f19] dark:text-slate-100">

      {/* =====================================================
          CHART TOOLBAR
          ===================================================== */}

      <div className="relative z-20 shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0b0f19]">

        <ChartToolbar
          sourceTimeframe={sourceTimeframe}
          activeTimeframe={timeframe}
          onChangeTimeframe={onChangeTimeframe}
          activeTimezone={activeTimezone}
          onChangeTimezone={onChangeTimezone}
          indicators={indicators}
          onOpenIndicatorsModal={() =>
            setIsIndicatorManagerModalOpen(true)
          }
          onFitContent={fitContent}
          showReplayControls={showReplayControls}
          onToggleReplay={onToggleReplay}
        />

      </div>


      {/* =====================================================
          CANDLE INFORMATION BAR
          ===================================================== */}

      <CandleInfoBar
        symbol={symbol}
        timeframe={timeframe}
        displayedCandle={displayedCandle}
        candleChange={candleChange}
        candleChangePercent={candleChangePercent}
        activeTimezone={activeTimezone}
      />


      {/* =====================================================
          MAIN CHART AREA
          ===================================================== */}

      <div className="relative flex min-h-0 flex-1 overflow-hidden bg-white dark:bg-[#0b0f19]">


        {/* ===================================================
            DRAWING TOOLBAR
            =================================================== */}

        <div className="relative z-30 w-12 shrink-0 overflow-visible border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0b0f19]">

          <DrawingToolbar
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            currentColor={currentColor}
            onChangeColor={setCurrentColor}
            currentStrokeWidth={currentStrokeWidth}
            onChangeStrokeWidth={setCurrentStrokeWidth}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClearAll={handleClearAllDrawings}
            drawings={drawings}
            onToggleDrawingVisible={handleToggleDrawingVisible}
            onToggleDrawingLock={handleToggleDrawingLock}
            onDeleteDrawing={handleDeleteDrawing}
          />

        </div>


        {/* ===================================================
            CHART CONTAINER
            =================================================== */}

        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">

          {/* Lightweight Charts container */}
          <div
            ref={containerRef}
            className="absolute inset-0 h-full w-full"
          />


          {/* =================================================
              SUB-INDICATOR READOUTS
              Menampilkan nilai RSI dan ATR pada pane masing-masing.
              ================================================= */}

          {(['RSI', 'ATR'] as const).map((type) => {
            const paneElement = subPaneElements[type];
            const group = subIndicatorGroups[type];

            if (
              !paneElement ||
              !group ||
              group.length === 0
            ) {
              return null;
            }

            return createPortal(
              <div
                key={type}
                className="pointer-events-none absolute left-2 top-1 z-20 flex max-w-[calc(100%-12px)] flex-col items-start gap-1"
              >
                {group.map((indicator) => {
                  const readout =
                    subIndicatorReadouts[indicator.id];

                  const color =
                    indicator.color ||
                    (indicator.type === 'RSI'
                      ? '#a855f7'
                      : '#f59e0b');

                  return (
                    <div
                      key={indicator.id}
                      className="pointer-events-auto flex items-center gap-1.5 rounded border border-slate-300/80 bg-white/90 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/90 dark:text-slate-200"
                    >

                      {/* Indicator color */}
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />

                      {/* Indicator name */}
                      <span className="font-semibold">
                        {indicator.name || indicator.type}
                      </span>

                      {/* Indicator value */}
                      <span>
                        {readout !== null &&
                        readout !== undefined
                          ? readout.toFixed(2)
                          : '—'}
                      </span>

                      {/* Indicator properties */}
                      <button
                        type="button"
                        onClick={() =>
                          setSubPropertiesTargetId(indicator.id)
                        }
                        title="Properties indikator"
                        aria-label={`Properties ${indicator.name || indicator.type}`}
                        className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                      >
                        <Sliders size={11} />
                      </button>

                      {/* Remove indicator */}
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveSubIndicator(indicator.id)
                        }
                        title="Hapus indikator"
                        aria-label={`Hapus ${indicator.name || indicator.type}`}
                        className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                      >
                        <X size={11} />
                      </button>

                    </div>
                  );
                })}
              </div>,
              paneElement,
              `pane-${type}`,
            );
          })}


          {/* =================================================
              VOLUME READOUT
              Menampilkan nilai volume pada pane volume.
              ================================================= */}

          {volumeVisible &&
            subPaneElements.VOLUME &&
            createPortal(
              <div className="pointer-events-none absolute left-2 top-1 z-20 flex max-w-[calc(100%-12px)] flex-col items-start gap-1">

                <div className="pointer-events-auto flex items-center gap-1.5 rounded border border-slate-300/80 bg-white/90 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/90 dark:text-slate-200">

                  {/* Volume color */}
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: volumeColor }}
                  />

                  {/* Volume name */}
                  <span className="font-semibold">
                    Volume
                  </span>

                  {/* Volume type */}
                  <span className="text-[9px] uppercase text-slate-400">
                    {volumeType}
                  </span>

                  {/* Latest volume value */}
                  <span>
                    {formatVolumeValue(latestVolumeValue)}
                  </span>

                  {/* Volume properties */}
                  <button
                    type="button"
                    onClick={() =>
                      setSubPropertiesTargetId(
                        VOLUME_PROPERTIES_ID,
                      )
                    }
                    title="Properties volume"
                    aria-label="Properties volume"
                    className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                  >
                    <Sliders size={11} />
                  </button>

                  {/* Hide volume */}
                  <button
                    type="button"
                    onClick={onToggleVolume}
                    title="Sembunyikan volume"
                    aria-label="Sembunyikan volume"
                    className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                  >
                    <X size={11} />
                  </button>

                </div>
              </div>,
              subPaneElements.VOLUME,
              'pane-VOLUME',
            )}


          {/* =================================================
              DRAWING LAYER
              Menampilkan dan mengatur objek drawing di atas chart.
              ================================================= */}

          <DrawingLayer
            candles={candles}
            timeframe={timeframe}
            drawings={drawings}
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            selectedDrawingId={selectedDrawingId}
            onSelectDrawing={setSelectedDrawingId}
            onAddDrawing={handleAddDrawing}
            onUpdateDrawing={handleUpdateDrawing}
            onDeleteDrawing={handleDeleteDrawing}
            onDrawingDragStart={handleDrawingDragStart}
            onDrawingDragEnd={handleDrawingDragEnd}
            chart={chartInstance}
            series={candlestickSeriesInstance}
            currentColor={currentColor}
            currentStrokeWidth={currentStrokeWidth}
            activeTimezone={activeTimezone}
            isDarkMode={isDarkMode}
            containerWidth={containerDimensions.width}
            containerHeight={containerDimensions.height}
          />


          {/* =================================================
              LOADING OVERLAY
              Ditampilkan ketika chart sedang memperbarui data.
              ================================================= */}

          {isLoading && (
            <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-slate-900/20">

              <div className="flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2.5 text-xs text-white shadow-xl">

                <span className="h-2 w-2 animate-ping rounded-full bg-blue-500" />

                <span>
                  Memperbarui chart...
                </span>

              </div>

            </div>
          )}


          {/* =================================================
              EMPTY CHART STATE
              Ditampilkan ketika belum ada data candle.
              ================================================= */}

          {!isLoading && candles.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 p-4 text-center text-xs text-slate-400">

              <p className="font-semibold text-slate-600 dark:text-slate-300">
                Belum ada candle untuk ditampilkan.
              </p>

              <p className="max-w-sm text-[11px] text-slate-500">
                Periksa data CSV atau posisi replay yang sedang
                dipilih.
              </p>

            </div>
          )}

        </div>

      </div>


      {/* =====================================================
          INDICATOR MANAGER MODAL
          Mengelola daftar indikator chart.
          ===================================================== */}

      <IndicatorManagerModal
        isOpen={isIndicatorManagerModalOpen}
        onClose={() => setIsIndicatorManagerModalOpen(false)}
        indicators={indicators}
        onUpdateIndicators={onUpdateIndicators}
      />


      {/* =====================================================
          INDICATOR PROPERTIES MODAL
          Mengubah pengaturan indikator yang dipilih.
          ===================================================== */}

      {subPropertiesTargetId && subPropertiesInitialValues && (
        <IndicatorPropertiesModal
          isOpen
          indicatorName={
            isVolumeProperties
              ? 'Volume'
              : subPropertiesTarget?.name ||
                subPropertiesTarget?.type ||
                'Indikator'
          }
          initialValues={subPropertiesInitialValues}
          showPeriod={!isVolumeProperties}
          showStdDev={
            subPropertiesTarget?.type === 'BOLLINGER'
          }
          showStrokeWidth={!isVolumeProperties}
          onClose={() => setSubPropertiesTargetId(null)}
          onSave={handleSaveSubIndicatorProperties}
        />
      )}

    </div>
  );
};


// ============================================================
// 11. DEFAULT EXPORT
// ============================================================

export default TradingChart;

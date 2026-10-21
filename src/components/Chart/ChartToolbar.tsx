import React from 'react';
import {
  Sliders,
  Globe,
  Check,
  ChevronDown,
  Play,
  X,
  Maximize2,
} from 'lucide-react';

import type {
  Timeframe,
  IndicatorConfig,
} from '../../types/index.js';

import { TIMEZONE_OPTIONS } from "../../types/index.js";
import { getAllowedTimeframes } from "../../server/timeframeAggregator.js";

interface ChartToolbarProps {
  sourceTimeframe: Timeframe;
  activeTimeframe: Timeframe;
  onChangeTimeframe: (tf: Timeframe) => void;

  activeTimezone: string;
  onChangeTimezone: (tz: string) => void;

  showVolume?: boolean;
  onToggleVolume?: () => void;
  volumeType?: 'TICK' | 'REAL';
  onChangeVolumeType?: (type: 'TICK' | 'REAL') => void;
  hasRealVolume?: boolean;

  indicators: IndicatorConfig[];
  onOpenIndicatorsModal: () => void;

  // Fit content
  onFitContent?: () => void;

  // Kontrol replay
  showReplayControls?: boolean;
  onToggleReplay?: () => void;
}

export const ChartToolbar: React.FC<ChartToolbarProps> = ({
  sourceTimeframe,
  activeTimeframe,
  onChangeTimeframe,

  activeTimezone,
  onChangeTimezone,

  showVolume = true,
  onToggleVolume = () => {},
  volumeType = 'TICK',
  onChangeVolumeType = () => {},
  hasRealVolume = false,

  indicators,
  onOpenIndicatorsModal,
  onFitContent,

  showReplayControls = false,
  onToggleReplay = () => {},
}) => {
  const [showTzDropdown, setShowTzDropdown] =
    React.useState(false);

  const [showVolDropdown, setShowVolDropdown] =
    React.useState(false);

  const allowedTimeframes =
    getAllowedTimeframes(sourceTimeframe);

  const activeTzObj =
    TIMEZONE_OPTIONS.find(
      (timezone) => timezone.id === activeTimezone
    ) || TIMEZONE_OPTIONS[1];

  const activeIndicatorsCount =
    indicators.filter((indicator) => indicator.visible).length;

  return (
    <div className="relative z-30 flex h-10 shrink-0 select-none items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 text-xs dark:border-slate-800 dark:bg-slate-900">
      {/* LEFT: TIMEFRAME, INDICATORS, VOLUME */}
      <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
        {/* Timeframe Buttons */}
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-slate-300/60 bg-slate-200/70 p-0.5 dark:border-slate-700/60 dark:bg-slate-800">
          {(
            ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'] as Timeframe[]
          ).map((tf) => {
            const isAllowed =
              allowedTimeframes.includes(tf);

            const isActive =
              activeTimeframe === tf;

            return (
              <button
                key={tf}
                type="button"
                onClick={() => {
                  if (isAllowed) {
                    onChangeTimeframe(tf);
                  }
                }}
                disabled={!isAllowed}
                className={`cursor-pointer rounded px-2 py-0.5 font-mono text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow'
                    : isAllowed
                    ? 'text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
                    : 'cursor-not-allowed text-slate-300 opacity-35 dark:text-slate-600'
                }`}
                title={
                  isAllowed
                    ? `Ganti ke ${tf}`
                    : `Tidak boleh lebih rendah dari ${sourceTimeframe}`
                }
              >
                {tf}
              </button>
            );
          })}
        </div>

        <div className="mx-1 h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-800" />

        {/* Indicators */}
        <button
          type="button"
          onClick={onOpenIndicatorsModal}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Sliders className="h-3.5 w-3.5 text-blue-500" />

          <span className="text-[11px] font-semibold">
            Indikator
          </span>

          {activeIndicatorsCount > 0 && (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {activeIndicatorsCount}
            </span>
          )}
        </button>

        {/* Volume dropdown */}
        <div className="relative shrink-0">

          {showVolDropdown && (
            <div className="absolute left-0 z-50 mt-1 w-48 space-y-1 rounded-xl border border-slate-200 bg-white p-2 text-xs shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  onToggleVolume();
                  setShowVolDropdown(false);
                }}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg p-2 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <span>
                  {showVolume ? 'Sembunyikan Volume' : 'Tampilkan Volume'}
                </span>

                {showVolume && (
                  <Check className="h-3.5 w-3.5 text-blue-600" />
                )}
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              <button
                type="button"
                onClick={() => {
                  onChangeVolumeType('TICK');
                  setShowVolDropdown(false);
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded-lg p-2 ${
                  volumeType === 'TICK'
                    ? 'bg-blue-50 font-bold text-blue-600 dark:bg-blue-950/40'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span>Tick Volume</span>
                {volumeType === 'TICK' && (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>

              <button
                type="button"
                disabled={!hasRealVolume}
                onClick={() => {
                  if (hasRealVolume) {
                    onChangeVolumeType('REAL');
                    setShowVolDropdown(false);
                  }
                }}
                className={`flex w-full items-center justify-between rounded-lg p-2 ${
                  !hasRealVolume
                    ? 'cursor-not-allowed text-slate-400 opacity-40'
                    : volumeType === 'REAL'
                    ? 'cursor-pointer bg-blue-50 font-bold text-blue-600 dark:bg-blue-950/40'
                    : 'cursor-pointer text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span>
                  Real Volume
                  {!hasRealVolume && (
                    <span className="block text-[9px] text-amber-500">
                      Tidak tersedia di CSV ini
                    </span>
                  )}
                </span>

                {volumeType === 'REAL' && (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: TIMEZONE + REPLAY */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Timezone */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTzDropdown((value) => !value)}
            aria-expanded={showTzDropdown}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Ubah timezone tampilan chart"
          >
            <Globe className="h-3.5 w-3.5 text-blue-500" />

            <span className="font-mono font-semibold">
              {activeTzObj.abbr}
            </span>

            <span className="hidden text-[11px] text-slate-500 lg:inline">
              ({activeTzObj.label.split('(')[0].trim()})
            </span>

            <ChevronDown className="ml-0.5 h-3 w-3 text-slate-400" />
          </button>

          {showTzDropdown && (
            <div className="absolute right-0 z-50 mt-1 w-64 space-y-1 rounded-xl border border-slate-200 bg-white p-2 text-xs shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                Pilih Timezone Tampilan
              </div>

              <div className="max-h-60 space-y-0.5 overflow-y-auto pr-1">
                {TIMEZONE_OPTIONS.map((tz) => {
                  const isSelected =
                    activeTimezone === tz.id;

                  return (
                    <button
                      key={tz.id}
                      type="button"
                      onClick={() => {
                        onChangeTimezone(tz.id);
                        setShowTzDropdown(false);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-lg p-2 text-left transition-colors ${
                        isSelected
                          ? 'bg-blue-50 font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold">
                            {tz.abbr}
                          </span>

                          <span className="text-[11px] text-slate-500">
                            {tz.region}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-400">
                          {tz.label}
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Fit Content / Auto Scale button */}
        {onFitContent && (
          <button
            type="button"
            onClick={onFitContent}
            title="Paskan Tampilan Chart ke Layar (Auto Fit)"
            className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Paskan Layar</span>
          </button>
        )}

        {/* Replay button */}
     {/* Replay button + DEBUG */}
<button
  type="button"
  data-testid="replay-toggle-button"
  aria-pressed={showReplayControls}
  title={showReplayControls ? 'Tutup panel replay' : 'Mulai replay'}
  onPointerDown={() => {
    console.log('[REPLAY DEBUG] Pointer terdeteksi pada tombol');
  }}
  onClick={(event) => {
    event.preventDefault();
    event.stopPropagation();

    console.log('[REPLAY DEBUG] Tombol diklik');
    console.log('[REPLAY DEBUG] Status sebelum callback:', {
      showReplayControls,
      callbackType: typeof onToggleReplay,
    });

    if (typeof onToggleReplay !== 'function') {
      console.error(
        '[REPLAY ERROR] onToggleReplay bukan fungsi. Periksa props di TradingChart.tsx.'
      );
      return;
    }

    try {
      onToggleReplay();

      console.log(
        '[REPLAY DEBUG] Callback onToggleReplay berhasil dipanggil.'
      );
    } catch (error) {
      console.error(
        '[REPLAY ERROR] Callback gagal dijalankan:',
        error
      );
    }
  }}
  className={`pointer-events-auto relative z-50 flex shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-lg border px-3 py-1.5 font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    showReplayControls
      ? 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600'
      : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
  }`}
>
  {showReplayControls ? (
    <X className="h-3.5 w-3.5" />
  ) : (
    <Play className="h-3.5 w-3.5" />
  )}

  <span>
    {showReplayControls ? 'Tutup Replay' : 'Mulai Replay'}
  </span>
</button>
      </div>
    </div>
  );
};

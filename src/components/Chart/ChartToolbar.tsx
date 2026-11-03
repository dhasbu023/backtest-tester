
import { useState } from 'react';

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

import { TIMEZONE_OPTIONS } from '../../types/index.js';
import { getAllowedTimeframes } from '../../server/timeframeAggregator.js';

// ============================================
// PROPS
// ============================================

interface ChartToolbarProps {
  sourceTimeframe: Timeframe;
  activeTimeframe: Timeframe;
  onChangeTimeframe: (tf: Timeframe) => void;

  activeTimezone: string;
  onChangeTimezone: (tz: string) => void;

  indicators: IndicatorConfig[];
  onOpenIndicatorsModal: () => void;

  // Fit Content
  onFitContent?: () => void;

  // Replay
  showReplayControls?: boolean;
  onToggleReplay?: () => void;

  // Order
  canCreateOrder?: boolean;
  onCreateOrderClick?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export const ChartToolbar = ({
  sourceTimeframe,
  activeTimeframe,
  onChangeTimeframe,

  activeTimezone,
  onChangeTimezone,

  indicators,
  onOpenIndicatorsModal,
  onFitContent,

  // Replay
  showReplayControls = false,
  onToggleReplay,

  // Order
  canCreateOrder = false,
  onCreateOrderClick,
}: ChartToolbarProps) => {
  const [showTzDropdown, setShowTzDropdown] = useState(false);

  // ==========================================
  // TIMEFRAME
  // ==========================================

  const allowedTimeframes = getAllowedTimeframes(sourceTimeframe);

  // ==========================================
  // TIMEZONE
  // ==========================================

  const activeTzObj =
    TIMEZONE_OPTIONS.find(
      (timezone) => timezone.id === activeTimezone
    ) || TIMEZONE_OPTIONS[1];

  // ==========================================
  // INDICATORS
  // ==========================================

  const activeIndicatorsCount = indicators.filter(
    (indicator) => indicator.visible
  ).length;

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleToggleTimezone = () => {
    setShowTzDropdown((previous) => !previous);
  };

  const handleSelectTimezone = (timezoneId: string) => {
    onChangeTimezone(timezoneId);
    setShowTzDropdown(false);
  };

  const handleToggleReplay = () => {
    onToggleReplay?.();
  };

  const handleCreateOrder = () => {
    if (!canCreateOrder) {
      console.warn('[CHART TOOLBAR] Order belum bisa dibuat.');
      return;
    }

    if (!onCreateOrderClick) {
      console.error(
        '[CHART TOOLBAR] onCreateOrderClick belum diteruskan dari ChartPage.'
      );
      return;
    }

    onCreateOrderClick();
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div
      className="
        relative z-30 flex h-10 w-full shrink-0
        select-none items-center justify-between gap-2
        border-b border-slate-200 bg-slate-50 px-3
        text-xs dark:border-slate-800 dark:bg-slate-900
      "
    >
      {/* ======================================
          LEFT: TIMEFRAME + INDICATORS
          ====================================== */}

      <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">

        {/* TIMEFRAME BUTTONS */}

        <div
          className="
            flex shrink-0 items-center gap-0.5
            rounded-lg border border-slate-300/60
            bg-slate-200/70 p-0.5
            dark:border-slate-700/60 dark:bg-slate-800
          "
        >
          {(
            ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'] as Timeframe[]
          ).map((tf) => {
            const isAllowed = allowedTimeframes.includes(tf);
            const isActive = activeTimeframe === tf;

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
                className={`
                  cursor-pointer rounded px-2 py-0.5
                  font-mono text-xs font-bold transition-all
                  ${
                    isActive
                      ? 'bg-blue-600 text-white shadow'
                      : isAllowed
                        ? 'text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
                        : 'cursor-not-allowed text-slate-300 opacity-35 dark:text-slate-600'
                  }
                `}
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

        {/* DIVIDER */}

        <div className="mx-1 h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-800" />

        {/* INDICATORS */}

        <button
          type="button"
          onClick={onOpenIndicatorsModal}
          className="
            flex shrink-0 cursor-pointer items-center gap-1.5
            rounded-lg border border-slate-200 bg-white
            px-2.5 py-1 text-slate-700 transition-colors
            hover:bg-slate-100
            dark:border-slate-700 dark:bg-slate-800
            dark:text-slate-200 dark:hover:bg-slate-700
          "
        >
          <Sliders className="h-3.5 w-3.5 text-blue-500" />

          <span className="text-[11px] font-semibold">
            Indikator
          </span>

          {activeIndicatorsCount > 0 && (
            <span
              className="
                rounded-full bg-blue-100 px-1.5 py-0.5
                text-[10px] font-bold text-blue-700
                dark:bg-blue-900 dark:text-blue-300
              "
            >
              {activeIndicatorsCount}
            </span>
          )}
        </button>
      </div>

      {/* ======================================
          RIGHT: TIMEZONE + REPLAY + ORDER
          ====================================== */}

      <div className="relative z-40 flex shrink-0 items-center gap-2">

        {/* TIMEZONE */}

        <div className="relative">

          <button
            type="button"
            onClick={handleToggleTimezone}
            aria-expanded={showTzDropdown}
            aria-haspopup="true"
            className="
              flex cursor-pointer items-center gap-1.5
              rounded-lg border border-slate-200 bg-white
              px-2.5 py-1 text-xs font-medium text-slate-700
              transition-colors hover:bg-slate-100
              dark:border-slate-700 dark:bg-slate-800
              dark:text-slate-200 dark:hover:bg-slate-700
            "
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

          {/* TIMEZONE DROPDOWN */}

          {showTzDropdown && (
            <div
              className="
                absolute right-0 top-full z-[100]
                mt-1 w-64 space-y-1 rounded-xl
                border border-slate-200 bg-white p-2
                text-xs shadow-2xl
                dark:border-slate-800 dark:bg-slate-900
              "
            >
              <div
                className="
                  border-b border-slate-100 px-2 py-1
                  text-[10px] font-bold uppercase
                  tracking-wider text-slate-400
                  dark:border-slate-800
                "
              >
                Pilih Timezone Tampilan
              </div>

              <div className="max-h-60 space-y-0.5 overflow-y-auto pr-1">
                {TIMEZONE_OPTIONS.map((tz) => {
                  const isSelected = activeTimezone === tz.id;

                  return (
                    <button
                      key={tz.id}
                      type="button"
                      onClick={() => handleSelectTimezone(tz.id)}
                      className={`
                        flex w-full cursor-pointer
                        items-center justify-between
                        rounded-lg p-2 text-left
                        transition-colors
                        ${
                          isSelected
                            ? 'bg-blue-50 font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                        }
                      `}
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

        {/* FIT CONTENT */}

        {onFitContent && (
          <button
            type="button"
            onClick={onFitContent}
            title="Paskan Tampilan Chart ke Layar (Auto Fit)"
            className="
              flex shrink-0 cursor-pointer items-center gap-1
              rounded-lg border border-slate-300 bg-white
              px-2 py-1.5 font-medium text-slate-700
              shadow-sm transition-colors
              hover:bg-slate-100 hover:text-blue-600
              dark:border-slate-700 dark:bg-slate-800
              dark:text-slate-300 dark:hover:bg-slate-700
              dark:hover:text-white
            "
          >
            <Maximize2 className="h-3.5 w-3.5" />

            <span className="hidden md:inline">
              Paskan Layar
            </span>
          </button>
        )}

        {/* REPLAY */}

        <button
          type="button"
          data-testid="replay-toggle-button"
          aria-pressed={showReplayControls}
          title={
            showReplayControls
              ? 'Tutup panel replay'
              : 'Mulai replay'
          }
          onClick={handleToggleReplay}
          className={`
            pointer-events-auto relative z-50
            flex shrink-0 cursor-pointer select-none
            items-center gap-1.5 rounded-lg border
            px-3 py-1.5 font-semibold shadow-sm
            transition-colors focus:outline-none
            focus:ring-2 focus:ring-blue-500
            ${
              showReplayControls
                ? 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600'
                : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
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

        {/* ==================================
            CREATE ORDER
            Hanya muncul saat replay aktif
            ================================== */}

        {showReplayControls && (
          <button
            type="button"
            data-testid="create-order-button"
            onClick={handleCreateOrder}
            disabled={!canCreateOrder}
            aria-disabled={!canCreateOrder}
            title={
              canCreateOrder
                ? 'Buka form order baru'
                : 'Harga replay belum tersedia'
            }
            className="
              pointer-events-auto relative z-50
              flex shrink-0 cursor-pointer
              items-center gap-1.5 rounded-md
              border border-emerald-600
              bg-emerald-600 px-2.5 py-1.5
              text-[11px] font-semibold text-white
              transition-colors hover:bg-emerald-700
              focus:outline-none focus:ring-2
              focus:ring-emerald-500 focus:ring-offset-1
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            <span className="text-sm font-bold">+</span>

            <span>Buat Order</span>
          </button>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Calendar,
  Clock,
  Gauge,
  CheckCircle2,
  Save,
  X,
} from 'lucide-react';
import type { Timeframe } from '../../types/index.js';
import {
  formatDateTimeWithTz,
  parseLocalDateTimeToUTC,
} from '../../utils/timezone.js';

interface ReplayControlPanelProps {
  currentIndex: number;
  totalCandles: number;
  currentTimestamp: number;
  sourceTimeframe: Timeframe;
  activeTimeframe: Timeframe;
  activeTimezone: string;
  isPlaying: boolean;
  replaySpeed: number;
  isSaving?: boolean;
  onPlayPause: () => void;
  onNextCandle: () => void;
  onPrevCandle: () => void;
  onReset: () => void;
  onSeek: (index: number) => void;
  onChangeSpeed: (speed: number) => void;
  onChangeTimeframe: (tf: Timeframe) => void;
  onJumpToTimestamp?: (timestamp: number) => void;
}

const SPEED_OPTIONS = [0.5, 1, 2, 5, 10, 20];

export const ReplayControlPanel: React.FC<ReplayControlPanelProps> = ({
  currentIndex,
  totalCandles,
  currentTimestamp,
  activeTimezone,
  isPlaying,
  replaySpeed,
  isSaving = false,
  onPlayPause,
  onNextCandle,
  onPrevCandle,
  onReset,
  onSeek,
  onChangeSpeed,
  onJumpToTimestamp,
}) => {
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [jumpInput, setJumpInput] = useState('');

  const maxIndex = Math.max(0, totalCandles - 1);
  const safeIndex = Math.min(Math.max(0, currentIndex), maxIndex);

  const percentProgress =
    totalCandles > 0
      ? Math.round((safeIndex / maxIndex) * 100) || 0
      : 0;

  const handleJumpSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!jumpInput.trim() || !onJumpToTimestamp) return;

    const parsedUTC = parseLocalDateTimeToUTC(
      jumpInput.trim(),
      activeTimezone,
    );

    if (parsedUTC !== null) {
      onJumpToTimestamp(parsedUTC);
      setShowJumpModal(false);
      setJumpInput('');
    } else {
      alert(
        `Format waktu tidak valid. Gunakan YYYY-MM-DD HH:mm dalam zona ${activeTimezone}.`,
      );
    }
  };

  return (
    <>
      {/* Floating replay card */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-40 flex justify-center px-3 sm:bottom-4">
        <section
          aria-label="Kontrol chart replay"
          className="pointer-events-auto w-full max-w-[620px] overflow-visible rounded-xl border border-slate-200/90 bg-white/95 p-2.5 text-slate-800 shadow-xl backdrop-blur-md dark:border-slate-700/90 dark:bg-slate-900/95 dark:text-slate-100 sm:p-3"
        >
          {/* Progress */}
          <div className="mb-2 flex items-center gap-2">
            <span className="shrink-0 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Replay
            </span>

            <input
              type="range"
              min={0}
              max={maxIndex}
              value={safeIndex}
              disabled={totalCandles === 0}
              onChange={(event) =>
                onSeek(Number.parseInt(event.target.value, 10))
              }
              aria-label="Posisi replay"
              className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600 disabled:cursor-not-allowed dark:bg-slate-700"
            />

            <span className="shrink-0 font-mono text-[10px] text-slate-500 dark:text-slate-400">
              {safeIndex + 1}/{totalCandles}
            </span>

            <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              {percentProgress}%
            </span>
          </div>

          {/* Compact controls */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onReset}
                title="Reset replay"
                aria-label="Reset replay"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onPrevCandle}
                disabled={safeIndex <= 0}
                title="Candle sebelumnya"
                aria-label="Candle sebelumnya"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onPlayPause}
                disabled={totalCandles === 0}
                title="Play / Pause (Spasi)"
                className={`flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-40 ${
                  isPlaying
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                )}
                {isPlaying ? 'Pause' : 'Play'}
              </button>

              <button
                type="button"
                onClick={onNextCandle}
                disabled={safeIndex >= maxIndex}
                title="Candle berikutnya"
                aria-label="Candle berikutnya"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Speed selector */}
            <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <Gauge className="mx-1 h-3.5 w-3.5 shrink-0 text-slate-400" />

              {SPEED_OPTIONS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => onChangeSpeed(speed)}
                  aria-pressed={replaySpeed === speed}
                  title={`Kecepatan ${speed}x`}
                  className={`rounded-md px-1.5 py-1 text-[10px] font-semibold transition-colors ${
                    replaySpeed === speed
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Time, jump, save status */}
            <div className="flex min-w-0 items-center gap-1.5">
              <div
                className="flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/80"
                title={`Waktu candle: ${activeTimezone}`}
              >
                <Clock className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span className="truncate font-mono text-[10px] font-semibold">
                  {formatDateTimeWithTz(
                    currentTimestamp,
                    activeTimezone,
                  )}
                </span>
              </div>

              {onJumpToTimestamp && (
                <button
                  type="button"
                  onClick={() => setShowJumpModal(true)}
                  title="Lompat ke tanggal dan waktu"
                  aria-label="Lompat ke tanggal dan waktu"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"
                >
                  <Calendar className="h-4 w-4" />
                </button>
              )}

              <div
                className="hidden shrink-0 items-center justify-center sm:flex"
                title={isSaving ? 'Menyimpan perubahan' : 'Perubahan tersimpan'}
              >
                {isSaving ? (
                  <Save className="h-3.5 w-3.5 animate-pulse text-amber-500" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Jump to date modal */}
      {showJumpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="replay-jump-title"
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span id="replay-jump-title">Lompat ke Waktu</span>
              </div>

              <button
                type="button"
                onClick={() => setShowJumpModal(false)}
                aria-label="Tutup"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Masukkan tanggal dan waktu sesuai zona waktu{' '}
              <strong>{activeTimezone}</strong>. Format:
              {' '}
              <code className="text-blue-500">YYYY-MM-DD HH:mm</code>.
              Replay akan mencari candle pada waktu tersebut.
            </p>

            <form onSubmit={handleJumpSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="2026-07-01 04:00"
                value={jumpInput}
                onChange={(event) => setJumpInput(event.target.value)}
                autoFocus
                required
                aria-label="Tanggal dan waktu tujuan"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowJumpModal(false)}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Lompat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

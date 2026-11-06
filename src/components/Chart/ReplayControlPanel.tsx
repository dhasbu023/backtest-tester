
import React, { useRef, useState } from 'react';

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

  const [panelPosition, setPanelPosition] = useState<{
    x: number | null;
    y: number | null;
  }>({
    x: null,
    y: null,
  });

  const [isDragging, setIsDragging] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  // ==========================================
  // REPLAY PROGRESS
  // ==========================================

  const maxIndex = Math.max(0, totalCandles - 1);

  const safeIndex = Math.min(
    Math.max(0, currentIndex),
    maxIndex,
  );

  const percentProgress =
    totalCandles > 1
      ? Math.round((safeIndex / maxIndex) * 100)
      : 0;

  // ==========================================
  // DRAG PANEL
  // ==========================================

  const handleDragStart = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;

    if (
      target.closest(
        'button, input, select, textarea, a, [role="slider"]',
      )
    ) {
      return;
    }

    const panel = panelRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();

    event.preventDefault();

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialX: rect.left,
      initialY: rect.top,
    };

    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const panel = panelRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    const maxX = Math.max(0, window.innerWidth - rect.width);
    const maxY = Math.max(0, window.innerHeight - rect.height);

    const nextX = Math.max(
      0,
      Math.min(maxX, drag.initialX + deltaX),
    );

    const nextY = Math.max(
      0,
      Math.min(maxY, drag.initialY + deltaY),
    );

    setPanelPosition({
      x: nextX,
      y: nextY,
    });
  };

  const handleDragEnd = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  // ==========================================
  // JUMP TO TIME
  // ==========================================

  const handleJumpSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!jumpInput.trim() || !onJumpToTimestamp) {
      return;
    }

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

  // ==========================================
  // PANEL POSITION
  // ==========================================

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 40,

    left:
      panelPosition.x !== null
        ? `${panelPosition.x}px`
        : '50%',

    top:
      panelPosition.y !== null
        ? `${panelPosition.y}px`
        : 'auto',

    bottom:
      panelPosition.y === null
        ? '12px'
        : 'auto',

    transform:
      panelPosition.x === null
        ? 'translateX(-50%)'
        : 'none',

    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: isDragging ? 'none' : 'auto',
    WebkitUserSelect: isDragging ? 'none' : 'auto',
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <>
      <div
        ref={panelRef}
        style={panelStyle}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        onLostPointerCapture={handleDragEnd}
        className="w-[min(500px,calc(100vw-20px))]"
      >
        <section
          aria-label="Kontrol chart replay"
          className={`
            overflow-hidden rounded-lg border
            border-slate-200/90
            bg-white/95 px-2.5 py-2
            text-slate-800 shadow-lg
            backdrop-blur-md
            dark:border-slate-700/90
            dark:bg-slate-900/95
            dark:text-slate-100
            ${isDragging ? 'shadow-2xl' : ''}
          `}
        >
          {/* PROGRESS */}

          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="shrink-0 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
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
              className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600 disabled:cursor-not-allowed dark:bg-slate-700"
            />

            <span className="shrink-0 font-mono text-[9px] text-slate-500 dark:text-slate-400">
              {safeIndex + 1}/{totalCandles}
            </span>

            <span className="shrink-0 rounded bg-blue-50 px-1 py-0.5 text-[9px] font-semibold text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              {percentProgress}%
            </span>
          </div>

          {/* CONTROLS */}

          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">

            {/* PLAYBACK */}

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={onReset}
                title="Reset replay"
                aria-label="Reset replay"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={onPrevCandle}
                disabled={safeIndex <= 0}
                title="Candle sebelumnya"
                aria-label="Candle sebelumnya"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={onPlayPause}
                disabled={totalCandles === 0}
                title="Play / Pause (Spasi)"
                className={`
                  flex h-7 items-center justify-center gap-1
                  rounded-md px-2.5 text-[10px] font-semibold
                  text-white shadow-sm
                  disabled:opacity-40
                  ${
                    isPlaying
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }
                `}
              >
                {isPlaying ? (
                  <Pause className="h-3 w-3 fill-current" />
                ) : (
                  <Play className="h-3 w-3 fill-current" />
                )}

                {isPlaying ? 'Pause' : 'Play'}
              </button>

              <button
                type="button"
                onClick={onNextCandle}
                disabled={safeIndex >= maxIndex}
                title="Candle berikutnya"
                aria-label="Candle berikutnya"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* SPEED */}

            <div className="flex items-center gap-0.5 rounded-md bg-slate-100 p-0.5 dark:bg-slate-800">
              <Gauge className="mx-1 h-3 w-3 shrink-0 text-slate-400" />

              {SPEED_OPTIONS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => onChangeSpeed(speed)}
                  aria-pressed={replaySpeed === speed}
                  title={`Kecepatan ${speed}x`}
                  className={`
                    rounded px-1 py-0.5
                    text-[9px] font-semibold
                    transition-colors
                    ${
                      replaySpeed === speed
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
                    }
                  `}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* TIME AND ACTIONS */}

            <div className="flex min-w-0 items-center gap-1">
              <div
                className="flex min-w-0 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 dark:border-slate-700 dark:bg-slate-800/80"
                title={`Waktu candle: ${activeTimezone}`}
              >
                <Clock className="h-3 w-3 shrink-0 text-blue-500" />

                <span className="truncate font-mono text-[9px] font-semibold">
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
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"
                >
                  <Calendar className="h-3.5 w-3.5" />
                </button>
              )}

              <div
                className="flex h-7 w-5 shrink-0 items-center justify-center"
                title={
                  isSaving
                    ? 'Menyimpan perubahan'
                    : 'Perubahan tersimpan'
                }
              >
                {isSaving ? (
                  <Save className="h-3 w-3 animate-pulse text-amber-500" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* JUMP TO DATE MODAL */}

      {showJumpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="replay-jump-title"
            className="w-full max-w-xs rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />

                <span id="replay-jump-title">
                  Lompat ke Waktu
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowJumpModal(false)}
                aria-label="Tutup"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="mb-3 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              Masukkan tanggal dan waktu sesuai zona waktu{' '}
              <strong>{activeTimezone}</strong>. Format{' '}
              <code className="text-blue-500">
                YYYY-MM-DD HH:mm
              </code>.
            </p>

            <form
              onSubmit={handleJumpSubmit}
              className="space-y-2.5"
            >
              <input
                type="text"
                placeholder="2026-07-01 04:00"
                value={jumpInput}
                onChange={(event) =>
                  setJumpInput(event.target.value)
                }
                autoFocus
                required
                aria-label="Tanggal dan waktu tujuan"
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-mono text-[10px] text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowJumpModal(false)}
                  className="rounded-md px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-blue-700"
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

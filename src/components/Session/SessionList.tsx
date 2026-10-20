import React, { useState } from 'react';
import {
  Play,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Layers,
  Activity,
  ChevronRight,
  TrendingUp,
  Database,
  ArrowRight,
} from 'lucide-react';
import { BacktestSession } from '../types/index.js';

interface SessionListProps {
  sessions: BacktestSession[];
  isLoading: boolean;
  onSelectSession: (sessionId: string) => void;
  onOpenCreateModal: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  isLoading,
  onSelectSession,
  onOpenCreateModal,
  onDeleteSession,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '-';
    try {
      const dt = new Date(ts * 1000);
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dt) + ' WIB';
    } catch {
      return '-';
    }
  };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 text-xs font-semibold backdrop-blur-xs">
            <Activity className="w-3.5 h-3.5 text-blue-300" />
            <span>Forex Backtest Workstation V4</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            XAUUSD Backtest Lab
          </h1>

          <p className="text-sm text-blue-100/90 leading-relaxed">
            Replay chart forex profesional berbasis data historis MT5 asli dengan multi-timeframe agregasi, pencegahan kebocoran masa depan, dan penyimpanan sesi PostgreSQL.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenCreateModal}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-white text-blue-700 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-700" />
              <span>Buat Sesi Backtest</span>
            </button>
          </div>
        </div>

        {/* Ambient watermark */}
        <div className="absolute right-4 bottom-2 text-[140px] font-black text-white/5 select-none pointer-events-none font-mono">
          MT5
        </div>
      </div>

      {/* Sessions Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Daftar Sesi Backtest</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {sessions.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lanjutkan replay dari posisi terakhir atau buat sesi baru
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Sesi Baru</span>
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12 text-slate-400 text-sm flex items-center justify-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
          <span>Memuat sesi dari PostgreSQL...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && sessions.length === 0 && (
        <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
            <Play className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Belum ada sesi backtest
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              Buat sesi pertama kamu menggunakan dataset sampel MT5 bawaan atau unggah file CSV MT5 sendiri.
            </p>
          </div>
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Mulai Backtest Sekarang</span>
          </button>
        </div>
      )}

      {/* Sessions Cards Grid */}
      {!isLoading && sessions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => {
            const isDeleting = deleteConfirmId === session.id;

            return (
              <div
                key={session.id}
                className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Symbol & Status */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-sm px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {session.symbol}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Chart: {session.activeTimeframe}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        (Sumber: {session.sourceTimeframe})
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {session.status}
                    </span>
                  </div>

                  {/* Session Title */}
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {session.name}
                  </h3>

                  {/* Dataset info */}
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{session.dataset?.name || (session as any).datasetName || 'XAUUSD MT5 Dataset'}</span>
                  </div>

                  {/* Replay Details */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-[11px] mb-4 border border-slate-100 dark:border-slate-800/80">
                    <div>
                      <span className="text-slate-400 block">Posisi Replay Terakhir:</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatTime(session.currentReplayTime)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Kemajuan Candle:</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                        Candle #{session.currentCandleIndex + 1}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Kecepatan:</span>
                      <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                        {session.replaySpeed}x
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Terakhir Diperbarui:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {formatDate(session.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  {isDeleting ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-rose-600 font-semibold">Hapus sesi ini?</span>
                      <button
                        onClick={() => onDeleteSession(session.id)}
                        className="px-2.5 py-1 rounded bg-rose-600 text-white font-semibold hover:bg-rose-700"
                      >
                        Ya
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(session.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Hapus Sesi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => onSelectSession(session.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Lanjutkan Sesi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

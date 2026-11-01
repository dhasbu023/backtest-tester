
import React, { useState } from 'react';
import {
  Play,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Layers,
  Activity,
  TrendingUp,
  Database,
  ArrowRight,
  Wallet,
  Gauge,
  BarChart3,
  ChevronRight,
  X,
  AlertTriangle,
} from 'lucide-react';

import { BacktestSession } from '../../types/index.js';

interface SessionListProps {
  sessions: BacktestSession[];
  isLoading: boolean;
  onSelectSession: (sessionId: string) => void;
  onOpenCreateModal: () => void;
  onDeleteSession: (sessionId: string) => void;
}

type SessionWithAccount = BacktestSession & {
  initialBalance?: number;
  currentBalance?: number;
  leverage?: number;
};

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
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '-';

    try {
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(ts * 1000)) + ' WIB';
    } catch {
      return '-';
    }
  };

  const formatMoney = (value?: number) => {
    if (value === undefined || value === null || !Number.isFinite(value)) {
      return '-';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getStatusStyle = (status?: string) => {
    const normalized = (status || '').toUpperCase();

    if (normalized === 'COMPLETED' || normalized === 'FINISHED') {
      return {
        label: 'Selesai',
        className:
          'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
        dot: 'bg-blue-500',
      };
    }

    if (normalized === 'PAUSED') {
      return {
        label: 'Dijeda',
        className:
          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
        dot: 'bg-amber-500',
      };
    }

    return {
      label: status || 'Aktif',
      className:
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
      dot: 'bg-emerald-500',
    };
  };

  return (
    <div className="min-h-full w-full bg-slate-50 dark:bg-[#090e1a] transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-7">

        {/* ================= HERO HEADER ================= */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#102b5c] via-[#16418a] to-[#312e81] shadow-xl shadow-blue-950/10">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -right-20 -top-32 w-96 h-96 rounded-full border-[45px] border-white" />
            <div className="absolute -right-5 -bottom-48 w-96 h-96 rounded-full border-[45px] border-white" />
          </div>

          <div className="relative z-10 p-6 sm:p-9 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-7">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-blue-100 text-[11px] font-semibold tracking-wide">
                <Activity className="w-3.5 h-3.5 text-emerald-300" />
                BACKTEST WORKSTATION
                <span className="w-1 h-1 rounded-full bg-emerald-300 animate-pulse" />
                V4
              </div>

              <div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                  XAUUSD Backtest Lab
                </h1>
                <p className="mt-3 text-sm sm:text-base text-blue-100/80 leading-relaxed max-w-xl">
                  Analisis strategi trading menggunakan data historis MT5.
                  Lakukan replay market, kelola posisi, dan evaluasi performa
                  trading dalam satu workstation.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[11px] text-blue-100/75">
                <span className="inline-flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  Historical MT5 Data
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Multi-Timeframe
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Trading Analysis
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <button
                onClick={onOpenCreateModal}
                className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-white text-blue-800 hover:bg-blue-50 font-bold text-sm shadow-lg transition-all active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                Buat Sesi Backtest
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-blue-100/70">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Workspace siap digunakan
              </div>
            </div>
          </div>
        </section>

        {/* ================= OVERVIEW ================= */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Sesi</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {sessions.length}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Sesi Aktif</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {sessions.filter(s => {
                  const status = (s.status || '').toUpperCase();
                  return status !== 'COMPLETED' && status !== 'FINISHED';
                }).length}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
              <Database className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Data Source</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                PostgreSQL
              </p>
            </div>
          </div>
        </section>

        {/* ================= SESSION HEADER ================= */}
        <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Daftar Sesi Backtest
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                {sessions.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Pilih sesi untuk melanjutkan replay atau mengelola backtest.
            </p>
          </div>

          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Sesi Baru
          </button>
        </section>

        {/* ================= LOADING ================= */}
        {isLoading && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-[3px] border-blue-100 dark:border-blue-950 border-t-blue-600 animate-spin" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Memuat sesi backtest...
            </p>
            <p className="text-xs text-slate-400">
              Mengambil data dari PostgreSQL
            </p>
          </div>
        )}

        {/* ================= EMPTY STATE ================= */}
        {!isLoading && sessions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-5 py-16 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
              <Play className="w-7 h-7 text-blue-600 dark:text-blue-400 fill-current" />
            </div>

            <h3 className="mt-5 text-base font-bold text-slate-900 dark:text-white">
              Belum Ada Sesi Backtest
            </h3>

            <p className="max-w-sm mx-auto mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Mulai dengan membuat sesi baru. Pilih dataset MT5 yang tersedia
              atau unggah data historis CSV milikmu.
            </p>

            <button
              onClick={onOpenCreateModal}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Buat Sesi Pertama
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ================= SESSION CARDS ================= */}
        {!isLoading && sessions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sessions.map((session) => {
              const account = session as SessionWithAccount;
              const isDeleting = deleteConfirmId === session.id;
              const statusStyle = getStatusStyle(session.status);

              const initialBalance = account.initialBalance;
              const currentBalance =
                account.currentBalance ?? initialBalance;

              return (
                <article
                  key={session.id}
                  className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 shadow-sm hover:shadow-lg hover:shadow-blue-950/5 transition-all duration-200"
                >
                  {/* Card Accent */}
                  <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 opacity-80" />

                  <div className="p-5">
                    {/* Card Top */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-xs font-extrabold font-mono">
                            {session.symbol || 'XAUUSD'}
                          </span>

                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                            <Layers className="w-3 h-3" />
                            {session.activeTimeframe}
                          </span>

                          <span className="text-[10px] text-slate-400">
                            Source: {session.sourceTimeframe || '-'}
                          </span>
                        </div>

                        <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {session.name}
                        </h3>

                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
                          <Database className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {session.dataset?.name ||
                              (session as any).datasetName ||
                              'XAUUSD MT5 Dataset'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${statusStyle.className}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                        {statusStyle.label}
                      </span>
                    </div>

                    {/* Account Information */}
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-3 min-w-0">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Wallet className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[10px]">Modal Awal</span>
                        </div>
                        <p className="mt-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate tabular-nums">
                          {formatMoney(initialBalance)}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-3 min-w-0">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[10px]">Balance</span>
                        </div>
                        <p className="mt-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate tabular-nums">
                          {formatMoney(currentBalance)}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-3 min-w-0">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Gauge className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[10px]">Leverage</span>
                        </div>
                        <p className="mt-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate tabular-nums">
                          {account.leverage ? `1:${account.leverage}` : '-'}
                        </p>
                      </div>
                    </div>

                    {/* Replay Information */}
                    <div className="mt-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Replay Information
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          <Activity className="w-3 h-3" />
                          Replay
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            Posisi Terakhir
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {formatTime(session.currentReplayTime)}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <BarChart3 className="w-3 h-3" />
                            Candle Index
                          </p>
                          <p className="mt-1 text-[11px] font-semibold font-mono text-slate-700 dark:text-slate-300">
                            #{(session.currentCandleIndex ?? 0) + 1}
                          </p>
                        </div>

                        <div>
                          <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <Activity className="w-3 h-3" />
                            Kecepatan
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                            {session.replaySpeed ?? 1}x
                          </p>
                        </div>

                        <div>
                          <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <Calendar className="w-3 h-3" />
                            Diperbarui
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {formatDate(session.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      {isDeleting ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Hapus sesi ini?
                          </span>

                          <button
                            onClick={() => {
                              onDeleteSession(session.id);
                              setDeleteConfirmId(null);
                            }}
                            className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold transition-colors"
                          >
                            Ya, Hapus
                          </button>

                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold transition-colors"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(session.id)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Hapus sesi"
                          aria-label="Hapus sesi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => onSelectSession(session.id)}
                        className="ml-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Lanjutkan Sesi
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ================= FOOTER ================= */}
        {!isLoading && sessions.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-3 text-[10px] text-slate-400 dark:text-slate-600">
            <Database className="w-3 h-3" />
            Data sesi tersimpan pada database PostgreSQL
          </div>
        )}
      </div>
    </div>
  );
};

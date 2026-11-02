import { useNavigate } from 'react-router-dom';

import {
  FolderOpen,
  Plus,
  ArrowRight,
  Clock,
  ChartNoAxesCombined,
} from 'lucide-react';

import type { BacktestSession } from '../types/index.js';

type DashboardPageProps = {
  sessions?: BacktestSession[];
  isLoading?: boolean;
  onOpenCreateSession?: () => void;
};

export default function DashboardPage({
  sessions,
  isLoading = false,
  onOpenCreateSession,
}: DashboardPageProps) {
  const navigate = useNavigate();

  // Pastikan sessions selalu berupa array
  const safeSessions: BacktestSession[] = Array.isArray(sessions)
    ? sessions
    : [];

  // Ambil maksimal 5 sesi terbaru
  const recentSessions = safeSessions.slice(0, 5);

  const handleCreateSession = () => {
    if (onOpenCreateSession) {
      onOpenCreateSession();
    } else {
      navigate('/sessions');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* WELCOME */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome to Forex Tester
          </h1>

          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola sesi dan pantau aktivitas backtesting kamu.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateSession}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Session
        </button>
      </section>

      {/* SUMMARY CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* TOTAL SESSIONS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Total Sessions
            </p>

            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <p className="text-3xl font-bold mt-4">
            {isLoading ? '...' : safeSessions.length}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Sesi backtest tersimpan
          </p>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Recent Activity
            </p>

            <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
          </div>

          <p className="text-3xl font-bold mt-4">
            {isLoading ? '...' : recentSessions.length}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Sesi ditampilkan di daftar terbaru
          </p>
        </div>

        {/* TRADING ANALYTICS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Trading Analytics
            </p>

            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <ChartNoAxesCombined className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          <p className="text-sm font-semibold mt-5">
            View Statistics
          </p>

          <button
            type="button"
            onClick={() => navigate('/statistics')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
          >
            Open analytics →
          </button>
        </div>
      </section>

      {/* RECENT SESSIONS */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">

        <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="font-bold">
              Recent Sessions
            </h2>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Sesi backtest yang terakhir tersedia
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/sessions')}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Memuat sessions...
          </div>
        ) : safeSessions.length === 0 ? (
          <div className="p-10 text-center">
            <FolderOpen className="w-10 h-10 mx-auto text-slate-400 mb-3" />

            <p className="font-semibold">
              Belum ada sesi backtest
            </p>

            <p className="text-sm text-slate-500 mt-1">
              Buat sesi pertama untuk mulai melakukan backtesting.
            </p>

            <button
              type="button"
              onClick={handleCreateSession}
              className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              Create First Session
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentSessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() =>
                  navigate(`/chart/${encodeURIComponent(session.id)}`)
                }
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {session.name || 'Untitled Session'}
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    {session.symbol || 'XAUUSD'}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 shrink-0">
                  Open Session
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
import React, { useState, useEffect } from 'react';

import {
  Database,
  Sun,
  Moon,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

import type {
  DBStatus,
  Timeframe,
  IndicatorConfig,
} from '../types/index.js';

import { fetchDBStatus } from '../services/api.js';
import { ChartToolbar } from "./Chart/ChartToolbar.js";

interface HeaderProps {
  currentView: 'SESSIONS' | 'CHART';

  activeSessionName?: string;
  activeSessionSymbol?: string;

  onBackToSessions: () => void;

  isDarkMode: boolean;
  onToggleTheme: () => void;

  // Props toolbar chart
  sourceTimeframe?: Timeframe;
  activeTimeframe?: Timeframe;
  onChangeTimeframe?: (tf: Timeframe) => void;

  activeTimezone?: string;
  onChangeTimezone?: (tz: string) => void;

  indicators?: IndicatorConfig[];
  onOpenIndicatorsModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  activeSessionName,
  activeSessionSymbol,
  onBackToSessions,
  isDarkMode,
  onToggleTheme,

  sourceTimeframe,
  activeTimeframe,
  onChangeTimeframe,

  activeTimezone,
  onChangeTimezone,

  indicators = [],
  onOpenIndicatorsModal,
}) => {
  const [dbStatus, setDbStatus] = useState<DBStatus | null>(null);
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStatus = async () => {
    setIsRefreshing(true);

    try {
      const status = await fetchDBStatus();
      setDbStatus(status);
    } catch (error) {
      console.error('Gagal mengambil status database:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadStatus();

    const interval = window.setInterval(() => {
      void loadStatus();
    }, 15000);

    return () => window.clearInterval(interval);
  }, []);

  const canShowChartToolbar =
    currentView === 'CHART' &&
    sourceTimeframe !== undefined &&
    activeTimeframe !== undefined &&
    activeTimezone !== undefined &&
    onChangeTimeframe !== undefined &&
    onChangeTimezone !== undefined &&
    onOpenIndicatorsModal !== undefined;

  return (
    <header className="relative z-30 flex min-h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 transition-colors dark:border-slate-800 dark:bg-slate-900">
      {/* LEFT: NAVIGATION & BRAND */}
      <div className="flex shrink-0 items-center gap-3">
        {currentView === 'CHART' && (
          <button
            type="button"
            onClick={onBackToSessions}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Kembali ke daftar sesi"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Daftar Sesi</span>
          </button>
        )}

        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-blue-600 text-xs font-bold tracking-wider text-white shadow-sm">
            V4
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="whitespace-nowrap text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                XAUUSD Backtest Lab
              </span>

              <span className="hidden rounded border border-blue-200 bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 lg:inline">
                MT5 Replay
              </span>
            </div>

            {currentView === 'CHART' && activeSessionName && (
              <div
                className="max-w-48 truncate text-[10px] text-slate-500 dark:text-slate-400 xl:max-w-64"
                title={activeSessionName}
              >
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {activeSessionSymbol || 'XAUUSD'}:
                </span>{' '}
                {activeSessionName}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CENTER: CHART TOOLBAR CARD */}
      {canShowChartToolbar && (
        <div className="min-w-0 flex-1">
          <div className="rounded-xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <ChartToolbar
              sourceTimeframe={sourceTimeframe}
              activeTimeframe={activeTimeframe}
              onChangeTimeframe={onChangeTimeframe}
              activeTimezone={activeTimezone}
              onChangeTimezone={onChangeTimezone}
              indicators={indicators}
              onOpenIndicatorsModal={onOpenIndicatorsModal}
            />
          </div>
        </div>
      )}

      {/* RIGHT: DATABASE STATUS & THEME */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setShowStatusPopover((previous) => !previous)
            }
            aria-expanded={showStatusPopover}
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              dbStatus?.connected
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
            }`}
            title="Status koneksi database"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                dbStatus?.connected
                  ? 'animate-pulse bg-emerald-500'
                  : 'bg-amber-500'
              }`}
            />

            <Database className="h-3.5 w-3.5" />

            <span className="hidden xl:inline">
              {dbStatus?.connected ? 'Database Connected' : 'Checking DB...'}
            </span>

            {dbStatus?.latencyMs !== undefined &&
              dbStatus.latencyMs >= 0 && (
                <span className="font-mono text-[10px] opacity-75">
                  {dbStatus.latencyMs}ms
                </span>
              )}
          </button>

          {showStatusPopover && (
            <>
              <button
                type="button"
                aria-label="Tutup detail database"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setShowStatusPopover(false)}
              />

              <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-blue-500" />
                    <span>Koneksi Database PostgreSQL</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void loadStatus()}
                    className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Refresh status"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${
                        isRefreshing ? 'animate-spin' : ''
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-2.5 space-y-2 text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-semibold">
                      {dbStatus?.connected ? 'Terkoneksi' : 'Terputus'}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Engine:</span>
                    <span className="max-w-36 truncate">
                      {dbStatus?.engine || 'PostgreSQL'}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Database:</span>
                    <span className="font-mono">
                      {dbStatus?.database || 'xauusd_backtest'}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Latency:</span>
                    <span className="font-mono">
                      {dbStatus?.latencyMs ?? 0} ms
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-slate-100 pt-2 text-[10px] dark:border-slate-800">
                    <span>
                      Candles:{' '}
                      <b className="text-blue-600 dark:text-blue-400">
                        {(dbStatus?.candleCount ?? 0).toLocaleString()}
                      </b>
                    </span>

                    <span>
                      Datasets:{' '}
                      <b className="text-blue-600 dark:text-blue-400">
                        {dbStatus?.datasetCount ?? 0}
                      </b>
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          title={
            isDarkMode
              ? 'Beralih ke tema terang'
              : 'Beralih ke tema gelap'
          }
          aria-label="Ganti tema"
        >
          {isDarkMode ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600" />
          )}
        </button>
      </div>
    </header>
  );
};

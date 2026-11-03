
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Database,
  RefreshCw,
  Search,
  AlertCircle,
  CalendarDays,
  CandlestickChart,
  HardDrive,
  FileSpreadsheet,
} from 'lucide-react';

import type { Dataset } from '../types/index.js';

// ============================================
// HELPERS
// ============================================

function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '-';

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(value?: string | Date | null): string {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

// ============================================
// COMPONENT
// ============================================

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [search, setSearch] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // LOAD DATASETS
  // ==========================================

  const loadDatasets = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      const response = await fetch('/api/datasets', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Gagal mengambil dataset. HTTP ${response.status}`
        );
      }

      const result = await response.json();

      // Mendukung response berupa array langsung
      // maupun object { datasets: [...] } atau { data: [...] }.
      const datasetList: Dataset[] = Array.isArray(result)
        ? result
        : Array.isArray(result?.datasets)
          ? result.datasets
          : Array.isArray(result?.data)
            ? result.data
            : [];

      setDatasets(datasetList);
    } catch (err) {
      console.error('[DATASETS] Gagal memuat dataset:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat mengambil dataset.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDatasets();
  }, [loadDatasets]);

  // ==========================================
  // SEARCH
  // ==========================================

  const filteredDatasets = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return datasets;
    }

    return datasets.filter((dataset) => {
      return (
        dataset.name?.toLowerCase().includes(keyword) ||
        dataset.symbol?.toLowerCase().includes(keyword) ||
        dataset.timeframe?.toLowerCase().includes(keyword) ||
        dataset.sourceFormat?.toLowerCase().includes(keyword)
      );
    });
  }, [datasets, search]);

  // ==========================================
  // SUMMARY
  // ==========================================

  const totalCandles = useMemo(() => {
    return datasets.reduce(
      (total, dataset) => total + (dataset.candleCount || 0),
      0
    );
  }, [datasets]);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div
      className="
        flex h-full min-h-0 w-full flex-col
        overflow-y-auto bg-slate-50 p-5
        dark:bg-slate-950
      "
    >
      {/* HEADER */}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />

            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Datasets
            </h1>
          </div>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola dan lihat data market yang tersimpan.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDatasets(true)}
          disabled={isLoading || isRefreshing}
          className="
            flex items-center gap-2 rounded-lg
            border border-slate-200 bg-white
            px-3 py-2 text-sm font-medium
            text-slate-700 transition-colors
            hover:bg-slate-100
            disabled:cursor-not-allowed disabled:opacity-50
            dark:border-slate-700 dark:bg-slate-900
            dark:text-slate-200 dark:hover:bg-slate-800
          "
        >
          <RefreshCw
            className={`h-4 w-4 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />

          Refresh
        </button>
      </div>

      {/* SUMMARY CARDS */}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          className="
            rounded-xl border border-slate-200
            bg-white p-4 dark:border-slate-800
            dark:bg-slate-900
          "
        >
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Database className="h-4 w-4" />

            <span className="text-xs font-medium">
              Total Datasets
            </span>
          </div>

          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatNumber(datasets.length)}
          </div>
        </div>

        <div
          className="
            rounded-xl border border-slate-200
            bg-white p-4 dark:border-slate-800
            dark:bg-slate-900
          "
        >
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <CandlestickChart className="h-4 w-4" />

            <span className="text-xs font-medium">
              Total Candles
            </span>
          </div>

          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatNumber(totalCandles)}
          </div>
        </div>
      </div>

      {/* SEARCH */}

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama dataset, simbol, timeframe..."
            className="
              h-10 w-full rounded-lg
              border border-slate-200 bg-white
              pl-9 pr-3 text-sm text-slate-800
              outline-none transition-colors
              placeholder:text-slate-400
              focus:border-blue-500 focus:ring-2
              focus:ring-blue-500/10
              dark:border-slate-700 dark:bg-slate-900
              dark:text-slate-100
            "
          />
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div
          className="
            mb-4 flex items-start gap-3 rounded-lg
            border border-rose-200 bg-rose-50 p-3
            text-sm text-rose-700
            dark:border-rose-900 dark:bg-rose-950/40
            dark:text-rose-300
          "
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Gagal memuat dataset
            </p>

            <p className="mt-1">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadDatasets()}
              className="mt-2 font-semibold underline"
            >
              Coba lagi
            </button>
          </div>
        </div>
      )}

      {/* DATASET LIST */}

      <div
        className="
          min-h-0 flex-1 overflow-hidden
          rounded-xl border border-slate-200
          bg-white dark:border-slate-800
          dark:bg-slate-900
        "
      >
        <div
          className="
            flex items-center justify-between
            border-b border-slate-200 px-4 py-3
            dark:border-slate-800
          "
        >
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Daftar Dataset
          </h2>

          <span className="text-xs text-slate-500">
            {formatNumber(filteredDatasets.length)} dataset
          </span>
        </div>

        {isLoading ? (
          <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-slate-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Memuat dataset...
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
            <div className="mb-3 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
              <Database className="h-7 w-7 text-slate-400" />
            </div>

            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {search
                ? 'Dataset tidak ditemukan'
                : 'Belum ada dataset'}
            </p>

            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {search
                ? 'Coba gunakan kata kunci pencarian yang berbeda.'
                : 'Dataset yang berhasil diimpor akan muncul di halaman ini.'}
            </p>
          </div>
        ) : (
          <div className="max-h-full overflow-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700">
                  <th className="px-4 py-3">Dataset</th>
                  <th className="px-4 py-3">Timeframe</th>
                  <th className="px-4 py-3">Jumlah Candle</th>
                  <th className="px-4 py-3">Rentang Data</th>
                  <th className="px-4 py-3">Ukuran</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredDatasets.map((dataset) => (
                  <tr
                    key={dataset.id}
                    className="
                      border-b border-slate-100
                      transition-colors hover:bg-slate-50
                      dark:border-slate-800
                      dark:hover:bg-slate-800/50
                    "
                  >
                    {/* DATASET NAME */}

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950/40">
                          <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>

                        <div className="min-w-0">
                          <p className="max-w-64 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {dataset.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {dataset.symbol}
                            {dataset.sourceFormat
                              ? ` · ${dataset.sourceFormat}`
                              : ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* TIMEFRAME */}

                    <td className="px-4 py-3">
                      <span
                        className="
                          rounded-md bg-slate-100
                          px-2 py-1 font-mono text-xs
                          font-semibold text-slate-700
                          dark:bg-slate-800 dark:text-slate-200
                        "
                      >
                        {dataset.timeframe}
                      </span>
                    </td>

                    {/* CANDLE COUNT */}

                    <td className="px-4 py-3">
                      <span className="text-sm font-medium tabular-nums text-slate-700 dark:text-slate-200">
                        {formatNumber(dataset.candleCount || 0)}
                      </span>
                    </td>

                    {/* DATE RANGE */}

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />

                        <span>
                          {formatDate(dataset.startDate)}
                          {' — '}
                          {formatDate(dataset.endDate)}
                        </span>
                      </div>
                    </td>

                    {/* FILE SIZE */}

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <HardDrive className="h-3.5 w-3.5 text-slate-400" />

                        {formatFileSize(dataset.fileSize)}
                      </div>
                    </td>

                    {/* STATUS */}

                    <td className="px-4 py-3">
                      <span
                        className={`
                          inline-flex rounded-full
                          px-2 py-1 text-[10px]
                          font-semibold
                          ${
                            dataset.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : dataset.status === 'PROCESSING'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                : dataset.status === 'FAILED'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }
                        `}
                      >
                        {dataset.status || 'UNKNOWN'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

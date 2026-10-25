import React from 'react';
import { Plus, Trash2, ArrowUpDown, RotateCcw } from 'lucide-react';

import type {
  FibonacciPropertiesSettings,
  FibonacciPropertiesTab,
} from './FibonacciProperties.types.js';

import { FIBONACCI_TIMEFRAMES } from './FibonacciProperties.types.js';
import { INITIAL_DEFAULT_FIBONACCI_LEVELS } from './fibonacci.defaults.js';

interface FibonacciPropertiesTabsProps {
  activeTab: FibonacciPropertiesTab;
  settings: FibonacciPropertiesSettings;
  onTabChange: (tab: FibonacciPropertiesTab) => void;
  onChange: (settings: FibonacciPropertiesSettings) => void;
}

const tabs: { id: FibonacciPropertiesTab; label: string }[] = [
  { id: 'style', label: 'Style' },
  { id: 'coordinates', label: 'Coordinates' },
  { id: 'visibility', label: 'Visibility' },
];

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

const labelClass =
  'mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300';

const sectionClass =
  'rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50';

export const FibonacciPropertiesTabs: React.FC<
  FibonacciPropertiesTabsProps
> = ({
  activeTab,
  settings,
  onTabChange,
  onChange,
}) => {
  const update = (
    patch: Partial<FibonacciPropertiesSettings>,
  ) => {
    onChange({ ...settings, ...patch });
  };

  const updateLevel = (
    index: number,
    patch: Partial<FibonacciPropertiesSettings['levels'][number]>,
  ) => {
    update({
      levels: settings.levels.map((level, i) =>
        i === index ? { ...level, ...patch } : level,
      ),
    });
  };

  const updatePoint = (
    point: 'firstPoint' | 'secondPoint',
    patch: Partial<FibonacciPropertiesSettings['firstPoint']>,
  ) => {
    update({
      [point]: {
        ...settings[point],
        ...patch,
      },
    });
  };

  const addLevel = () => {
    // Generate next logical ratio
    const existingRatios = settings.levels.map((l) => l.ratio);
    let nextRatio = 0.5;
    if (existingRatios.length > 0) {
      const maxRatio = Math.max(...existingRatios);
      nextRatio = Math.round((maxRatio + 0.236) * 1000) / 1000;
    }

    update({
      levels: [
        ...settings.levels,
        {
          id: `fibo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ratio: nextRatio,
          label: String(nextRatio),
          color: settings.color || '#3b82f6',
          enabled: true,
          labelPosition: 'right',
        },
      ],
    });
  };

  const sortLevels = () => {
    const sorted = [...settings.levels].sort((a, b) => a.ratio - b.ratio);
    update({ levels: sorted });
  };

  const resetLevels = () => {
    update({
      levels: INITIAL_DEFAULT_FIBONACCI_LEVELS.map((level) => ({
        id: level.id || `fibo-${level.ratio}`,
        ratio: level.ratio,
        label: level.label ?? String(level.ratio),
        color: level.color,
        enabled: level.enabled ?? true,
        labelPosition: 'right',
      })),
    });
  };

  const removeLevel = (index: number) => {
    if (settings.levels.length <= 1) {
      return; // Keep at least one level
    }
    update({
      levels: settings.levels.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="flex flex-col">
      {/* Tabs navigation */}
      <div
        role="tablist"
        aria-label="Fibonacci properties"
        className="flex border-b border-slate-200 px-4 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/80 select-none"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            className={[
              'relative py-3 px-4 text-xs font-semibold transition-colors',
              activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabs content container */}
      <div className="max-h-[60vh] space-y-4 overflow-y-auto p-5">
        {activeTab === 'style' && (
          <>
            {/* General Trend Line & Extension Settings */}
            <section className={sectionClass}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Garis Tren &amp; Gaya Tampilan
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Warna Tren</label>
                  <div className="flex items-center gap-2">
                    <input
                      aria-label="Warna utama garis tren"
                      type="color"
                      value={settings.color}
                      onChange={(e) => update({ color: e.target.value })}
                      className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5 dark:border-slate-700"
                    />
                    <input
                      aria-label="Kode hex warna tren"
                      type="text"
                      value={settings.color}
                      onChange={(e) => update({ color: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Ketebalan Garis</label>
                  <select
                    value={settings.lineWidth}
                    onChange={(e) => update({ lineWidth: Number(e.target.value) })}
                    className={inputClass}
                  >
                    <option value={1}>1 px</option>
                    <option value={2}>2 px</option>
                    <option value={3}>3 px</option>
                    <option value={4}>4 px</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Pola Garis</label>
                  <select
                    value={settings.lineStyle}
                    onChange={(e) =>
                      update({
                        lineStyle: e.target.value as FibonacciPropertiesSettings['lineStyle'],
                      })
                    }
                    className={inputClass}
                  >
                    <option value="solid">Solid (Garis Lurus)</option>
                    <option value="dashed">Dashed (Putus-putus)</option>
                    <option value="dotted">Dotted (Titik-titik)</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.extendLeft}
                    onChange={(e) => update({ extendLeft: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                  />
                  Perpanjang garis ke kiri
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.extendRight}
                    onChange={(e) => update({ extendRight: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                  />
                  Perpanjang garis ke kanan
                </label>
              </div>
              
              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 dark:border-slate-800 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.showLabel}
                    onChange={(e) => update({ showLabel: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                  />
                  Tampilkan Label
                </label>

                <div>
                  <label className={labelClass}>Posisi Label</label>
                  <select
                    value={settings.labelPosition}
                    onChange={(e) =>
                      update({
                        labelPosition: e.target.value as 'left' | 'right',
                      })
                    }
                    disabled={!settings.showLabel}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <option value="right">Kanan</option>
                    <option value="left">Kiri</option>
                  </select>
                </div>
              </div>

            </section>

            {/* Fibonacci Levels Table */}
            <section className={sectionClass}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Level Fibonacci
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Atur nilai rasio, label kustom, warna, serta status aktif tiap level.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={sortLevels}
                    title="Urutkan rasio terkecil ke terbesar"
                    className="flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    <span>Urutkan</span>
                  </button>

                  <button
                    type="button"
                    onClick={resetLevels}
                    title="Kembalikan level ke konfigurasi awal"
                    className="flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset Level</span>
                  </button>

                  <button
                    type="button"
                    onClick={addLevel}
                    className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 shadow-sm transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Tambah Level</span>
                  </button>
                </div>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[32px_minmax(70px,1fr)_minmax(80px,1.2fr)_44px_32px] items-center gap-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <span className="text-center">Aktif</span>
                <span>Rasio</span>
                <span>Label</span>
                <span className="text-center">Warna</span>
              </div>

              {/* Level rows */}
              <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {settings.levels.map((level, index) => (
                  <div
                    key={level.id || `level-${index}`}
                    className="grid grid-cols-[32px_minmax(70px,1fr)_minmax(80px,1.2fr)_44px_32px] items-center gap-2 rounded-lg p-1 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    {/* Checkbox status aktif */}
                    <div className="flex justify-center">
                      <input
                        aria-label={`Aktifkan level rasio ${level.ratio}`}
                        type="checkbox"
                        checked={level.enabled}
                        onChange={(e) => updateLevel(index, { enabled: e.target.checked })}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>

                    {/* Nilai rasio */}
                    <div>
                      <input
                        aria-label={`Nilai rasio level ${index + 1}`}
                        type="number"
                        step="any"
                        value={level.ratio}
                        onChange={(e) => updateLevel(index, { ratio: Number(e.target.value) })}
                        placeholder="Rasio"
                        className={inputClass}
                      />
                    </div>

                    {/* Label kustom */}
                    <div>
                      <input
                        aria-label={`Label teks level ${index + 1}`}
                        type="text"
                        value={level.label !== undefined ? level.label : String(level.ratio)}
                        onChange={(e) => updateLevel(index, { label: e.target.value })}
                        placeholder={String(level.ratio)}
                        className={inputClass}
                      />
                    </div>

                    {/* Warna baris */}
                    <div className="flex justify-center">
                      <input
                        aria-label={`Warna garis level rasio ${level.ratio}`}
                        type="color"
                        value={level.color}
                        onChange={(e) => updateLevel(index, { color: e.target.value })}
                        className="h-7 w-8 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5 dark:border-slate-700"
                      />
                    </div>

                    {/* Tombol hapus */}
                    <div className="flex justify-center">
                      <button
                        type="button"
                        aria-label={`Hapus level ${level.ratio}`}
                        title="Hapus level ini"
                        onClick={() => removeLevel(index)}
                        disabled={settings.levels.length <= 1}
                        className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Display options */}
            <section className={sectionClass}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pilihan Label &amp; Latar Belakang
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.showRatio}
                    onChange={(e) => update({ showRatio: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                  />
                  Tampilkan rasio level
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.showPrice}
                    onChange={(e) => update({ showPrice: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                  />
                  Tampilkan harga level
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.showBackground}
                    onChange={(e) => update({ showBackground: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                  />
                  Latar transparan (Bands)
                </label>
              </div>
            </section>
          </>
        )}

        {activeTab === 'coordinates' && (
          <section className={sectionClass}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Koordinat Titik Anchor
            </h3>

            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              Ubah harga atau waktu dari kedua titik anchor utama Fibonacci Retracement secara presisi.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                ['firstPoint', 'Titik Anchor Awal (0%)'],
                ['secondPoint', 'Titik Anchor Akhir (100%)'],
              ] as const).map(([point, title]) => (
                <div
                  key={point}
                  className="rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <h4 className="mb-3 text-xs font-bold text-slate-800 dark:text-slate-200">
                    {title}
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Level Harga</label>
                      <input
                        type="number"
                        step="any"
                        value={settings[point].price}
                        onChange={(e) =>
                          updatePoint(point, {
                            price: Number(e.target.value),
                          })
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Timestamp Candle (Unix epoch detik)
                      </label>
                      <input
                        type="number"
                        value={settings[point].time ?? ''}
                        onChange={(e) =>
                          updatePoint(point, {
                            time:
                              e.target.value === ''
                                ? undefined
                                : Number(e.target.value),
                          })
                        }
                        className={inputClass}
                        placeholder="Opsional"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'visibility' && (
          <section className={sectionClass}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Visibilitas Timeframe
            </h3>

            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              Tentukan pada timeframe apa saja objek Fibonacci ini akan ditampilkan pada chart.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {FIBONACCI_TIMEFRAMES.map((timeframe) => {
                const checked = settings.visibleTimeframes.includes(timeframe);

                return (
                  <label
                    key={timeframe}
                    className={[
                      'flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors',
                      checked
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-950/50 dark:text-blue-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...settings.visibleTimeframes, timeframe]
                          : settings.visibleTimeframes.filter((item) => item !== timeframe);

                        update({ visibleTimeframes: next });
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                    />
                    {timeframe}
                  </label>
                );
              })}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => update({ visibleTimeframes: [...FIBONACCI_TIMEFRAMES] })}
                className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                Pilih Semua
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                type="button"
                onClick={() => update({ visibleTimeframes: [] })}
                className="text-xs font-semibold text-slate-500 hover:underline dark:text-slate-400"
              >
                Hapus Semua
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default FibonacciPropertiesTabs;

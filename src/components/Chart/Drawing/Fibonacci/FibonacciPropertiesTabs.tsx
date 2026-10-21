
import React from 'react';

import type {
  FibonacciPropertiesSettings,
  FibonacciPropertiesTab,
} from './FibonacciProperties.types.js';

import { FIBONACCI_TIMEFRAMES } from './FibonacciProperties.types.js';
import { DEFAULT_FIBONACCI_LEVELS } from './fibonacci.defaults.js';

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
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';

const labelClass =
  'mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300';

const sectionClass =
  'rounded-lg border border-gray-200 p-3 dark:border-gray-700';

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
    update({
      levels: [
        ...settings.levels,
        {
          id: `fibo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ratio: 1.272,
          color: settings.color,
          enabled: true,
        },
      ],
    });
  };

  const resetLevels = () => {
    update({
      levels: DEFAULT_FIBONACCI_LEVELS.map((level) => ({
        id: level.id || `fibo-${level.ratio}`,
        ratio: level.ratio,
        color: level.color,
        enabled: level.enabled ?? true,
      })),
    });
  };

  const removeLevel = (index: number) => {
    update({
      levels: settings.levels.filter((_, i) => i !== index),
    });
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Fibonacci properties"
        className="flex gap-1 border-b border-gray-200 dark:border-gray-700"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            className={[
              'border-b-2 px-3 py-3 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-h-[55vh] space-y-4 overflow-y-auto p-4">
        {activeTab === 'style' && (
          <>
            <section className={sectionClass}>
              <h3 className="mb-3 text-sm font-semibold">
                General
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>
                    Warna utama
                  </label>
                  <div className="flex gap-2">
                    <input
                      aria-label="Warna utama Fibonacci"
                      type="color"
                      value={settings.color}
                      onChange={(event) =>
                        update({ color: event.target.value })
                      }
                      className="h-10 w-12 cursor-pointer rounded border border-gray-300 bg-transparent p-1 dark:border-gray-700"
                    />
                    <input
                      aria-label="Kode warna utama"
                      type="text"
                      value={settings.color}
                      onChange={(event) =>
                        update({ color: event.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Ketebalan garis
                  </label>
                  <select
                    value={settings.lineWidth}
                    onChange={(event) =>
                      update({
                        lineWidth: Number(event.target.value),
                      })
                    }
                    className={inputClass}
                  >
                    <option value={1}>1 px</option>
                    <option value={2}>2 px</option>
                    <option value={3}>3 px</option>
                    <option value={4}>4 px</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className={labelClass}>
                    Pola garis
                  </label>
                  <select
                    value={settings.lineStyle}
                    onChange={(event) =>
                      update({
                        lineStyle: event.target.value as
                          FibonacciPropertiesSettings['lineStyle'],
                      })
                    }
                    className={inputClass}
                  >
                    <option value="solid">Solid — utuh</option>
                    <option value="dashed">Dashed — putus-putus</option>
                    <option value="dotted">Dotted — titik-titik</option>
                  </select>
                </div>
              </div>
            </section>

            <section className={sectionClass}>
              <h3 className="mb-3 text-sm font-semibold">
                Line extension
              </h3>

              <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.extendLeft}
                  onChange={(event) =>
                    update({ extendLeft: event.target.checked })
                  }
                  className="accent-blue-500"
                />
                Perpanjang garis ke kiri
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.extendRight}
                  onChange={(event) =>
                    update({ extendRight: event.target.checked })
                  }
                  className="accent-blue-500"
                />
                Perpanjang garis ke kanan
              </label>
            </section>

            <section className={sectionClass}>
              <h3 className="mb-3 text-sm font-semibold">
                Label
              </h3>

              {([
                ['showRatio', 'Tampilkan rasio level'],
                ['showPrice', 'Tampilkan harga'],
                ['showBackground', 'Tampilkan latar label'],
              ] as const).map(([key, label]) => (
                <label
                  key={key}
                  className="mb-3 flex cursor-pointer items-center gap-2 text-sm last:mb-0"
                >
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={(event) =>
                      update({ [key]: event.target.checked })
                    }
                    className="accent-blue-500"
                  />
                  {label}
                </label>
              ))}
            </section>

            <section className={sectionClass}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  Fibonacci levels
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetLevels}
                    className="rounded-md border border-gray-300 dark:border-gray-700 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Reset Default
                  </button>
                  <button
                    type="button"
                    onClick={addLevel}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    + Tambah level
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {settings.levels.map((level, index) => (
                  <div
                    key={level.id || `level-${index}`}
                    className="grid grid-cols-[24px_minmax(0,1fr)_64px_32px] items-center gap-2"
                  >
                    <input
                      aria-label={`Aktifkan level ${index + 1}`}
                      type="checkbox"
                      checked={level.enabled}
                      onChange={(event) =>
                        updateLevel(index, {
                          enabled: event.target.checked,
                        })
                      }
                      className="accent-blue-500"
                    />

                    <input
                      aria-label={`Rasio level ${index + 1}`}
                      type="number"
                      step="any"
                      value={level.ratio}
                      onChange={(event) =>
                        updateLevel(index, {
                          ratio: Number(event.target.value),
                        })
                      }
                      className={inputClass}
                    />

                    <input
                      aria-label={`Warna level ${index + 1}`}
                      type="color"
                      value={level.color}
                      onChange={(event) =>
                        updateLevel(index, {
                          color: event.target.value,
                        })
                      }
                      className="h-10 w-full cursor-pointer rounded border border-gray-300 bg-transparent p-1 dark:border-gray-700"
                    />

                    <button
                      type="button"
                      aria-label={`Hapus level ${index + 1}`}
                      title="Hapus level"
                      onClick={() => removeLevel(index)}
                      className="rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Rasio 0.618 berarti 61.8%. Rasio di atas 1
                atau di bawah 0 dapat digunakan untuk level
                extension.
              </p>
            </section>
          </>
        )}

        {activeTab === 'coordinates' && (
          <section className={sectionClass}>
            <h3 className="mb-3 text-sm font-semibold">
              Anchor coordinates
            </h3>

            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              Ubah harga titik awal atau akhir. Perubahan
              waktu memerlukan integrasi dengan format waktu
              candle yang digunakan chart.
            </p>

            {([
              ['firstPoint', 'Titik pertama'],
              ['secondPoint', 'Titik kedua'],
            ] as const).map(([point, title]) => (
              <div
                key={point}
                className="mb-4 last:mb-0"
              >
                <h4 className="mb-2 text-sm font-medium">
                  {title}
                </h4>

                <label className={labelClass}>
                  Harga
                </label>
                <input
                  type="number"
                  step="any"
                  value={settings[point].price}
                  onChange={(event) =>
                    updatePoint(point, {
                      price: Number(event.target.value),
                    })
                  }
                  className={inputClass}
                />

                <label className={`${labelClass} mt-3`}>
                  Waktu candle (Unix timestamp)
                </label>
                <input
                  type="number"
                  value={settings[point].time ?? ''}
                  onChange={(event) =>
                    updatePoint(point, {
                      time:
                        event.target.value === ''
                          ? undefined
                          : Number(event.target.value),
                    })
                  }
                  className={inputClass}
                  placeholder="Opsional"
                />
              </div>
            ))}
          </section>
        )}

        {activeTab === 'visibility' && (
          <section className={sectionClass}>
            <h3 className="mb-2 text-sm font-semibold">
              Timeframe visibility
            </h3>

            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              Pilih timeframe tempat Fibonacci boleh
              ditampilkan. Filter ini baru efektif setelah
              dihubungkan ke renderer chart.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {FIBONACCI_TIMEFRAMES.map((timeframe) => {
                const checked =
                  settings.visibleTimeframes.includes(timeframe);

                return (
                  <label
                    key={timeframe}
                    className={[
                      'flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm',
                      checked
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 dark:border-gray-700',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...settings.visibleTimeframes, timeframe]
                          : settings.visibleTimeframes.filter(
                              (item) => item !== timeframe,
                            );

                        update({ visibleTimeframes: next });
                      }}
                      className="accent-blue-500"
                    />
                    {timeframe}
                  </label>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() =>
                update({
                  visibleTimeframes: [...FIBONACCI_TIMEFRAMES],
                })
              }
              className="mt-3 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Pilih semua timeframe
            </button>
          </section>
        )}
      </div>
    </div>
  );
};

export default FibonacciPropertiesTabs;

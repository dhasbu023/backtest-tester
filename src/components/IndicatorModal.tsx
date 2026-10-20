import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Sliders,
  Check,
} from 'lucide-react';

import type {
  IndicatorConfig,
  IndicatorType,
} from '../types/index.js';

interface IndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicators: IndicatorConfig[];
  onUpdateIndicators: (indicators: IndicatorConfig[]) => void;
}

const PRESET_COLORS = [
  '#3b82f6',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#e2e8f0',
];

function createIndicatorId(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return `ind-${globalThis.crypto.randomUUID()}`;
  }

  return `ind-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export const IndicatorModal: React.FC<IndicatorModalProps> = ({
  isOpen,
  onClose,
  indicators,
  onUpdateIndicators,
}) => {
  const [activeTab, setActiveTab] = useState<'MANAGE' | 'ADD'>(
    'MANAGE'
  );

  const [selectedType, setSelectedType] =
    useState<IndicatorType>('EMA');

  const [period, setPeriod] = useState<number>(9);
  const [color, setColor] = useState<string>('#3b82f6');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [stdDev, setStdDev] = useState<number>(2);

  if (!isOpen) {
    return null;
  }

  // Selalu gunakan daftar yang diterima dari parent.
  // Tidak menambahkan indikator default secara otomatis.
  const currentIndicators = Array.isArray(indicators)
    ? indicators
    : [];

  // Sembunyikan atau tampilkan indikator.
  const handleToggleVisible = (id: string) => {
    onUpdateIndicators(
      currentIndicators.map((indicator) =>
        indicator.id === id
          ? {
              ...indicator,
              visible: !indicator.visible,
            }
          : indicator
      )
    );
  };

  // Hapus indikator dari konfigurasi.
  // Tidak menyisakan indikator tersembunyi.
  const handleDelete = (id: string) => {
    const updatedIndicators = currentIndicators.filter(
      (indicator) => indicator.id !== id
    );

    onUpdateIndicators(updatedIndicators);
  };

  // Tambahkan indikator hanya ketika pengguna menekan tombol.
  const handleAddIndicator = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const validPeriod = Math.max(
      1,
      Math.min(500, Number(period) || 9)
    );

    const pane =
      selectedType === 'RSI' || selectedType === 'ATR'
        ? 'sub'
        : 'main';

    let name = `${selectedType} ${validPeriod}`;

    if (selectedType === 'BOLLINGER') {
      name = `BB (${validPeriod}, ${stdDev})`;
    }

    const newIndicator: IndicatorConfig = {
      id: createIndicatorId(),
      type: selectedType,
      name,
      visible: true,
      period: validPeriod,
      color,
      strokeWidth,
      stdDev:
        selectedType === 'BOLLINGER'
          ? stdDev
          : undefined,
      upperColor:
        selectedType === 'BOLLINGER'
          ? color
          : undefined,
      lowerColor:
        selectedType === 'BOLLINGER'
          ? color
          : undefined,
      fillColor:
        selectedType === 'BOLLINGER'
          ? 'rgba(59, 130, 246, 0.08)'
          : undefined,
      levels:
        selectedType === 'RSI'
          ? [30, 50, 70]
          : undefined,
      pane,
    };

    onUpdateIndicators([
      ...currentIndicators,
      newIndicator,
    ]);

    setActiveTab('MANAGE');
  };

  const handleApplyPreset = (
    type: IndicatorType,
    defaultPeriod: number,
    defaultColor: string
  ) => {
    setSelectedType(type);
    setPeriod(defaultPeriod);
    setColor(defaultColor);
  };

  const handleSelectType = (type: IndicatorType) => {
    setSelectedType(type);

    if (type === 'EMA') {
      setPeriod(9);
    } else if (type === 'SMA') {
      setPeriod(50);
    } else if (type === 'RSI' || type === 'ATR') {
      setPeriod(14);
    } else if (type === 'BOLLINGER') {
      setPeriod(20);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal title */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />

            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Kelola Indikator Teknikal
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal indikator"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-3 gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('MANAGE')}
            className={`pb-2.5 transition-colors relative cursor-pointer ${
              activeTab === 'MANAGE'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span>
              Daftar Indikator ({currentIndicators.length})
            </span>

            {activeTab === 'MANAGE' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ADD')}
            className={`pb-2.5 flex items-center gap-1.5 transition-colors relative cursor-pointer ${
              activeTab === 'ADD'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Indikator</span>

            {activeTab === 'ADD' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Modal body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'MANAGE' ? (
            <div className="space-y-2">
              {currentIndicators.length === 0 ? (
                <div className="text-center py-8 text-slate-400 border border-dashed rounded-lg border-slate-200 dark:border-slate-800 space-y-3">
                  <Sliders className="w-8 h-8 mx-auto opacity-40" />

                  <div>
                    <p className="font-semibold">
                      Belum ada indikator.
                    </p>

                    <p className="mt-1">
                      Chart tidak akan menampilkan indikator
                      sampai kamu menambahkannya.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('ADD')}
                    className="px-3 py-1.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 cursor-pointer"
                  >
                    Tambah Indikator Pertama
                  </button>
                </div>
              ) : (
                currentIndicators.map((indicator) => (
                  <div
                    key={indicator.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                        style={{
                          backgroundColor: indicator.color,
                        }}
                      />

                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white block break-words">
                          {indicator.name}
                        </span>

                        <span className="text-[10px] text-slate-400">
                          {indicator.pane === 'sub'
                            ? 'Sub-Pane Terpisah'
                            : 'Overlay Chart'}{' '}
                          • {indicator.strokeWidth}px
                        </span>

                        {!indicator.visible && (
                          <span className="block text-[10px] text-amber-600 dark:text-amber-400">
                            Sedang disembunyikan
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleVisible(indicator.id)
                        }
                        className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                        title={
                          indicator.visible
                            ? 'Sembunyikan'
                            : 'Tampilkan'
                        }
                        aria-label={
                          indicator.visible
                            ? `Sembunyikan ${indicator.name}`
                            : `Tampilkan ${indicator.name}`
                        }
                      >
                        {indicator.visible ? (
                          <Eye className="w-4 h-4 text-blue-500" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(indicator.id)
                        }
                        className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Hapus indikator"
                        aria-label={`Hapus ${indicator.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <form
              onSubmit={handleAddIndicator}
              className="space-y-4"
            >
              {/* Indicator type */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Indikator
                </label>

                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      'EMA',
                      'SMA',
                      'BOLLINGER',
                      'RSI',
                      'ATR',
                    ] as IndicatorType[]
                  ).map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() =>
                        handleSelectType(type)
                      }
                      className={`py-1.5 px-2 rounded-lg font-bold text-center border transition-all cursor-pointer ${
                        selectedType === type
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick presets */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Preset Cepat
                </label>

                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPreset(
                        'EMA',
                        9,
                        '#3b82f6'
                      )
                    }
                    className="px-2 py-1 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                  >
                    EMA 9
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPreset(
                        'EMA',
                        21,
                        '#f59e0b'
                      )
                    }
                    className="px-2 py-1 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                  >
                    EMA 21
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPreset(
                        'EMA',
                        200,
                        '#ef4444'
                      )
                    }
                    className="px-2 py-1 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                  >
                    EMA 200
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPreset(
                        'SMA',
                        50,
                        '#10b981'
                      )
                    }
                    className="px-2 py-1 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                  >
                    SMA 50
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPreset(
                        'RSI',
                        14,
                        '#8b5cf6'
                      )
                    }
                    className="px-2 py-1 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                  >
                    RSI 14
                  </button>
                </div>
              </div>

              {/* Parameters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Periode Candle
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={period}
                    onChange={(event) =>
                      setPeriod(
                        Math.max(
                          1,
                          Math.min(
                            500,
                            parseInt(
                              event.target.value,
                              10
                            ) || 1
                          )
                        )
                      )
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>

                {selectedType === 'BOLLINGER' ? (
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      StdDev Multiplier
                    </label>

                    <input
                      type="number"
                      step={0.1}
                      min={0.5}
                      max={5}
                      value={stdDev}
                      onChange={(event) =>
                        setStdDev(
                          Math.max(
                            0.5,
                            Math.min(
                              5,
                              parseFloat(
                                event.target.value
                              ) || 2
                            )
                          )
                        )
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Ketebalan Garis
                    </label>

                    <select
                      value={strokeWidth}
                      onChange={(event) =>
                        setStrokeWidth(
                          parseInt(
                            event.target.value,
                            10
                          )
                        )
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    >
                      <option value={1}>
                        1 px (Halus)
                      </option>
                      <option value={2}>
                        2 px (Standar)
                      </option>
                      <option value={3}>
                        3 px (Tebal)
                      </option>
                    </select>
                  </div>
                )}
              </div>

              {/* Color selector */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Pilihan Warna
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((presetColor) => (
                    <button
                      type="button"
                      key={presetColor}
                      onClick={() =>
                        setColor(presetColor)
                      }
                      className={`w-6 h-6 rounded-full border transition-transform cursor-pointer flex items-center justify-center ${
                        color === presetColor
                          ? 'scale-110 border-blue-500 shadow-sm'
                          : 'border-black/10'
                      }`}
                      style={{
                        backgroundColor: presetColor,
                      }}
                      title={presetColor}
                      aria-label={`Pilih warna ${presetColor}`}
                    >
                      {color === presetColor && (
                        <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                      )}
                    </button>
                  ))}

                  <input
                    type="color"
                    value={color}
                    onChange={(event) =>
                      setColor(event.target.value)
                    }
                    className="w-7 h-7 rounded-md cursor-pointer border-0 bg-transparent ml-1"
                    title="Pilih warna bebas"
                    aria-label="Pilih warna indikator"
                  />
                </div>
              </div>

              {/* Form actions */}
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setActiveTab('MANAGE')
                  }
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Tambahkan Indikator
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};

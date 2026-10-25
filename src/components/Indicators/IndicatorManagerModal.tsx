
import React, { useMemo, useState } from 'react';
import {
  Activity,
  Check,
  Sliders,
  X,
} from 'lucide-react';

import type {
  IndicatorConfig,
  IndicatorType,
} from '../../types/index.js';

import IndicatorSearch from './IndicatorSearch';
import IndicatorTabs, {
  type IndicatorTab,
} from './IndicatorTabs';

import IndicatorList, {
  type IndicatorCatalogItem,
} from './IndicatorList';

import IndicatorPropertiesModal, {
  type IndicatorProperties,
} from './IndicatorPropertiesModal';

interface IndicatorManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicators: IndicatorConfig[];
  onUpdateIndicators: (indicators: IndicatorConfig[]) => void;
}

const CATALOG: IndicatorCatalogItem[] = [
  {
    id: 'EMA',
    name: 'EMA',
    description: 'Exponential Moving Average',
    category: 'Trend',
    favorite: false,
  },
  {
    id: 'SMA',
    name: 'SMA',
    description: 'Simple Moving Average',
    category: 'Trend',
    favorite: false,
  },
  {
    id: 'BOLLINGER',
    name: 'Bollinger Bands',
    description: 'Mengukur volatilitas dan rentang harga',
    category: 'Volatilitas',
    favorite: false,
  },
  {
    id: 'RSI',
    name: 'RSI',
    description: 'Relative Strength Index',
    category: 'Momentum',
    favorite: false,
  },
  {
    id: 'ATR',
    name: 'ATR',
    description: 'Average True Range',
    category: 'Volatilitas',
    favorite: false,
  },
];

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

function getDefaultPeriod(type: IndicatorType): number {
  switch (type) {
    case 'EMA':
      return 9;
    case 'SMA':
      return 50;
    case 'BOLLINGER':
      return 20;
    case 'RSI':
    case 'ATR':
      return 14;
    default:
      return 14;
  }
}

function getDefaultColor(type: IndicatorType): string {
  switch (type) {
    case 'EMA':
      return '#3b82f6';
    case 'SMA':
      return '#10b981';
    case 'BOLLINGER':
      return '#f59e0b';
    case 'RSI':
      return '#8b5cf6';
    case 'ATR':
      return '#06b6d4';
    default:
      return '#3b82f6';
  }
}

const IndicatorManagerModal: React.FC<
  IndicatorManagerModalProps
> = ({
  isOpen,
  onClose,
  indicators,
  onUpdateIndicators,
}) => {
  const [activeTab, setActiveTab] =
    useState<IndicatorTab>('ALL');

  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  const [selectedType, setSelectedType] =
    useState<IndicatorType | null>(null);

  const [propertiesTargetId, setPropertiesTargetId] =
    useState<string | null>(null);

  const [period, setPeriod] = useState(9);
  const [color, setColor] = useState('#3b82f6');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [stdDev, setStdDev] = useState(2);

  const currentIndicators = Array.isArray(indicators)
    ? indicators
    : [];

  const catalog = useMemo(
    () =>
      CATALOG.map((item) => ({
        ...item,
        favorite: favorites.includes(item.id),
      })),
    [favorites]
  );

  const catalogWithAddStatus = catalog;

  const favoriteCount = catalog.filter(
    (item) => item.favorite
  ).length;

  const propertiesTarget = currentIndicators.find(
    (item) => item.id === propertiesTargetId
  );

  if (!isOpen) return null;

  const handleToggleFavorite = (id: string) => {
    setFavorites((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const handleAddIndicator = (id: string) => {
    const type = id as IndicatorType;

    setSelectedType(type);
    setPeriod(getDefaultPeriod(type));
    setColor(getDefaultColor(type));
    setStrokeWidth(2);
    setStdDev(2);
  };

  const handleConfirmAdd = () => {
    if (!selectedType) return;

    const validPeriod = Math.max(
      1,
      Math.min(500, Number(period) || 1)
    );

    const newIndicator: IndicatorConfig = {
      id: createIndicatorId(),
      type: selectedType,
      name:
        selectedType === 'BOLLINGER'
          ? `BB (${validPeriod}, ${stdDev})`
          : `${selectedType} ${validPeriod}`,
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
      pane:
        selectedType === 'RSI' || selectedType === 'ATR'
          ? 'sub'
          : 'main',
    };

    onUpdateIndicators([
      ...currentIndicators,
      newIndicator,
    ]);

    setSelectedType(null);
  };

  const handleToggleVisible = (id: string) => {
    onUpdateIndicators(
      currentIndicators.map((indicator) =>
        indicator.id === id
          ? { ...indicator, visible: !indicator.visible }
          : indicator
      )
    );
  };

  const handleDelete = (id: string) => {
    onUpdateIndicators(
      currentIndicators.filter(
        (indicator) => indicator.id !== id
      )
    );
  };

  const handleSaveProperties = (
    values: IndicatorProperties
  ) => {
    if (!propertiesTarget) return;

    onUpdateIndicators(
      currentIndicators.map((indicator) => {
        if (indicator.id !== propertiesTarget.id) {
          return indicator;
        }

        return {
          ...indicator,
          period: values.period,
          color: values.color,
          strokeWidth: values.strokeWidth,
          stdDev:
            indicator.type === 'BOLLINGER'
              ? values.stdDev
              : indicator.stdDev,
          name:
            indicator.type === 'BOLLINGER'
              ? `BB (${values.period}, ${values.stdDev})`
              : `${indicator.type} ${values.period}`,
        };
      })
    );

    setPropertiesTargetId(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
        <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders
                size={18}
                className="text-blue-600 dark:text-blue-400"
              />

              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Indikator Teknikal
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Cari, tambahkan, dan kelola indikator chart.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup modal"
              className="rounded-md p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>
          </header>

          <div className="space-y-4 border-b border-slate-200 p-4 dark:border-slate-800">
            <IndicatorSearch
              value={searchQuery}
              onChange={setSearchQuery}
            />

            <IndicatorTabs
              activeTab={activeTab}
              onChange={setActiveTab}
              allCount={catalog.length}
              favoritesCount={favoriteCount}
            />
          </div>

          <main className="flex-1 space-y-5 overflow-y-auto p-4">
            <section>
              <h3 className="mb-3 text-xs font-semibold text-slate-500">
                KATALOG INDIKATOR
              </h3>

           <IndicatorList
            indicators={catalogWithAddStatus}
            searchQuery={searchQuery}
            activeTab={activeTab}
            onToggleFavorite={handleToggleFavorite}
            onAdd={handleAddIndicator}
            addedIndicatorIds={[]}
          />
            </section>

            <section>
              <h3 className="mb-3 text-xs font-semibold text-slate-500">
                INDIKATOR PADA CHART ({currentIndicators.length})
              </h3>

              {currentIndicators.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500 dark:border-slate-700">
                  Belum ada indikator yang ditambahkan.
                </div>
              ) : (
                <div className="space-y-2">
                  {currentIndicators.map((indicator) => (
                    <div
                      key={indicator.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: indicator.color,
                        }}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold text-slate-900 dark:text-white">
                          {indicator.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {indicator.pane === 'sub'
                            ? 'Panel bawah'
                            : 'Pada chart utama'}
                          {' · '}
                          {indicator.strokeWidth}px
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleToggleVisible(indicator.id)
                        }
                        title={
                          indicator.visible
                            ? 'Sembunyikan'
                            : 'Tampilkan'
                        }
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        {indicator.visible ? (
                          <EyeIconFallback visible />
                        ) : (
                          <EyeIconFallback visible={false} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPropertiesTargetId(indicator.id)
                        }
                        title="Pengaturan"
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Sliders size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(indicator.id)
                        }
                        title="Hapus indikator"
                        className="rounded-md p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>

          <footer className="flex justify-end border-t border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Selesai
            </button>
          </footer>
        </div>
      </div>

      {selectedType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleConfirmAdd();
            }}
            className="w-full max-w-sm space-y-4 rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tambahkan {selectedType}
              </h3>

              <button
                type="button"
                onClick={() => setSelectedType(null)}
                aria-label="Batal menambahkan"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={17} />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                Periode candle
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={period}
                onChange={(event) =>
                  setPeriod(Number(event.target.value))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {selectedType === 'BOLLINGER' && (
              <div>
                <label className="mb-1 block text-xs font-medium">
                  StdDev Multiplier
                </label>
                <input
                  type="number"
                  min={0.5}
                  max={5}
                  step={0.1}
                  value={stdDev}
                  onChange={(event) =>
                    setStdDev(Number(event.target.value))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium">
                Ketebalan garis
              </label>
              <select
                value={strokeWidth}
                onChange={(event) =>
                  setStrokeWidth(Number(event.target.value))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value={1}>1 px</option>
                <option value={2}>2 px</option>
                <option value={3}>3 px</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium">
                Warna indikator
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setColor(preset)}
                    aria-label={`Pilih warna ${preset}`}
                    className={`h-6 w-6 rounded-full border ${
                      color === preset
                        ? 'ring-2 ring-blue-500 ring-offset-2'
                        : 'border-black/10'
                    }`}
                    style={{ backgroundColor: preset }}
                  />
                ))}

                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  aria-label="Warna kustom"
                  className="h-7 w-8 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                className="rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Batal
              </button>

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Tambahkan
              </button>
            </div>
          </form>
        </div>
      )}

      {propertiesTarget && (
        <IndicatorPropertiesModal
          isOpen
          indicatorName={propertiesTarget.name}
          initialValues={{
            period: propertiesTarget.period || 14,
            color: propertiesTarget.color || '#3b82f6',
            strokeWidth: propertiesTarget.strokeWidth || 2,
            stdDev: propertiesTarget.stdDev || 2,
          }}
          showStdDev={propertiesTarget.type === 'BOLLINGER'}
          onClose={() => setPropertiesTargetId(null)}
          onSave={handleSaveProperties}
        />
      )}
    </>
  );
};

const EyeIconFallback: React.FC<{ visible: boolean }> = ({
  visible,
}) => {
  return visible ? (
    <Activity size={16} />
  ) : (
    <span className="text-xs">Off</span>
  );
};

export default IndicatorManagerModal;

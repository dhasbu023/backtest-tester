import React, { useEffect, useState } from 'react';
import { RotateCcw, BookmarkCheck } from 'lucide-react';

import type {
  FibonacciPropertiesModalProps,
  FibonacciPropertiesSettings,
  FibonacciPropertiesTab,
} from './FibonacciProperties.types.js';

import {
  getSystemDefaultFibonacciSettings,
  saveFibonacciDefaults,
} from './fibonacci.defaults.js';

import FibonacciPropertiesTabs from './FibonacciPropertiesTabs.js';

const cloneSettings = (
  settings: FibonacciPropertiesSettings,
): FibonacciPropertiesSettings => ({
  ...settings,
  levels: settings.levels.map((level) => ({
    ...level,
    label: level.label !== undefined ? level.label : String(level.ratio),
  })),
  firstPoint: { ...settings.firstPoint },
  secondPoint: { ...settings.secondPoint },
  visibleTimeframes: [...settings.visibleTimeframes],
});

export const FibonacciPropertiesModal: React.FC<
  FibonacciPropertiesModalProps
> = ({
  open,
  title = 'Fibonacci Retracement Properties',
  initialSettings,
  onClose,
  onApply,
  onSaveAsDefault,
}) => {
  const [activeTab, setActiveTab] =
    useState<FibonacciPropertiesTab>('style');

  const [settings, setSettings] =
    useState<FibonacciPropertiesSettings>(
      () => cloneSettings(initialSettings),
    );

  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    if (open) {
      setSettings(cloneSettings(initialSettings));
      setActiveTab('style');
      setSavedFeedback(false);
    }
  }, [open, initialSettings]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const validateSettings = (): FibonacciPropertiesSettings | null => {
    const validSettings = cloneSettings(settings);

    if (!validSettings.color.trim()) {
      return null;
    }

    if (
      !Number.isFinite(validSettings.lineWidth) ||
      validSettings.lineWidth < 1
    ) {
      return null;
    }

    const validLevels = validSettings.levels.every(
      (level) =>
        Number.isFinite(level.ratio) &&
        Boolean(level.color && level.color.trim()),
    );

    if (!validLevels) {
      window.alert('Periksa kembali rasio dan warna level Fibonacci.');
      return null;
    }

    if (
      !Number.isFinite(validSettings.firstPoint.price) ||
      !Number.isFinite(validSettings.secondPoint.price)
    ) {
      window.alert('Harga anchor Fibonacci tidak valid.');
      return null;
    }

    return validSettings;
  };

  const handleApply = () => {
    const validSettings = validateSettings();
    if (!validSettings) return;

    // Simpan pengaturan ini sebagai default untuk pembuatan berikutnya
    saveFibonacciDefaults(validSettings);
    onSaveAsDefault?.(validSettings);

    onApply(validSettings);
  };

  const handleResetToDefault = () => {
    // Kembalikan ke default awal sistem aplikasi, tetap mempertahankan harga titik anchor saat ini
    const systemDefaults = getSystemDefaultFibonacciSettings(
      settings.color,
      settings.firstPoint.price,
      settings.secondPoint.price,
    );

    // Salin time koordinat jika ada
    systemDefaults.firstPoint.time = settings.firstPoint.time;
    systemDefaults.secondPoint.time = settings.secondPoint.time;

    setSettings(systemDefaults);
  };

  const handleSaveAsDefaultClick = () => {
    const validSettings = validateSettings();
    if (!validSettings) return;

    saveFibonacciDefaults(validSettings);
    onSaveAsDefault?.(validSettings);

    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
    }, 2500);
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="fibonacci-properties-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h2
              id="fibonacci-properties-title"
              className="truncate text-base font-bold text-slate-800 dark:text-slate-100"
            >
              {title}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Pengaturan garis, rasio, label, koordinat, dan visibilitas timeframe.
            </p>
          </div>

          <button
            type="button"
            aria-label="Tutup properties"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            ×
          </button>
        </header>

        {/* Modal body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <FibonacciPropertiesTabs
            activeTab={activeTab}
            settings={settings}
            onTabChange={setActiveTab}
            onChange={setSettings}
          />
        </div>

        {/* Modal footer */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              title="Kembalikan semua pengaturan ke default awal aplikasi"
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to Default</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAsDefaultClick}
              title="Simpan pengaturan saat ini sebagai default baru untuk Fibonacci berikutnya"
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              <BookmarkCheck className={`h-3.5 w-3.5 ${savedFeedback ? 'text-emerald-500' : ''}`} />
              <span>{savedFeedback ? 'Tersimpan!' : 'Simpan Default'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="rounded-lg bg-blue-600 px-5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Terapkan
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default FibonacciPropertiesModal;

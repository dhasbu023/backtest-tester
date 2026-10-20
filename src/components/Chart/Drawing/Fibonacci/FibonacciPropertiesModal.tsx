
import React, { useEffect, useState } from 'react';

import type {
  FibonacciPropertiesModalProps,
  FibonacciPropertiesSettings,
  FibonacciPropertiesTab,
} from './FibonacciProperties.types.js';

import FibonacciPropertiesTabs from './FibonacciPropertiesTabs.js';

const cloneSettings = (
  settings: FibonacciPropertiesSettings,
): FibonacciPropertiesSettings => ({
  ...settings,
  levels: settings.levels.map((level) => ({ ...level })),
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
}) => {
  const [activeTab, setActiveTab] =
    useState<FibonacciPropertiesTab>('style');

  const [settings, setSettings] =
    useState<FibonacciPropertiesSettings>(
      () => cloneSettings(initialSettings),
    );

  useEffect(() => {
    if (open) {
      setSettings(cloneSettings(initialSettings));
      setActiveTab('style');
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

  const handleApply = () => {
    const validSettings = cloneSettings(settings);

    if (!validSettings.color.trim()) {
      return;
    }

    if (
      !Number.isFinite(validSettings.lineWidth) ||
      validSettings.lineWidth < 1
    ) {
      return;
    }

    const validLevels = validSettings.levels.every(
      (level) =>
        Number.isFinite(level.ratio) &&
        /^#[0-9a-fA-F]{6}$/.test(level.color),
    );

    if (!validLevels) {
      window.alert(
        'Periksa kembali rasio dan warna level Fibonacci.',
      );
      return;
    }

    if (
      !Number.isFinite(validSettings.firstPoint.price) ||
      !Number.isFinite(validSettings.secondPoint.price)
    ) {
      window.alert('Harga anchor Fibonacci tidak valid.');
      return;
    }

    onApply(validSettings);
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
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
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-2xl dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="min-w-0">
            <h2
              id="fibonacci-properties-title"
              className="truncate text-base font-semibold"
            >
              {title}
            </h2>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Atur level, tampilan garis, koordinat, dan visibilitas.
            </p>
          </div>

          <button
            type="button"
            aria-label="Tutup properties"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <FibonacciPropertiesTabs
            activeTab={activeTab}
            settings={settings}
            onTabChange={setActiveTab}
            onChange={setSettings}
          />
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Apply
          </button>
        </footer>
      </section>
    </div>
  );
};

export default FibonacciPropertiesModal;

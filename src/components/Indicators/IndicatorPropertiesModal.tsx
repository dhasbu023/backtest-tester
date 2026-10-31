
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface IndicatorProperties {
  period: number;
  color: string;
  strokeWidth: number;
  stdDev: number;
}

interface IndicatorPropertiesModalProps {
  isOpen: boolean;
  indicatorName: string;
  initialValues: IndicatorProperties;
  showPeriod?: boolean;
  showStdDev?: boolean;
  showStrokeWidth?: boolean;
  onClose: () => void;
  onSave: (values: IndicatorProperties) => void;
}

const IndicatorPropertiesModal: React.FC<
  IndicatorPropertiesModalProps
> = ({
  isOpen,
  indicatorName,
  initialValues,
  showPeriod = true,
  showStdDev = false,
  showStrokeWidth = true,
  onClose,
  onSave,
}) => {
  const [period, setPeriod] = useState(initialValues.period);
  const [color, setColor] = useState(initialValues.color);
  const [strokeWidth, setStrokeWidth] = useState(
    initialValues.strokeWidth
  );
  const [stdDev, setStdDev] = useState(initialValues.stdDev);

  useEffect(() => {
    if (!isOpen) return;

    setPeriod(initialValues.period);
    setColor(initialValues.color);
    setStrokeWidth(initialValues.strokeWidth);
    setStdDev(initialValues.stdDev);
  }, [
    isOpen,
    initialValues.period,
    initialValues.color,
    initialValues.strokeWidth,
    initialValues.stdDev,
  ]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onSave({
      period: Math.max(1, Math.min(500, Number(period) || 1)),
      color,
      strokeWidth,
      stdDev: Math.max(0.5, Math.min(5, Number(stdDev) || 2)),
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Pengaturan {indicatorName}
          </h3>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={17} />
          </button>
        </div>

        {showPeriod && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Periode
            </label>
            <input
              type="number"
              min={1}
              max={500}
              required
              value={period}
              onChange={(event) => setPeriod(Number(event.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        )}

        {showStdDev && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              StdDev Multiplier
            </label>
            <input
              type="number"
              min={0.5}
              max={5}
              step={0.1}
              value={stdDev}
              onChange={(event) => setStdDev(Number(event.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Warna
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              aria-label="Pilih warna indikator"
              className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent"
            />
            <span className="font-mono text-xs text-slate-500">{color}</span>
          </div>
        </div>

        {showStrokeWidth && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Ketebalan garis
            </label>
            <select
              value={strokeWidth}
              onChange={(event) => setStrokeWidth(Number(event.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value={1}>1 px — Halus</option>
              <option value={2}>2 px — Standar</option>
              <option value={3}>3 px — Tebal</option>
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Batal
          </button>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
};

export default IndicatorPropertiesModal;

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface IndicatorProperties {
  period: number;
  color: string;
  strokeWidth: number;
  stdDev: number;

  // Momentum Candle settings
  momentumCandleMode?: 'AGGRESSIVE' | 'CONSERVATIVE';
  maxWickPercent?: number;

  useConsolidationFilter?: boolean;
  consolidationCount?: number;

  useEmaFilter?: boolean;
  emaTimeframe?: 'M5' | 'M15' | 'M30' | 'H1';
  emaPeriod?: number;
}

interface IndicatorPropertiesModalProps {
  isOpen: boolean;
  indicatorName: string;
  initialValues: IndicatorProperties;

  showPeriod?: boolean;
  showStdDev?: boolean;
  showStrokeWidth?: boolean;

  // Tampilkan pengaturan khusus Momentum Candle
  showMomentumCandleSettings?: boolean;

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
  showMomentumCandleSettings = false,
  onClose,
  onSave,
}) => {
  // Pengaturan indikator umum
  const [period, setPeriod] = useState(initialValues.period);
  const [color, setColor] = useState(initialValues.color);
  const [strokeWidth, setStrokeWidth] = useState(
    initialValues.strokeWidth
  );
  const [stdDev, setStdDev] = useState(initialValues.stdDev);

  // Pengaturan Momentum Candle
  const [momentumCandleMode, setMomentumCandleMode] =
    useState<'AGGRESSIVE' | 'CONSERVATIVE'>(
      initialValues.momentumCandleMode ?? 'CONSERVATIVE'
    );

  const [maxWickPercent, setMaxWickPercent] = useState(
    initialValues.maxWickPercent ?? 30
  );

  const [useConsolidationFilter, setUseConsolidationFilter] =
    useState(initialValues.useConsolidationFilter ?? false);

  const [consolidationCount, setConsolidationCount] = useState(
    initialValues.consolidationCount ?? 3
  );

  const [useEmaFilter, setUseEmaFilter] = useState(
    initialValues.useEmaFilter ?? false
  );

  const [emaTimeframe, setEmaTimeframe] = useState<
    'M5' | 'M15' | 'M30' | 'H1'
  >(initialValues.emaTimeframe ?? 'M15');

  const [emaPeriod, setEmaPeriod] = useState(
    initialValues.emaPeriod ?? 50
  );

  // Perbarui nilai ketika modal dibuka atau konfigurasi berubah
  useEffect(() => {
    if (!isOpen) return;

    setPeriod(initialValues.period);
    setColor(initialValues.color);
    setStrokeWidth(initialValues.strokeWidth);
    setStdDev(initialValues.stdDev);

    setMomentumCandleMode(
      initialValues.momentumCandleMode ?? 'CONSERVATIVE'
    );

    setMaxWickPercent(initialValues.maxWickPercent ?? 30);

    setUseConsolidationFilter(
      initialValues.useConsolidationFilter ?? false
    );

    setConsolidationCount(
      initialValues.consolidationCount ?? 3
    );

    setUseEmaFilter(initialValues.useEmaFilter ?? false);

    setEmaTimeframe(
      initialValues.emaTimeframe ?? 'M15'
    );

    setEmaPeriod(initialValues.emaPeriod ?? 50);
  }, [
    isOpen,
    initialValues.period,
    initialValues.color,
    initialValues.strokeWidth,
    initialValues.stdDev,
    initialValues.momentumCandleMode,
    initialValues.maxWickPercent,
    initialValues.useConsolidationFilter,
    initialValues.consolidationCount,
    initialValues.useEmaFilter,
    initialValues.emaTimeframe,
    initialValues.emaPeriod,
  ]);

  if (!isOpen) return null;

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    onSave({
      period: Math.max(
        1,
        Math.min(500, Number(period) || 1)
      ),

      color,
      strokeWidth,

      stdDev: Math.max(
        0.5,
        Math.min(5, Number(stdDev) || 2)
      ),

      ...(showMomentumCandleSettings
        ? {
            momentumCandleMode,

            maxWickPercent: Math.max(
              0,
              Math.min(100, Number(maxWickPercent) || 0)
            ),

            useConsolidationFilter,

            consolidationCount: Math.max(
              1,
              Math.min(20, Number(consolidationCount) || 1)
            ),

            useEmaFilter,

            emaTimeframe,

            emaPeriod: Math.max(
              1,
              Math.min(500, Number(emaPeriod) || 1)
            ),
          }
        : {}),
    });
  };

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white';

  const labelClass =
    'mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Header */}
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

        {/* Pengaturan umum */}
        {showPeriod && (
          <div>
            <label className={labelClass}>
              Periode
            </label>

            <input
              type="number"
              min={1}
              max={500}
              required
              value={period}
              onChange={(event) =>
                setPeriod(Number(event.target.value))
              }
              className={inputClass}
            />
          </div>
        )}

        {showStdDev && (
          <div>
            <label className={labelClass}>
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
              className={inputClass}
            />
          </div>
        )}

        {/* Momentum Candle */}
        {showMomentumCandleSettings && (
          <>
            <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                Pengaturan Momentum Candle
              </h4>
            </div>

            {/* Mode candle */}
            <div>
              <label className={labelClass}>
                Mode Candle
              </label>

              <select
                value={momentumCandleMode}
                onChange={(event) =>
                  setMomentumCandleMode(
                    event.target.value as
                      | 'AGGRESSIVE'
                      | 'CONSERVATIVE'
                  )
                }
                className={inputClass}
              >
                <option value="AGGRESSIVE">
                  Agresif
                </option>

                <option value="CONSERVATIVE">
                  Konservatif
                </option>
              </select>

              <p className="mt-1 text-[11px] text-slate-400">
                Konservatif menambahkan pemeriksaan arah wick.
              </p>
            </div>

            {/* Max wick */}
            <div>
              <label className={labelClass}>
                Maksimal Wick (%)
              </label>

              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={maxWickPercent}
                onChange={(event) =>
                  setMaxWickPercent(Number(event.target.value))
                }
                className={inputClass}
              />

              <p className="mt-1 text-[11px] text-slate-400">
                Default 30%. Semakin kecil nilainya, semakin ketat
                syarat wick candle.
              </p>
            </div>

            {/* Consolidation filter */}
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <div>
                  <span className="block text-xs font-semibold text-slate-800 dark:text-white">
                    Filter Konsolidasi
                  </span>

                  <span className="text-[11px] text-slate-400">
                    Memeriksa ukuran body candle sebelumnya.
                  </span>
                </div>

                <input
                  type="checkbox"
                  checked={useConsolidationFilter}
                  onChange={(event) =>
                    setUseConsolidationFilter(event.target.checked)
                  }
                  className="h-4 w-4 accent-blue-600"
                />
              </label>

              {useConsolidationFilter && (
                <div className="mt-3">
                  <label className={labelClass}>
                    Jumlah Candle Sebelumnya
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={consolidationCount}
                    onChange={(event) =>
                      setConsolidationCount(
                        Number(event.target.value)
                      )
                    }
                    className={inputClass}
                  />

                  <p className="mt-1 text-[11px] text-slate-400">
                    Body candle sebelumnya harus lebih kecil
                    daripada body candle sinyal.
                  </p>
                </div>
              )}
            </div>

            {/* EMA filter */}
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <div>
                  <span className="block text-xs font-semibold text-slate-800 dark:text-white">
                    Filter Trend EMA
                  </span>

                  <span className="text-[11px] text-slate-400">
                    Hanya mengambil sinyal searah tren.
                  </span>
                </div>

                <input
                  type="checkbox"
                  checked={useEmaFilter}
                  onChange={(event) =>
                    setUseEmaFilter(event.target.checked)
                  }
                  className="h-4 w-4 accent-blue-600"
                />
              </label>

              {useEmaFilter && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className={labelClass}>
                      Timeframe EMA
                    </label>

                    <select
                      value={emaTimeframe}
                      onChange={(event) =>
                        setEmaTimeframe(
                          event.target.value as
                            | 'M5'
                            | 'M15'
                            | 'M30'
                            | 'H1'
                        )
                      }
                      className={inputClass}
                    >
                      <option value="M5">M5</option>
                      <option value="M15">M15</option>
                      <option value="M30">M30</option>
                      <option value="H1">H1</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Periode EMA
                    </label>

                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={emaPeriod}
                      onChange={(event) =>
                        setEmaPeriod(Number(event.target.value))
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Warna indikator */}
        <div>
          <label className={labelClass}>
            Warna
          </label>

          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(event) =>
                setColor(event.target.value)
              }
              aria-label="Pilih warna indikator"
              className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent"
            />

            <span className="font-mono text-xs text-slate-500">
              {color}
            </span>
          </div>
        </div>

        {/* Ketebalan garis */}
        {showStrokeWidth && (
          <div>
            <label className={labelClass}>
              Ketebalan garis
            </label>

            <select
              value={strokeWidth}
              onChange={(event) =>
                setStrokeWidth(Number(event.target.value))
              }
              className={inputClass}
            >
              <option value={1}>1 px — Halus</option>
              <option value={2}>2 px — Standar</option>
              <option value={3}>3 px — Tebal</option>
            </select>
          </div>
        )}

        {/* Footer */}
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
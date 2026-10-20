
import React, { useEffect, useState } from 'react';
import type { DrawingObject } from '../../../../types/index.js';
import {
  HORIZONTAL_LINE_DEFAULTS,
  HORIZONTAL_LINE_STYLES,
  type HorizontalLineStyle,
} from './horizontalLine.defaults.js';

interface HorizontalLinePropertiesProps {
  drawing: DrawingObject;
  isDarkMode: boolean;
  onApply: (values: {
    color: string;
    strokeWidth: number;
    price: number;
    lineStyle: HorizontalLineStyle;
  }) => void;
  onClose: () => void;
}

export const HorizontalLineProperties: React.FC<
  HorizontalLinePropertiesProps
> = ({ drawing, isDarkMode, onApply, onClose }) => {
  const [color, setColor] = useState(
    drawing.color || HORIZONTAL_LINE_DEFAULTS.color,
  );

  const [strokeWidth, setStrokeWidth] = useState(
    drawing.strokeWidth || HORIZONTAL_LINE_DEFAULTS.strokeWidth,
  );

  const [price, setPrice] = useState(
    String(drawing.points[0]?.price ?? ''),
  );

  const [lineStyle, setLineStyle] = useState<HorizontalLineStyle>(
    (drawing as DrawingObject & { lineStyle?: HorizontalLineStyle })
      .lineStyle ?? 'solid',
  );

  const [error, setError] = useState('');

  // Perbarui form jika garis yang diedit berubah.
  useEffect(() => {
    setColor(drawing.color || HORIZONTAL_LINE_DEFAULTS.color);
    setStrokeWidth(
      drawing.strokeWidth || HORIZONTAL_LINE_DEFAULTS.strokeWidth,
    );
    setPrice(String(drawing.points[0]?.price ?? ''));
    setLineStyle(
      (drawing as DrawingObject & { lineStyle?: HorizontalLineStyle })
        .lineStyle ?? 'solid',
    );
    setError('');
  }, [drawing]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedPrice = Number(price);

    if (price.trim() === '' || !Number.isFinite(parsedPrice)) {
      setError('Masukkan harga yang valid.');
      return;
    }

    if (!Number.isFinite(strokeWidth) || strokeWidth < 1 || strokeWidth > 5) {
      setError('Ketebalan garis harus antara 1 sampai 5.');
      return;
    }

    onApply({
      color,
      strokeWidth,
      price: parsedPrice,
      lineStyle,
    });
  };

  const panelClass = isDarkMode
    ? 'bg-slate-900 text-slate-100 border-slate-700'
    : 'bg-white text-slate-900 border-slate-200';

  const inputClass = isDarkMode
    ? 'bg-slate-800 border-slate-600 text-white'
    : 'bg-white border-slate-300 text-slate-900';

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
        className={`w-full max-w-md rounded-xl border p-5 shadow-2xl ${panelClass}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Horizontal Line Properties
            </h2>
            <p className="mt-1 text-xs opacity-60">
              Atur tampilan dan koordinat harga garis.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-lg hover:bg-slate-500/20"
            aria-label="Tutup properties"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Warna garis
            </label>

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-10 w-14 cursor-pointer rounded border-0 bg-transparent"
              />

              <input
                type="text"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                pattern="^#[0-9a-fA-F]{6}$"
                title="Gunakan format warna hex, misalnya #3b82f6"
                className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm ${inputClass}`}
                aria-label="Kode warna hex"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Gaya garis
            </label>

            <select
              value={lineStyle}
              onChange={(event) =>
                setLineStyle(event.target.value as HorizontalLineStyle)
              }
              className={`w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`}
            >
              {Object.keys(HORIZONTAL_LINE_STYLES).map((style) => (
                <option key={style} value={style}>
                  {style === 'solid'
                    ? 'Solid — utuh'
                    : style === 'dashed'
                      ? 'Dashed — putus-putus'
                      : 'Dotted — titik-titik'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Ketebalan garis
            </label>

            <select
              value={strokeWidth}
              onChange={(event) =>
                setStrokeWidth(Number(event.target.value))
              }
              className={`w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`}
            >
              {[1, 2, 3, 4, 5].map((width) => (
                <option key={width} value={width}>
                  {width} px
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Koordinat harga (Price)
            </label>

            <input
              type="number"
              step="any"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className={`w-full rounded-lg border px-3 py-2 font-mono text-sm ${inputClass}`}
              placeholder="Contoh: 2650.50"
              required
            />

            <p className="mt-1 text-xs opacity-60">
              Garis akan berpindah ke harga yang kamu masukkan.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-500/40 px-4 py-2 text-sm hover:bg-slate-500/10"
          >
            Batal
          </button>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </form>
    </div>
  );
};

export default HorizontalLineProperties;

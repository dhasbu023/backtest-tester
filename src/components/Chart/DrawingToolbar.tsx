
import React, { useState } from 'react';

import {
  Undo2,
  Redo2,
  X,
  Trash2,
} from 'lucide-react';

import type {
  DrawingToolType,
  DrawingObject,
} from '../../types/index.js';

import {
  TOOLS,
  PRESET_COLORS,
} from './Drawing/drawingTools.js';

interface DrawingToolbarProps {
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  currentColor: string;
  onChangeColor: (color: string) => void;
  currentStrokeWidth: number;
  onChangeStrokeWidth: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearAll: () => void;
  drawings?: DrawingObject[];
  onToggleDrawingVisible?: (id: string) => void;
  onToggleDrawingLock?: (id: string) => void;
  onDeleteDrawing?: (id: string) => void;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  activeTool,
  onSelectTool,
  currentColor,
  onChangeColor,
  currentStrokeWidth,
  onChangeStrokeWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearAll,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <aside
      aria-label="Drawing tools"
      className="relative z-30 flex h-full w-12 shrink-0 flex-col items-center gap-1 overflow-visible border-r border-slate-200 bg-white py-2 text-slate-700 select-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
    >
      {/* Drawing tools */}
      {TOOLS.map(({ type, label, icon: Icon }) => {
        const isActive = activeTool === type;

        return (
          <button
            key={type}
            type="button"
            onClick={() => onSelectTool(type)}
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            className={`group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />

            <span className="pointer-events-none absolute left-full top-1/2 z-[60] ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {label}
            </span>
          </button>
        );
      })}

      <div className="mx-2 my-1 h-px w-7 shrink-0 bg-slate-200 dark:bg-slate-800" />

      {/* Color and line width */}
      <div className="relative flex w-full justify-center">
        <button
          type="button"
          onClick={() => setShowColorPicker((value) => !value)}
          aria-label="Warna dan ketebalan garis"
          aria-pressed={showColorPicker}
          title="Warna dan ketebalan garis"
          className={`group relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
            showColorPicker
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span
            className="h-4 w-4 rounded-full border border-slate-400/50 shadow-sm"
            style={{ backgroundColor: currentColor }}
          />

          <span className="pointer-events-none absolute left-full top-1/2 z-[60] ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] text-white opacity-0 group-hover:opacity-100">
            Warna &amp; Ketebalan
          </span>
        </button>

        {showColorPicker && (
          <div className="absolute left-full top-0 z-[70] ml-2 w-48 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Pengaturan Garis
              </span>

              <button
                type="button"
                onClick={() => setShowColorPicker(false)}
                aria-label="Tutup pengaturan warna"
                title="Tutup"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <span className="mb-2 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Warna
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChangeColor(color)}
                  aria-label={`Pilih warna ${color}`}
                  aria-pressed={currentColor === color}
                  className={`h-6 w-6 rounded-full border border-slate-300 transition-transform hover:scale-110 dark:border-slate-600 ${
                    currentColor === color
                      ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900'
                      : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}

              <input
                type="color"
                value={currentColor}
                onChange={(event) => onChangeColor(event.target.value)}
                aria-label="Pilih warna kustom"
                className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
              />
            </div>

            <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
              <span className="mb-2 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Ketebalan Garis
              </span>

              <div className="flex gap-1">
                {[1, 2, 3, 4].map((width) => (
                  <button
                    key={width}
                    type="button"
                    onClick={() => onChangeStrokeWidth(width)}
                    aria-pressed={currentStrokeWidth === width}
                    className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                      currentStrokeWidth === width
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {width}px
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mx-2 my-1 h-px w-7 shrink-0 bg-slate-200 dark:bg-slate-800" />

      {/* Undo */}
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo"
        title="Undo (Ctrl+Z)"
        className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-800"
      >
        <Undo2 className="h-[18px] w-[18px]" />

        <span className="pointer-events-none absolute left-full top-1/2 z-[60] ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          Undo
        </span>
      </button>

      {/* Redo */}
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo"
        title="Redo (Ctrl+Y)"
        className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-800"
      >
        <Redo2 className="h-[18px] w-[18px]" />

        <span className="pointer-events-none absolute left-full top-1/2 z-[60] ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          Redo
        </span>
      </button>

      {/* Hapus semua gambar */}
      <button
        type="button"
        onClick={onClearAll}
        aria-label="Hapus semua gambar"
        title="Hapus semua gambar"
        className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-rose-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-950 dark:hover:text-rose-400"
      >
        <Trash2 className="h-[18px] w-[18px]" />

        <span className="pointer-events-none absolute left-full top-1/2 z-[60] ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          Hapus semua gambar
        </span>
      </button>
    </aside>
  );
};

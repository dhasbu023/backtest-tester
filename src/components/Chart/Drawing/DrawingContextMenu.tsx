import React, { useEffect, useRef } from 'react';
import { Settings, Copy, Lock, Unlock, Eye, EyeOff, Trash2 } from 'lucide-react';
import type { DrawingObject } from '../../../types/index.js';

interface DrawingContextMenuProps {
  x: number;
  y: number;
  drawing: DrawingObject;
  onClose: () => void;
  onOpenProperties: (id: string) => void;
  onDuplicate: (drawing: DrawingObject) => void;
  onToggleLock: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
}

export const DrawingContextMenu: React.FC<DrawingContextMenuProps> = ({
  x,
  y,
  drawing,
  onClose,
  onOpenProperties,
  onDuplicate,
  onToggleLock,
  onToggleVisibility,
  onDelete,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Posisi menu disesuaikan agar tidak meluap ke luar layar
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 240);

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] w-48 rounded-xl border border-slate-200 bg-white p-1 text-xs text-slate-800 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 select-none"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1">
        {drawing.type.replace('_', ' ')}
      </div>

      <button
        type="button"
        onClick={() => {
          onClose();
          onOpenProperties(drawing.id);
        }}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Settings className="h-3.5 w-3.5 text-blue-500" />
        <span className="font-medium">Settings / Properties</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onClose();
          onDuplicate(drawing);
        }}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Copy className="h-3.5 w-3.5 text-slate-500" />
        <span className="font-medium">Duplicate</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onClose();
          onToggleLock(drawing.id);
        }}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        {drawing.locked ? (
          <>
            <Unlock className="h-3.5 w-3.5 text-amber-500" />
            <span className="font-medium">Unlock</span>
          </>
        ) : (
          <>
            <Lock className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-medium">Lock</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          onClose();
          onToggleVisibility(drawing.id);
        }}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        {drawing.visible ? (
          <>
            <EyeOff className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-medium">Hide</span>
          </>
        ) : (
          <>
            <Eye className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-medium">Show</span>
          </>
        )}
      </button>

      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

      <button
        type="button"
        onClick={() => {
          onClose();
          onDelete(drawing.id);
        }}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
        <span className="font-medium">Delete</span>
      </button>
    </div>
  );
};

export default DrawingContextMenu;

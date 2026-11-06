
import React, { useEffect, useRef, useState } from 'react';

import type {
  CreateOrderInput,
  OrderDirection,
  OrderType,
} from '../../types/order';

import OrderForm from './OrderForm';

interface OrderModalProps {
  isOpen: boolean;
  sessionId: string;
  currentPrice: number;
  leverage: number;
  onClose: () => void;
  onSubmit: (input: CreateOrderInput) => Promise<unknown>;
  initialDirection?: OrderDirection;
  initialOrderType?: OrderType;
}

interface DragPosition {
  x: number;
  y: number;
}

interface DragData {
  pointerX: number;
  pointerY: number;
  startX: number;
  startY: number;
  width: number;
  height: number;
}

export default function OrderModal({
  isOpen,
  sessionId,
  currentPrice,
  leverage,
  onClose,
  onSubmit,
  initialDirection = 'BUY',
  initialOrderType = 'MARKET',
}: OrderModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<DragPosition | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragData | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setSubmitting(false);
    setPosition(null);
    dragRef.current = null;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const padding = 8;

      const nextX = drag.startX + event.clientX - drag.pointerX;
      const nextY = drag.startY + event.clientY - drag.pointerY;

      const maxX = Math.max(
        padding,
        window.innerWidth - drag.width - padding
      );

      const maxY = Math.max(
        padding,
        window.innerHeight - drag.height - padding
      );

      setPosition({
        x: Math.min(Math.max(padding, nextX), maxX),
        y: Math.min(Math.max(padding, nextY), maxY),
      });
    };

    const handlePointerUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, submitting, onClose]);

  const handleDragStart = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0 || submitting) return;

    const modal = modalRef.current;
    if (!modal) return;

    const rect = modal.getBoundingClientRect();

    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: rect.left,
      startY: rect.top,
      width: rect.width,
      height: rect.height,
    };

    setPosition({
      x: rect.left,
      y: rect.top,
    });

    event.preventDefault();
  };

  const handleSubmit = async (input: CreateOrderInput) => {
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(input);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan order.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-title"
        style={
          position
            ? {
                left: position.x,
                top: position.y,
                transform: 'none',
              }
            : {
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }
        }
        className="
          fixed flex w-[calc(100%-20px)] max-w-md
          max-h-[90vh] flex-col overflow-hidden
          rounded-lg border border-gray-200
          bg-white shadow-2xl
          dark:border-gray-700 dark:bg-gray-950
        "
      >
        {/* HEADER */}

        <div
          onPointerDown={handleDragStart}
          className="
            flex shrink-0 cursor-grab touch-none
            select-none items-center justify-between
            border-b border-gray-200 bg-gray-50
            px-3 py-2.5 active:cursor-grabbing
            dark:border-gray-700 dark:bg-gray-900
          "
        >
          <div className="pointer-events-none">
            <h2
              id="order-modal-title"
              className="text-sm font-bold text-gray-900 dark:text-white"
            >
              Buat Order XAUUSD
            </h2>

            <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
              Atur transaksi dan parameter risiko.
            </p>
          </div>

          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onClose}
            disabled={submitting}
            aria-label="Tutup modal"
            className="
              flex h-7 w-7 shrink-0 items-center
              justify-center rounded-md text-lg
              text-gray-500 hover:bg-gray-200
              hover:text-gray-900 disabled:opacity-50
              dark:hover:bg-gray-800 dark:hover:text-white
            "
          >
            ×
          </button>
        </div>

        {/* BODY */}

        <div className="min-h-0 overflow-y-auto p-3">
          {error && (
            <div
              role="alert"
              className="
                mb-3 rounded-md border border-red-200
                bg-red-50 p-2 text-xs text-red-700
                dark:border-red-900 dark:bg-red-950/40
                dark:text-red-300
              "
            >
              {error}
            </div>
          )}

          <OrderForm
            sessionId={sessionId}
            currentPrice={currentPrice}
            leverage={leverage}
            initialDirection={initialDirection}
            initialOrderType={initialOrderType}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}

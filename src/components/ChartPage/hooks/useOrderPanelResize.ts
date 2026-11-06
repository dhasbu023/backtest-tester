
import { useCallback, useRef, useState } from 'react';

import type {
  KeyboardEvent,
  PointerEvent,
} from 'react';

const DEFAULT_HEIGHT = 300;
const MIN_HEIGHT = 150;

export function useOrderPanelResize() {
  const [orderPanelHeight, setOrderPanelHeight] =
    useState(DEFAULT_HEIGHT);

  const dragStartRef = useRef<{
    pointerY: number;
    panelHeight: number;
  } | null>(null);

  const getMaxPanelHeight = useCallback(() => {
    const mainHeight =
      document.querySelector('main[data-chart-page]')
        ?.clientHeight || window.innerHeight;

    const availableHeight = mainHeight - 150;

    return Math.max(
      MIN_HEIGHT,
      Math.floor(
        Math.min(mainHeight * 0.7, availableHeight)
      )
    );
  }, []);

  const handleResizeStart = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    dragStartRef.current = {
      pointerY: event.clientY,
      panelHeight: orderPanelHeight,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizeMove = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (!dragStartRef.current) return;

    const deltaY =
      dragStartRef.current.pointerY - event.clientY;

    const nextHeight = Math.min(
      getMaxPanelHeight(),
      Math.max(
        MIN_HEIGHT,
        dragStartRef.current.panelHeight + deltaY
      )
    );

    setOrderPanelHeight(nextHeight);
  };

  const handleResizeEnd = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    dragStartRef.current = null;

    if (
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }
  };

  const handleResizeKeyboard = (
    event: KeyboardEvent<HTMLDivElement>
  ) => {
    const step = event.shiftKey ? 50 : 20;
    const maxHeight = getMaxPanelHeight();

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      setOrderPanelHeight((height) =>
        Math.min(maxHeight, height + step)
      );
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      setOrderPanelHeight((height) =>
        Math.max(MIN_HEIGHT, height - step)
      );
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setOrderPanelHeight(MIN_HEIGHT);
    }

    if (event.key === 'End') {
      event.preventDefault();
      setOrderPanelHeight(maxHeight);
    }
  };

  return {
    orderPanelHeight,
    getMaxPanelHeight,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
    handleResizeKeyboard,
  };
}

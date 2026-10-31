
import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';

import type { DrawingObject } from '../types/index.js';

import { isSameDrawings } from '../components/Chart/utils/chartComparators.js';

interface UseDrawingHistoryParams {
  drawings: DrawingObject[];
  drawingsRef: MutableRefObject<DrawingObject[]>;
  drawingDragStartRef: MutableRefObject<DrawingObject[] | null>;
  onUpdateDrawings: (drawings: DrawingObject[]) => void;
  setSelectedDrawingId: Dispatch<SetStateAction<string | null>>;
}

interface UseDrawingHistoryResult {
  drawingHistory: DrawingObject[][];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  commitDrawingsWithHistory: (drawings: DrawingObject[]) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  commitDragHistory: () => void;
}

export function useDrawingHistory({
  drawings,
  drawingsRef,
  drawingDragStartRef,
  onUpdateDrawings,
  setSelectedDrawingId,
}: UseDrawingHistoryParams): UseDrawingHistoryResult {
  const [drawingHistory, setDrawingHistory] = useState<
    DrawingObject[][]
  >(() => [[...drawings]]);

  const [historyIndex, setHistoryIndex] = useState(0);

  const commitDrawingsWithHistory = useCallback(
    (newDrawings: DrawingObject[]) => {
      if (isSameDrawings(drawingsRef.current, newDrawings)) {
        return;
      }

      drawingsRef.current = newDrawings;
      onUpdateDrawings(newDrawings);

      setDrawingHistory((previousHistory) => {
        const base = previousHistory.slice(0, historyIndex + 1);

        base.push([...newDrawings]);

        setHistoryIndex(base.length - 1);

        return base;
      });
    },
    [drawingsRef, historyIndex, onUpdateDrawings],
  );

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;

    const nextIndex = historyIndex - 1;
    const previousDrawings = drawingHistory[nextIndex];

    if (!previousDrawings) return;

    drawingDragStartRef.current = null;

    const restored = [...previousDrawings];

    drawingsRef.current = restored;

    setHistoryIndex(nextIndex);
    onUpdateDrawings(restored);
    setSelectedDrawingId(null);
  }, [
    historyIndex,
    drawingHistory,
    drawingsRef,
    drawingDragStartRef,
    onUpdateDrawings,
    setSelectedDrawingId,
  ]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= drawingHistory.length - 1) return;

    const nextIndex = historyIndex + 1;
    const nextDrawings = drawingHistory[nextIndex];

    if (!nextDrawings) return;

    drawingDragStartRef.current = null;

    const restored = [...nextDrawings];

    drawingsRef.current = restored;

    setHistoryIndex(nextIndex);
    onUpdateDrawings(restored);
    setSelectedDrawingId(null);
  }, [
    historyIndex,
    drawingHistory,
    drawingsRef,
    drawingDragStartRef,
    onUpdateDrawings,
    setSelectedDrawingId,
  ]);

  const commitDragHistory = useCallback(() => {
    const initialDrawings = drawingDragStartRef.current;

    if (initialDrawings === null) return;

    drawingDragStartRef.current = null;

    const finalDrawings = drawingsRef.current;

    if (isSameDrawings(initialDrawings, finalDrawings)) {
      return;
    }

    setDrawingHistory((previousHistory) => {
      const base = previousHistory.slice(0, historyIndex + 1);

      base.push([...finalDrawings]);

      setHistoryIndex(base.length - 1);

      return base;
    });
  }, [historyIndex, drawingsRef, drawingDragStartRef]);

  // Sinkronkan riwayat jika drawing berubah dari luar hook,
  // misalnya ketika sesi atau data drawing diganti.
  useEffect(() => {
    if (drawingDragStartRef.current !== null) return;

    if (isSameDrawings(drawingsRef.current, drawings)) {
      return;
    }

    drawingsRef.current = drawings;

    setDrawingHistory([[...drawings]]);
    setHistoryIndex(0);
  }, [drawings, drawingsRef, drawingDragStartRef]);

  return {
    drawingHistory,
    historyIndex,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < drawingHistory.length - 1,
    commitDrawingsWithHistory,
    handleUndo,
    handleRedo,
    commitDragHistory,
  };
}

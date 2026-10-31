import { useCallback, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';

import type { DrawingObject } from '../types/index.js';

interface UseDrawingActionsParams {
  sessionId: string;
  drawingsRef: MutableRefObject<DrawingObject[]>;
  drawingDragStartRef: MutableRefObject<DrawingObject[] | null>;
  commitDrawingsWithHistory: (drawings: DrawingObject[]) => void;
  commitDragHistory: () => void;
  onUpdateDrawings: (drawings: DrawingObject[]) => void;
  setSelectedDrawingId: Dispatch<SetStateAction<string | null>>;
}

export function useDrawingActions({
  sessionId,
  drawingsRef,
  drawingDragStartRef,
  commitDrawingsWithHistory,
  commitDragHistory,
  onUpdateDrawings,
  setSelectedDrawingId,
}: UseDrawingActionsParams) {
  // =========================================================
  // ADD DRAWING
  // =========================================================

  const handleAddDrawing = useCallback(
    (drawing: DrawingObject) => {
      const drawingWithSession: DrawingObject = {
        ...drawing,
        sessionId,
      };

      const updated = [
        ...drawingsRef.current,
        drawingWithSession,
      ];

      commitDrawingsWithHistory(updated);
      setSelectedDrawingId(drawing.id);
    },
    [
      sessionId,
      drawingsRef,
      commitDrawingsWithHistory,
      setSelectedDrawingId,
    ],
  );

  // =========================================================
  // UPDATE DRAWING
  // =========================================================

  const handleUpdateDrawing = useCallback(
    (drawing: DrawingObject) => {
      const current = drawingsRef.current;

      const existing = current.find(
        (item) => item.id === drawing.id,
      );

      if (!existing || existing === drawing) return;

      const updated = current.map((item) =>
        item.id === drawing.id ? drawing : item,
      );

      drawingsRef.current = updated;

      // Ketika sedang drag, jangan membuat history
      // pada setiap pergerakan mouse.
      if (drawingDragStartRef.current !== null) {
        onUpdateDrawings(updated);
        return;
      }

      commitDrawingsWithHistory(updated);
    },
    [
      drawingsRef,
      drawingDragStartRef,
      onUpdateDrawings,
      commitDrawingsWithHistory,
    ],
  );

  // =========================================================
  // DRAWING DRAG
  // =========================================================

  const handleDrawingDragStart = useCallback(() => {
    if (drawingDragStartRef.current === null) {
      drawingDragStartRef.current = [
        ...drawingsRef.current,
      ];
    }
  }, [drawingsRef, drawingDragStartRef]);

  const handleDrawingDragEnd = useCallback(() => {
    commitDragHistory();
  }, [commitDragHistory]);

  // =========================================================
  // DELETE DRAWING
  // =========================================================

  const handleDeleteDrawing = useCallback(
    (id: string) => {
      const current = drawingsRef.current;

      const updated = current.filter(
        (drawing) => drawing.id !== id,
      );

      if (updated.length === current.length) return;

      commitDrawingsWithHistory(updated);

      setSelectedDrawingId((previous) =>
        previous === id ? null : previous,
      );
    },
    [
      drawingsRef,
      commitDrawingsWithHistory,
      setSelectedDrawingId,
    ],
  );

  // =========================================================
  // CLEAR ALL DRAWINGS
  // =========================================================

  const handleClearAllDrawings = useCallback(() => {
    if (drawingsRef.current.length === 0) return;

    commitDrawingsWithHistory([]);
    setSelectedDrawingId(null);
  }, [
    drawingsRef,
    commitDrawingsWithHistory,
    setSelectedDrawingId,
  ]);

  // =========================================================
  // TOGGLE DRAWING VISIBILITY
  // =========================================================

  const handleToggleDrawingVisible = useCallback(
    (id: string) => {
      const updated = drawingsRef.current.map((drawing) =>
        drawing.id === id
          ? {
              ...drawing,
              visible: !drawing.visible,
            }
          : drawing,
      );

      commitDrawingsWithHistory(updated);
    },
    [drawingsRef, commitDrawingsWithHistory],
  );

  // =========================================================
  // TOGGLE DRAWING LOCK
  // =========================================================

  const handleToggleDrawingLock = useCallback(
    (id: string) => {
      const updated = drawingsRef.current.map((drawing) =>
        drawing.id === id
          ? {
              ...drawing,
              locked: !drawing.locked,
            }
          : drawing,
      );

      commitDrawingsWithHistory(updated);
    },
    [drawingsRef, commitDrawingsWithHistory],
  );

  return {
    handleAddDrawing,
    handleUpdateDrawing,
    handleDrawingDragStart,
    handleDrawingDragEnd,
    handleDeleteDrawing,
    handleClearAllDrawings,
    handleToggleDrawingVisible,
    handleToggleDrawingLock,
  };
}
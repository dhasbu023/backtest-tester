
import { useCallback, useState } from 'react';
import {
  fetchSessions,
  deleteSession as apiDeleteSession,
} from '../services/api.js';

import type { BacktestSession } from '../types/index.js';

type UseSessionsOptions = {
  activeSessionId: string | null;
  onActiveSessionDeleted: () => void;
  onError: (message: string) => void;
};

export function useSessions({
  activeSessionId,
  onActiveSessionDeleted,
  onError,
}: UseSessionsOptions) {
  const [sessions, setSessions] = useState<BacktestSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);

    try {
      const data = await fetchSessions();
      const safeData = Array.isArray(data) ? data : [];

      setSessions(safeData);
      return safeData;
    } catch (err: unknown) {
      console.error('Failed to load sessions:', err);

      const message =
        err instanceof Error ? err.message : String(err);

      onError(
        'Gagal memuat daftar sesi dari database: ' + message
      );

      return [];
    } finally {
      setIsLoadingSessions(false);
    }
  }, [onError]);

  const handleDeleteSession = useCallback(
    async (id: string) => {
      try {
        await apiDeleteSession(id);

        if (activeSessionId === id) {
          onActiveSessionDeleted();
        }

        await loadSessions();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : String(err);

        onError('Gagal menghapus sesi: ' + message);
      }
    },
    [
      activeSessionId,
      onActiveSessionDeleted,
      loadSessions,
      onError,
    ]
  );

  return {
    sessions,
    isLoadingSessions,
    loadSessions,
    handleDeleteSession,
  };
}

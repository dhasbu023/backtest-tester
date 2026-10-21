
import { useCallback, useRef, useState } from 'react';

import type {
  BacktestSession,
  DrawingObject,
  IndicatorConfig,
} from '../types/index.js';

import {
  saveDrawings,
  savePreference,
} from '../services/api.js';

type UseChartPreferencesOptions = {
  activeSession: BacktestSession | null;
};

export function useChartPreferences({
  activeSession,
}: UseChartPreferencesOptions) {
  const activeSessionRef = useRef(activeSession);
  activeSessionRef.current = activeSession;

  const [activeTimezone, setActiveTimezone] =
    useState('Asia/Jakarta');

  const [showVolume, setShowVolume] = useState(true);

  const [volumeType, setVolumeType] =
    useState<'TICK' | 'REAL'>('TICK');

  // Tidak ada indikator bawaan.
  // Indikator hanya muncul jika ditambahkan oleh pengguna
  // atau dimuat dari preferensi sesi yang tersimpan.
  const [indicators, setIndicators] =
    useState<IndicatorConfig[]>([]);

  const [drawings, setDrawings] =
    useState<DrawingObject[]>([]);

  const drawingSaveTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefSaveTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadChartPreferences = useCallback(
    (
      loadedDrawings: DrawingObject[],
      loadedPref: {
        timezone?: string | null;
        showVolume?: boolean;
        volumeType?: 'TICK' | 'REAL' | null;
        indicators?: IndicatorConfig[] | null;
      } | null,
      explicitSessionId?: string
    ) => {
      const sessionId = explicitSessionId || activeSessionRef.current?.id;
      let finalDrawings = loadedDrawings ?? [];
      if (finalDrawings.length === 0 && sessionId) {
        try {
          const cached = localStorage.getItem(`chart_drawings_${sessionId}`);
          if (cached) {
            finalDrawings = JSON.parse(cached);
          }
        } catch {
          // ignore
        }
      }
      setDrawings(finalDrawings);

      if (loadedPref) {
        setActiveTimezone(
          loadedPref.timezone || 'Asia/Jakarta'
        );

        setShowVolume(
          loadedPref.showVolume !== undefined
            ? loadedPref.showVolume
            : true
        );

        setVolumeType(
          loadedPref.volumeType || 'TICK'
        );

        // Daftar kosong tetap kosong.
        // Jangan mengembalikan DEFAULT_INDICATORS.
        setIndicators(
          loadedPref.indicators ?? []
        );
      } else {
        // Preferensi belum tersedia: gunakan pengaturan awal
        // tanpa indikator bawaan.
        setActiveTimezone('Asia/Jakarta');
        setShowVolume(true);
        setVolumeType('TICK');
        setIndicators([]);
      }
    },
    []
  );

  const resetChartPreferences = useCallback(() => {
    setDrawings([]);
    setActiveTimezone('Asia/Jakarta');
    setShowVolume(true);
    setVolumeType('TICK');

    // Reset tidak menambahkan indikator otomatis.
    setIndicators([]);
  }, []);

  const handleUpdateDrawings = useCallback(
    (newDrawings: DrawingObject[]) => {
      setDrawings(newDrawings);

      const session = activeSessionRef.current;
      // Simpan langsung ke localStorage agar tersimpan aman
      const storageKey = session?.id
        ? `chart_drawings_${session.id}`
        : 'chart_drawings_default';
      try {
        localStorage.setItem(storageKey, JSON.stringify(newDrawings));
      } catch {
        // ignore
      }

      if (!session) {
        return;
      }

      if (drawingSaveTimeoutRef.current) {
        clearTimeout(drawingSaveTimeoutRef.current);
      }

      const sessionIdToSave = session.id;
      drawingSaveTimeoutRef.current = setTimeout(
        async () => {
          try {
            await saveDrawings(
              sessionIdToSave,
              newDrawings
            );
          } catch (err) {
            console.warn(
              'Failed to save drawings:',
              err
            );
          }
        },
        500
      );
    },
    []
  );

  const saveCurrentPreferences = useCallback(
    (
      timezone: string,
      volumeVisible: boolean,
      type: 'TICK' | 'REAL',
      currentIndicators: IndicatorConfig[]
    ) => {
      const session = activeSessionRef.current;
      if (!session) {
        return;
      }

      if (prefSaveTimeoutRef.current) {
        clearTimeout(prefSaveTimeoutRef.current);
      }

      const sessionIdToSave = session.id;
      prefSaveTimeoutRef.current = setTimeout(
        async () => {
          try {
            await savePreference(sessionIdToSave, {
              sessionId: sessionIdToSave,
              timezone,
              showVolume: volumeVisible,
              volumeType: type,
              indicators: currentIndicators,
            });
          } catch (err) {
            console.warn(
              'Failed to save chart preferences:',
              err
            );
          }
        },
        500
      );
    },
    []
  );

  const handleChangeTimezone = useCallback(
    (newTimezone: string) => {
      setActiveTimezone(newTimezone);

      saveCurrentPreferences(
        newTimezone,
        showVolume,
        volumeType,
        indicators
      );
    },
    [
      showVolume,
      volumeType,
      indicators,
      saveCurrentPreferences,
    ]
  );

  const handleToggleVolume = useCallback(() => {
    const nextValue = !showVolume;

    setShowVolume(nextValue);

    saveCurrentPreferences(
      activeTimezone,
      nextValue,
      volumeType,
      indicators
    );
  }, [
    activeTimezone,
    showVolume,
    volumeType,
    indicators,
    saveCurrentPreferences,
  ]);

  const handleChangeVolumeType = useCallback(
    (newType: 'TICK' | 'REAL') => {
      setVolumeType(newType);

      saveCurrentPreferences(
        activeTimezone,
        showVolume,
        newType,
        indicators
      );
    },
    [
      activeTimezone,
      showVolume,
      indicators,
      saveCurrentPreferences,
    ]
  );

  const handleUpdateIndicators = useCallback(
    (newIndicators: IndicatorConfig[]) => {
      setIndicators(newIndicators);

      saveCurrentPreferences(
        activeTimezone,
        showVolume,
        volumeType,
        newIndicators
      );
    },
    [
      activeTimezone,
      showVolume,
      volumeType,
      saveCurrentPreferences,
    ]
  );

  return {
    activeTimezone,
    showVolume,
    volumeType,
    indicators,
    drawings,
    setDrawings,
    loadChartPreferences,
    resetChartPreferences,
    handleUpdateDrawings,
    handleChangeTimezone,
    handleToggleVolume,
    handleChangeVolumeType,
    handleUpdateIndicators,
  };
}


// ============================================================
// IMPORTS
// ============================================================

import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import type { IndicatorConfig } from '../types/index.js';

import type {
  IndicatorProperties,
} from '../components/Indicators/IndicatorPropertiesModal.js';

import { VOLUME_PROPERTIES_ID } from '../components/Chart/utils/chartConstants.js';

// ============================================================
// TYPES
// ============================================================

interface UseIndicatorPropertiesProps {
  // Daftar seluruh indikator yang aktif.
  indicators: IndicatorConfig[];

  // Fungsi untuk menyimpan perubahan konfigurasi indikator.
  onUpdateIndicators: (indicators: IndicatorConfig[]) => void;

  // Warna Volume yang digunakan sebagai fallback.
  volumeColorOverride: string | null;

  // Setter warna Volume.
  setVolumeColorOverride: Dispatch<SetStateAction<string | null>>;
}

// ============================================================
// HOOK: INDICATOR PROPERTIES
// Mengatur target indikator dan perubahan propertinya.
// ============================================================

export function useIndicatorProperties({
  indicators,
  onUpdateIndicators,
  volumeColorOverride,
  setVolumeColorOverride,
}: UseIndicatorPropertiesProps) {

  // ----------------------------------------------------------
  // 1. STATE TARGET PROPERTI
  // ----------------------------------------------------------

  const [subPropertiesTargetId, setSubPropertiesTargetId] =
    useState<string | null>(null);

  // ----------------------------------------------------------
  // 2. DETEKSI TARGET VOLUME
  // ----------------------------------------------------------

  const isVolumeProperties =
    subPropertiesTargetId === VOLUME_PROPERTIES_ID;

  // ----------------------------------------------------------
  // 3. CARI INDIKATOR YANG SEDANG DIEDIT
  // ----------------------------------------------------------

  const subPropertiesTarget = useMemo(() => {
    if (!subPropertiesTargetId) return null;

    // Khusus Volume, cari berdasarkan tipe indikator.
    if (isVolumeProperties) {
      return (
        indicators.find((indicator) => indicator.type === 'VOLUME') ?? null
      );
    }

    // Indikator lainnya dicari berdasarkan ID.
    return (
      indicators.find(
        (indicator) => indicator.id === subPropertiesTargetId,
      ) ?? null
    );
  }, [
    indicators,
    subPropertiesTargetId,
    isVolumeProperties,
  ]);

  // ----------------------------------------------------------
  // 4. SIAPKAN NILAI AWAL PROPERTI
  // ----------------------------------------------------------

  const subPropertiesInitialValues = useMemo((): IndicatorProperties => {

    // Jika target belum dipilih, gunakan nilai default.
    if (!subPropertiesTarget) {
      return {
        color: volumeColorOverride ?? '#26a69a',
      } as IndicatorProperties;
    }

    // Salin konfigurasi indikator.
    const initialValues = {
      ...subPropertiesTarget,
    };

    // Gunakan warna override jika target adalah Volume.
    if (isVolumeProperties && volumeColorOverride) {
      return {
        ...initialValues,
        color: volumeColorOverride,
      } as IndicatorProperties;
    }

    // Kembalikan konfigurasi awal indikator.
    return initialValues as IndicatorProperties;

  }, [
    subPropertiesTarget,
    isVolumeProperties,
    volumeColorOverride,
  ]);

  // ----------------------------------------------------------
  // 5. SIMPAN PERUBAHAN PROPERTI
  // ----------------------------------------------------------

  const handleSaveSubIndicatorProperties = useCallback(
    (properties: IndicatorProperties) => {

      // Pastikan ada target indikator yang dipilih.
      if (!subPropertiesTargetId) return;

      // ......................................................
      // A. KHUSUS VOLUME
      // ......................................................

      if (isVolumeProperties) {

        // Simpan warna Volume sebagai override.
        if (
          'color' in properties &&
          typeof properties.color === 'string'
        ) {
          setVolumeColorOverride(properties.color);
        }

        // Perbarui konfigurasi Volume.
        onUpdateIndicators(
          indicators.map((indicator) =>
            indicator.type === 'VOLUME'
              ? {
                  ...indicator,
                  ...properties,
                }
              : indicator,
          ),
        );

      } else {

        // ....................................................
        // B. INDIKATOR SELAIN VOLUME
        // ....................................................

        onUpdateIndicators(
          indicators.map((indicator) =>
            indicator.id === subPropertiesTargetId
              ? {
                  ...indicator,
                  ...properties,
                }
              : indicator,
          ),
        );
      }

      // ......................................................
      // C. TUTUP MODAL SETELAH PENYIMPANAN
      // ......................................................

      setSubPropertiesTargetId(null);
    },
    [
      subPropertiesTargetId,
      isVolumeProperties,
      indicators,
      onUpdateIndicators,
      setVolumeColorOverride,
    ],
  );

  // ----------------------------------------------------------
  // 6. KEMBALIKAN STATE DAN FUNGSI
  // ----------------------------------------------------------

  return {
    subPropertiesTargetId,
    setSubPropertiesTargetId,
    subPropertiesTarget,
    isVolumeProperties,
    subPropertiesInitialValues,
    handleSaveSubIndicatorProperties,
  };
}


import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import type {
  IndicatorConfig,
} from '../types/index.js';

import type {
  IndicatorProperties,
} from '../components/Indicators/IndicatorPropertiesModal.js';

import { VOLUME_PROPERTIES_ID } from '../components/Chart/utils/chartConstants.js';

interface UseIndicatorPropertiesProps {
  indicators: IndicatorConfig[];
  onUpdateIndicators: (indicators: IndicatorConfig[]) => void;
  volumeColorOverride: string | null;
  setVolumeColorOverride: Dispatch<SetStateAction<string | null>>;
}

export function useIndicatorProperties({
  indicators,
  onUpdateIndicators,
  volumeColorOverride,
  setVolumeColorOverride,
}: UseIndicatorPropertiesProps) {

  // Target properties yang sedang dibuka.
  const [subPropertiesTargetId, setSubPropertiesTargetId] =
    useState<string | null>(null);

  // Deteksi properties Volume.
  const isVolumeProperties =
    subPropertiesTargetId === VOLUME_PROPERTIES_ID;

  // Cari indikator yang sedang diedit.
  const subPropertiesTarget = useMemo(() => {
    if (!subPropertiesTargetId) return null;

    if (isVolumeProperties) {
      return (
        indicators.find(
          (indicator) => indicator.type === 'VOLUME',
        ) ?? null
      );
    }

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

  // Siapkan nilai awal properties.
  const subPropertiesInitialValues = useMemo(
    (): IndicatorProperties => {

      if (!subPropertiesTarget) {
        return {
          period: 14,
          color: volumeColorOverride ?? '#26a69a',
          strokeWidth: 2,
          stdDev: 2,
        };
      }

      const initialValues: IndicatorProperties = {
        period: subPropertiesTarget.period ?? 14,
        color: subPropertiesTarget.color ?? '#3b82f6',
        strokeWidth: subPropertiesTarget.strokeWidth ?? 2,
        stdDev: subPropertiesTarget.stdDev ?? 2,
      };

      // Pengaturan khusus Momentum Candle.
      if (subPropertiesTarget.type === 'MOMENTUM_CANDLE') {
        return {
          ...initialValues,

          momentumCandleMode:
            subPropertiesTarget.momentumCandleMode ??
            'CONSERVATIVE',

          maxWickPercent:
            subPropertiesTarget.maxWickPercent ?? 30,

          useConsolidationFilter:
            subPropertiesTarget.useConsolidationFilter ?? false,

          consolidationCount:
            subPropertiesTarget.consolidationCount ?? 3,

          useEmaFilter:
            subPropertiesTarget.useEmaFilter ?? false,

          emaTimeframe:
            subPropertiesTarget.emaTimeframe ?? 'M15',

          emaPeriod:
            subPropertiesTarget.emaPeriod ?? 50,
        };
      }

      // Volume menggunakan warna override jika tersedia.
      if (isVolumeProperties && volumeColorOverride) {
        return {
          ...initialValues,
          color: volumeColorOverride,
        };
      }

      return initialValues;
    },
    [
      subPropertiesTarget,
      isVolumeProperties,
      volumeColorOverride,
    ],
  );

  // Simpan perubahan properties.
  const handleSaveSubIndicatorProperties = useCallback(
    (properties: IndicatorProperties) => {

      if (!subPropertiesTargetId) return;

      // Khusus Volume.
      if (isVolumeProperties) {

        if (typeof properties.color === 'string') {
          setVolumeColorOverride(properties.color);
        }

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

        // Indikator lainnya, termasuk Momentum Candle.
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

      // Tutup modal setelah penyimpanan.
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

  return {
    subPropertiesTargetId,
    setSubPropertiesTargetId,
    subPropertiesTarget,
    isVolumeProperties,
    subPropertiesInitialValues,
    handleSaveSubIndicatorProperties,
  };
}

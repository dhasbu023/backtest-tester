
import type {
  FibonacciPropertiesSettings,
} from './FibonacciProperties.types.js';

export interface FibonacciLevel {
  id?: string;
  ratio: number;
  color: string;
  enabled?: boolean;
  visible?: boolean;
  label?: string;
}

export const INITIAL_DEFAULT_FIBONACCI_LEVELS: FibonacciLevel[] = [
  { id: 'fibo-0', ratio: 0, color: '#787b86', enabled: true, label: '0' },
  { id: 'fibo-0.236', ratio: 0.236, color: '#f23645', enabled: true, label: '0.236' },
  { id: 'fibo-0.382', ratio: 0.382, color: '#ff9800', enabled: true, label: '0.382' },
  { id: 'fibo-0.5', ratio: 0.5, color: '#4caf50', enabled: true, label: '0.5' },
  { id: 'fibo-0.618', ratio: 0.618, color: '#089981', enabled: true, label: '0.618' },
  { id: 'fibo-0.786', ratio: 0.786, color: '#00bcd4', enabled: true, label: '0.786' },
  { id: 'fibo-1', ratio: 1, color: '#787b86', enabled: true, label: '1' },
  { id: 'fibo-1.272', ratio: 1.272, color: '#2962ff', enabled: false, label: '1.272' },
  { id: 'fibo-1.618', ratio: 1.618, color: '#2962ff', enabled: false, label: '1.618' },
  { id: 'fibo-2.618', ratio: 2.618, color: '#9c27b0', enabled: false, label: '2.618' },
];

export const DEFAULT_FIBONACCI_LEVELS: FibonacciLevel[] =
  INITIAL_DEFAULT_FIBONACCI_LEVELS;

export const FIBONACCI_STORAGE_KEY = 'fibonacci_default_settings';

export const getSystemDefaultFibonacciSettings = (
  color = '#3b82f6',
  firstPrice = 0,
  secondPrice = 0,
): FibonacciPropertiesSettings => ({
  color,
  levels: INITIAL_DEFAULT_FIBONACCI_LEVELS.map((level) => ({
    id: level.id || `fibo-${level.ratio}`,
    ratio: level.ratio,
    color: level.color,
    enabled: level.enabled ?? true,
    label: level.label ?? String(level.ratio),
    labelPosition: 'right',
  })),
  lineWidth: 1,
  lineStyle: 'dashed',
  extendLeft: false,
  extendRight: true,
  showPrice: true,
  showRatio: true,
  showBackground: true,
  showLabels: true,
  labelPosition: 'right',
  firstPoint: { price: firstPrice },
  secondPoint: { price: secondPrice },
  visibleTimeframes: [
    'M1',
    'M5',
    'M15',
    'M30',
    'H1',
    'H4',
    'D1',
  ],
});

export const createDefaultFibonacciProperties =
  getSystemDefaultFibonacciSettings;

export function loadSavedFibonacciDefaults(): Partial<FibonacciPropertiesSettings> | null {
  try {
    const raw = localStorage.getItem(FIBONACCI_STORAGE_KEY);
    if (!raw) return null;

    return JSON.parse(raw) as Partial<FibonacciPropertiesSettings>;
  } catch {
    return null;
  }
}

export function saveFibonacciDefaults(
  settings: FibonacciPropertiesSettings,
): void {
  try {
    const defaultsToSave: Partial<FibonacciPropertiesSettings> = {
      color: settings.color,
      levels: settings.levels.map((level) => ({
        id: level.id,
        ratio: level.ratio,
        color: level.color,
        enabled: level.enabled,
        label:
          level.label !== undefined
            ? level.label
            : String(level.ratio),
        labelPosition: level.labelPosition ?? 'right',
      })),
      lineWidth: settings.lineWidth,
      lineStyle: settings.lineStyle,
      extendLeft: settings.extendLeft,
      extendRight: settings.extendRight,
      showPrice: settings.showPrice,
      showRatio: settings.showRatio,
      showBackground: settings.showBackground,
      showLabels: settings.showLabels,
      labelPosition: settings.labelPosition,
      visibleTimeframes: settings.visibleTimeframes,
    };

    localStorage.setItem(
      FIBONACCI_STORAGE_KEY,
      JSON.stringify(defaultsToSave),
    );
  } catch {
    // Abaikan jika localStorage tidak tersedia.
  }
}

export function resetFibonacciDefaults(): void {
  try {
    localStorage.removeItem(FIBONACCI_STORAGE_KEY);
  } catch {
    // Abaikan jika localStorage tidak tersedia.
  }
}

export function getActiveDefaultFibonacciSettings(
  fallbackColor = '#3b82f6',
  firstPrice = 0,
  secondPrice = 0,
): FibonacciPropertiesSettings {
  const system = getSystemDefaultFibonacciSettings(
    fallbackColor,
    firstPrice,
    secondPrice,
  );

  const saved = loadSavedFibonacciDefaults();

  if (!saved) {
    return system;
  }

  return {
    ...system,
    ...saved,

    showLabels: saved.showLabels ?? system.showLabels,
    labelPosition: saved.labelPosition ?? system.labelPosition,

    levels:
      Array.isArray(saved.levels) && saved.levels.length > 0
        ? saved.levels.map((level) => ({
            id: level.id || `fibo-${level.ratio}`,
            ratio: Number(level.ratio),
            color: level.color || system.color,
            enabled: level.enabled ?? true,
            label:
              level.label !== undefined
                ? level.label
                : String(level.ratio),
            labelPosition: level.labelPosition ?? 'right',
          }))
        : system.levels,

    firstPoint: { price: firstPrice },
    secondPoint: { price: secondPrice },
  };
}

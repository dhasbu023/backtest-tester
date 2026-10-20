
export const HORIZONTAL_LINE_DEFAULTS = {
  color: '#3b82f6',
  strokeWidth: 2,
  locked: false,
  visible: true,
} as const;

export const HORIZONTAL_LINE_STYLES = {
  solid: '',
  dashed: '8 4',
  dotted: '2 4',
} as const;

export type HorizontalLineStyle = keyof typeof HORIZONTAL_LINE_STYLES;

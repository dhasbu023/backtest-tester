
/**
 * Format nilai volume agar mudah dibaca.
 */
export function formatVolumeValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }

  return value.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });
}

/**
 * Format harga candle.
 */
export function formatPrice(price?: number): string {
  if (
    price === undefined ||
    price === null ||
    !Number.isFinite(price)
  ) {
    return '0.00';
  }

  return price.toFixed(price > 500 ? 2 : 4);
}

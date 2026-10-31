
import type { Time } from 'lightweight-charts';

/**
 * Mengubah waktu dari Lightweight Charts menjadi Unix timestamp
 * dalam satuan detik.
 *
 * Mendukung:
 * - Unix timestamp (number)
 * - Date string (string)
 * - BusinessDay (year, month, day)
 */
export function toUnixTimestamp(time: Time): number | null {
  if (typeof time === 'number') {
    return Number.isFinite(time) ? Math.floor(time) : null;
  }

  if (typeof time === 'string') {
    const parsed = Date.parse(`${time}T00:00:00Z`);

    return Number.isFinite(parsed)
      ? Math.floor(parsed / 1000)
      : null;
  }

  if (
    typeof time === 'object' &&
    time !== null &&
    'year' in time &&
    'month' in time &&
    'day' in time
  ) {
    const businessDay = time as {
      year: number;
      month: number;
      day: number;
    };

    return Math.floor(
      Date.UTC(
        businessDay.year,
        businessDay.month - 1,
        businessDay.day,
      ) / 1000,
    );
  }

  return null;
}

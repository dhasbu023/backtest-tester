import { TIMEZONE_OPTIONS, TimezoneOption } from '../types/index.js';

/**
 * Returns the TimezoneOption for an IANA identifier or default to Asia/Jakarta.
 */
export function getTimezoneOption(ianaId: string): TimezoneOption {
  const found = TIMEZONE_OPTIONS.find((t) => t.id === ianaId);
  return found || TIMEZONE_OPTIONS[1]; // default Asia/Jakarta
}

/**
 * Formats a UTC timestamp (seconds) into a localized string according to the given IANA timezone.
 */
export function formatInTimezone(
  timestampSec: number,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!timestampSec || isNaN(timestampSec)) return '-';
  try {
    const dt = new Date(timestampSec * 1000);
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };
    return new Intl.DateTimeFormat('en-GB', { ...defaultOptions, ...options }).format(dt).replace(',', '');
  } catch (err) {
    console.warn(`[Timezone] Error formatting ${timestampSec} in ${timeZone}:`, err);
    return new Date(timestampSec * 1000).toISOString();
  }
}

/**
 * Formats timestamp to concise date & time with timezone abbreviation (e.g. "01/07/2026 07:00 WIB").
 */
export function formatDateTimeWithTz(timestampSec: number, timeZone: string): string {
  const dateStr = formatInTimezone(timestampSec, timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const tzOpt = getTimezoneOption(timeZone);
  return `${dateStr} ${tzOpt.abbr}`;
}

/**
 * Formats time only (HH:mm).
 */
export function formatTimeOnly(timestampSec: number, timeZone: string): string {
  return formatInTimezone(timestampSec, timeZone, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats date only (YYYY-MM-DD or DD/MM/YYYY).
 */
export function formatDateOnly(timestampSec: number, timeZone: string): string {
  return formatInTimezone(timestampSec, timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Parses user-entered date & time in local timezone (e.g. "2026-07-01 14:30")
 * and converts to canonical UTC epoch timestamp in seconds.
 * Accurately handles DST for America/New_York and Europe/London.
 */
export function parseLocalDateTimeToUTC(input: string, timeZone: string): number | null {
  if (!input) return null;
  const clean = input.trim();

  // Pattern: YYYY-MM-DD HH:mm or YYYY.MM.DD HH:mm:ss
  const match = clean.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) {
    const directParsed = Date.parse(clean);
    return isNaN(directParsed) ? null : Math.floor(directParsed / 1000);
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const hour = match[4] ? parseInt(match[4], 10) : 0;
  const minute = match[5] ? parseInt(match[5], 10) : 0;
  const second = match[6] ? parseInt(match[6], 10) : 0;

  // Compute timezone offset at this date by asking Intl
  // Create an arbitrary UTC date close to the target
  const tempUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  
  try {
    // Format the tempUTC into target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(tempUTC);
    const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

    const tzYear = getPart('year');
    const tzMonth = getPart('month');
    const tzDay = getPart('day');
    let tzHour = getPart('hour');
    if (tzHour === 24) tzHour = 0;
    const tzMinute = getPart('minute');
    const tzSecond = getPart('second');

    // Difference in milliseconds between UTC and target timezone representation
    const localTimeAsUTC = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond);
    const offsetMs = localTimeAsUTC - tempUTC.getTime();

    // Actual UTC timestamp is user desired local time minus the offset
    const desiredLocalMs = Date.UTC(year, month - 1, day, hour, minute, second);
    const actualUTCMs = desiredLocalMs - offsetMs;

    return Math.floor(actualUTCMs / 1000);
  } catch {
    return Math.floor(tempUTC.getTime() / 1000);
  }
}

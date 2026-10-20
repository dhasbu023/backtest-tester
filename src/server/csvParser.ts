import { Candle, Timeframe } from '../types/index.js';

export interface ParsedCSVOutput {
  valid: boolean;
  symbol: string;
  detectedTimeframe: Timeframe;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  firstTimestamp?: number;
  lastTimestamp?: number;
  minPrice?: number;
  maxPrice?: number;
  candles: Candle[];
  sampleCandles: Candle[];
  error?: string;
}

/**
 * Parses MT5 timestamp format:
 * "2026.07.01   00:00" or "2026.07.01 00:00:00" or "2026-07-01 00:00" or combined date + time
 * Returns Unix timestamp in seconds (UTC).
 */
export function parseMT5Timestamp(rawTime: string): number | null {
  if (!rawTime) return null;
  const clean = rawTime.trim();

  // Pattern: YYYY.MM.DD or YYYY-MM-DD or DD/MM/YYYY optionally followed by spaces, then HH:mm or HH:mm:ss
  const match = clean.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const day = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const minute = match[5] ? parseInt(match[5], 10) : 0;
    const second = match[6] ? parseInt(match[6], 10) : 0;

    if (year >= 1970 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const dt = new Date(Date.UTC(year, month, day, hour, minute, second));
      return Math.floor(dt.getTime() / 1000);
    }
  }

  // Pattern: DD.MM.YYYY or DD/MM/YYYY optionally followed by spaces, then HH:mm or HH:mm:ss
  const euroMatch = clean.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (euroMatch) {
    const day = parseInt(euroMatch[1], 10);
    const month = parseInt(euroMatch[2], 10) - 1;
    const year = parseInt(euroMatch[3], 10);
    const hour = euroMatch[4] ? parseInt(euroMatch[4], 10) : 0;
    const minute = euroMatch[5] ? parseInt(euroMatch[5], 10) : 0;
    const second = euroMatch[6] ? parseInt(euroMatch[6], 10) : 0;

    if (year >= 1970 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const dt = new Date(Date.UTC(year, month, day, hour, minute, second));
      return Math.floor(dt.getTime() / 1000);
    }
  }

  // Fallback to Date.parse
  const isoParsed = Date.parse(clean.replace(/\./g, '-'));
  if (!isNaN(isoParsed)) {
    return Math.floor(isoParsed / 1000);
  }

  return null;
}

/**
 * Detects timeframe from consecutive timestamp intervals, ignoring weekend/market gaps.
 */
export function detectTimeframeFromIntervals(timestamps: number[]): Timeframe {
  if (timestamps.length < 2) return 'M1';

  const diffCounts: Record<number, number> = {};
  for (let i = 1; i < Math.min(timestamps.length, 3000); i++) {
    const diff = timestamps[i] - timestamps[i - 1];
    if (diff > 0 && diff <= 14400) {
      const candidates = [60, 300, 900, 1800, 3600, 14400, 86400];
      let nearest = 60;
      let minDelta = Infinity;
      for (const c of candidates) {
        const delta = Math.abs(diff - c);
        if (delta < minDelta) {
          minDelta = delta;
          nearest = c;
        }
      }
      diffCounts[nearest] = (diffCounts[nearest] || 0) + 1;
    }
  }

  let bestSeconds = 60;
  let maxCount = -1;
  for (const [secStr, count] of Object.entries(diffCounts)) {
    const sec = parseInt(secStr, 10);
    if (count > maxCount) {
      maxCount = count;
      bestSeconds = sec;
    }
  }

  switch (bestSeconds) {
    case 60:
      return 'M1';
    case 300:
      return 'M5';
    case 900:
      return 'M15';
    case 1800:
      return 'M30';
    case 3600:
      return 'H1';
    case 14400:
      return 'H4';
    case 86400:
      return 'D1';
    default:
      return 'M1';
  }
}

/**
 * Parses full MT5 CSV text or buffer supporting semicolon, comma, tab, and separate date/time columns.
 */
export function parseMT5CSV(
  csvContent: string,
  symbolOverride?: string,
  timeframeOverride?: Timeframe
): ParsedCSVOutput {
  let cleanContent = csvContent;
  if (cleanContent.charCodeAt(0) === 0xfeff) {
    cleanContent = cleanContent.slice(1);
  }

  const lines = cleanContent.split(/\r?\n/);
  if (lines.length < 2) {
    return {
      valid: false,
      symbol: symbolOverride || 'XAUUSD',
      detectedTimeframe: 'M1',
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 0,
      candles: [],
      sampleCandles: [],
      error: 'File CSV kosong atau tidak memiliki baris data.',
    };
  }

  // Detect delimiter and header row
  let headerIndex = -1;
  let delimiter = ';';

  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (lower.includes('open') || lower.includes('time') || lower.includes('date') || lower.includes('<open>')) {
      headerIndex = i;
      if (line.includes(';')) delimiter = ';';
      else if (line.includes(',')) delimiter = ',';
      else if (line.includes('\t')) delimiter = '\t';
      break;
    }
  }

  if (headerIndex === -1) {
    return {
      valid: false,
      symbol: symbolOverride || 'XAUUSD',
      detectedTimeframe: 'M1',
      totalRows: lines.length,
      validRows: 0,
      invalidRows: lines.length,
      duplicateRows: 0,
      candles: [],
      sampleCandles: [],
      error: 'Header CSV MT5 tidak ditemukan. Format harus memiliki kolom: Time (atau Date+Time), Open, High, Low, Close, Volume.',
    };
  }

  const headerCols = lines[headerIndex]
    .split(delimiter)
    .map((c) => c.trim().toLowerCase().replace(/[<>]/g, ''));

  // Locate columns
  const dateIdx = headerCols.findIndex((c) => c === 'date' || c === 'time' || c === 'timestamp');
  const timeIdx = headerCols.findIndex((c, idx) => idx !== dateIdx && (c === 'time' || c === 'hour'));
  const openIdx = headerCols.findIndex((c) => c === 'open' || c === 'o');
  const highIdx = headerCols.findIndex((c) => c === 'high' || c === 'h');
  const lowIdx = headerCols.findIndex((c) => c === 'low' || c === 'l');
  const closeIdx = headerCols.findIndex((c) => c === 'close' || c === 'c');
  const tickVolIdx = headerCols.findIndex((c) => c === 'tickvol' || c === 'tickvolume' || c === 'volume' || c === 'vol');
  const realVolIdx = headerCols.findIndex((c) => c === 'realvol' || c === 'realvolume');
  const spreadIdx = headerCols.findIndex((c) => c === 'spread');

  if (dateIdx === -1 || openIdx === -1 || highIdx === -1 || lowIdx === -1 || closeIdx === -1) {
    return {
      valid: false,
      symbol: symbolOverride || 'XAUUSD',
      detectedTimeframe: 'M1',
      totalRows: lines.length,
      validRows: 0,
      invalidRows: lines.length,
      duplicateRows: 0,
      candles: [],
      sampleCandles: [],
      error: `Kolom wajib tidak lengkap. Kolom ditemukan: ${headerCols.join(', ')}`,
    };
  }

  const candles: Candle[] = [];
  const seenTimestamps = new Set<number>();
  let totalDataRows = 0;
  let invalidRows = 0;
  let duplicateRows = 0;
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  const minRequiredCols = Math.max(dateIdx, timeIdx, openIdx, highIdx, lowIdx, closeIdx);

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    totalDataRows++;
    const parts = rawLine.split(delimiter);

    if (parts.length <= minRequiredCols) {
      invalidRows++;
      continue;
    }

    // Combine date and time if they are in separate columns
    let rawTimeStr = parts[dateIdx].trim();
    if (timeIdx !== -1 && parts[timeIdx]) {
      rawTimeStr = `${rawTimeStr} ${parts[timeIdx].trim()}`;
    }

    const timestamp = parseMT5Timestamp(rawTimeStr);
    if (!timestamp || isNaN(timestamp)) {
      invalidRows++;
      continue;
    }

    if (seenTimestamps.has(timestamp)) {
      duplicateRows++;
      continue;
    }

    const open = parseFloat(parts[openIdx].replace(',', '.'));
    const high = parseFloat(parts[highIdx].replace(',', '.'));
    const low = parseFloat(parts[lowIdx].replace(',', '.'));
    const close = parseFloat(parts[closeIdx].replace(',', '.'));
    const tickVolume = tickVolIdx !== -1 && parts[tickVolIdx] ? parseInt(parts[tickVolIdx], 10) || 0 : 0;
    const realVolume = realVolIdx !== -1 && parts[realVolIdx] ? parseInt(parts[realVolIdx], 10) || 0 : 0;
    const spread = spreadIdx !== -1 && parts[spreadIdx] ? parseFloat(parts[spreadIdx]) || 0 : 0;

    if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || open <= 0 || high <= 0 || low <= 0 || close <= 0) {
      invalidRows++;
      continue;
    }

    // Normalize OHLC in case high/low are strictly aligned
    const validHigh = Math.max(high, open, close);
    const validLow = Math.min(low, open, close);

    seenTimestamps.add(timestamp);
    minPrice = Math.min(minPrice, validLow);
    maxPrice = Math.max(maxPrice, validHigh);

    candles.push({
      timestamp: Math.floor(timestamp),
      open,
      high: validHigh,
      low: validLow,
      close,
      tickVolume,
      realVolume,
      spread,
    });
  }

  if (candles.length === 0) {
    return {
      valid: false,
      symbol: symbolOverride || 'XAUUSD',
      detectedTimeframe: 'M1',
      totalRows: totalDataRows,
      validRows: 0,
      invalidRows,
      duplicateRows,
      candles: [],
      sampleCandles: [],
      error: 'Tidak ditemukan baris candle yang valid dalam file CSV.',
    };
  }

  // Sort ascending strictly
  candles.sort((a, b) => a.timestamp - b.timestamp);

  const detectedTf = timeframeOverride || detectTimeframeFromIntervals(candles.map((c) => c.timestamp));

  return {
    valid: true,
    symbol: symbolOverride || 'XAUUSD',
    detectedTimeframe: detectedTf,
    totalRows: totalDataRows,
    validRows: candles.length,
    invalidRows,
    duplicateRows,
    firstTimestamp: candles[0].timestamp,
    lastTimestamp: candles[candles.length - 1].timestamp,
    minPrice: minPrice === Infinity ? undefined : minPrice,
    maxPrice: maxPrice === -Infinity ? undefined : maxPrice,
    candles,
    sampleCandles: candles.slice(0, 10).concat(candles.length > 10 ? candles.slice(-5) : []),
  };
}

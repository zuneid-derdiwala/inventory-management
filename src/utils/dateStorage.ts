/**
 * Calendar dates (inward/outward) for Postgres `timestamp with time zone`.
 * Avoids off-by-one bugs from mixing UTC midnight with local calendar days.
 */

/** Local midnight for the same calendar day as this instant in the user's timezone. */
export function normalizeToLocalCalendarDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Serialize a date picked in the UI for Supabase.
 * `date.toISOString()` shifts local midnight into the prior UTC day in positive offsets;
 * we store noon UTC on the selected local calendar day instead.
 */
export function serializeCalendarDateForSupabase(date: Date | undefined | null): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  return new Date(Date.UTC(y, m, d, 12, 0, 0, 0)).toISOString();
}

/**
 * Parse a timestamptz / ISO string from Postgres (or imports) into a local calendar Date (local midnight).
 */
export function parseSupabaseCalendarDate(value: string | null | undefined): Date | undefined {
  if (value == null || value === "") return undefined;
  const trimmed = value.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    const y = parseInt(dateOnly[1], 10);
    const mo = parseInt(dateOnly[2], 10) - 1;
    const d = parseInt(dateOnly[3], 10);
    const dt = new Date(y, mo, d);
    return Number.isNaN(dt.getTime()) ? undefined : dt;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return normalizeToLocalCalendarDate(parsed);
}

/**
 * Excel serial day number → local calendar Date (Excel counts UTC calendar days from 1899 epoch).
 */
export function excelSerialToLocalCalendarDate(excelDate: number): Date | undefined {
  if (typeof excelDate !== "number" || Number.isNaN(excelDate)) return undefined;
  const ms = Math.round((excelDate - 25569) * 86400 * 1000);
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Restore inward/outward dates from localStorage JSON (ISO string, timestamp, or Date).
 */
export function restoreCalendarDateFromStorage(value: unknown): Date | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "string") return parseSupabaseCalendarDate(value);
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : normalizeToLocalCalendarDate(d);
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : normalizeToLocalCalendarDate(value);
  }
  return undefined;
}

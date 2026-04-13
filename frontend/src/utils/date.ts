/**
 * Date utility functions for Thai Buddhist Era (B.E.) date formatting.
 * 
 * All dates stored as ISO 8601 strings.
 * All UI displays use Thai B.E. format (year + 543).
 * 
 * @example
 * ISO: "2024-04-12" → Display: "12/04/2567"
 */
const BE_OFFSET = 543;

/**
 * Formats ISO date to Thai B.E. date.
 * @param isoDate - ISO date string (YYYY-MM-DD or full ISO 8601)
 * @returns Thai B.E. formatted string (DD/MM/BBBB)
 */
export function formatThaiDate(isoDate: string): string {
  const d = new Date(isoDate);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const beYear = d.getFullYear() + BE_OFFSET;
  return `${day}/${month}/${beYear}`;
}

/**
 * Formats ISO datetime to Thai B.E. date with time.
 * @param isoDate - Full ISO datetime string
 * @returns Thai B.E. formatted datetime string (DD/MM/BBBB HH:mm)
 */
export function formatThaiDateTime(isoDate: string): string {
  const d = new Date(isoDate);
  const date = formatThaiDate(isoDate);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${date} ${hours}:${minutes}`;
}

/**
 * Converts Date object to ISO date string.
 * @param date - JavaScript Date object
 * @returns ISO date string (YYYY-MM-DD)
 */
export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns Date object for N days ago.
 * @param days - Number of days in the past
 * @returns Date at start of day
 */
export function getDaysAgoDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

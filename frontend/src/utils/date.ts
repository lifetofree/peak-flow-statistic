/**
 * Date utility functions for date formatting.
 * 
 * All dates stored as ISO 8601 strings.
 * All UI displays use dd/mm/yyyy format with ISO year.
 * 
 * @example
 * ISO: "2024-04-12" → Display: "12/04/2024"
 */

/**
 * Formats ISO date to dd/mm/yyyy format.
 * @param isoDate - ISO date string (YYYY-MM-DD or full ISO 8601)
 * @returns Formatted string (DD/MM/YYYY)
 */
export function formatThaiDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('T')[0].split('-').map(Number);
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
}

/**
 * Formats ISO datetime to date with time.
 * @param isoDate - Full ISO datetime string
 * @returns Formatted datetime string (DD/MM/YYYY HH:mm)
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

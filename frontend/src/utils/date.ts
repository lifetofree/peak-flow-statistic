const BE_OFFSET = 543;

export function formatThaiDate(isoDate: string): string {
  const d = new Date(isoDate);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const beYear = d.getFullYear() + BE_OFFSET;
  return `${day}/${month}/${beYear}`;
}

export function formatThaiDateTime(isoDate: string): string {
  const d = new Date(isoDate);
  const date = formatThaiDate(isoDate);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${date} ${hours}:${minutes}`;
}

export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysAgoDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

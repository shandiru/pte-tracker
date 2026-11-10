/**
 * Client date utilities with Asia/Colombo timezone support and YYYY-MM-DD operations.
 */

export function getTodayColombo(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const colomboTime = new Date(utc + (330 * 60000));
    return colomboTime.toISOString().slice(0, 10);
  }
}

export function formatReadableDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(dateA: string, dateB: string): number {
  const partsA = dateA.split('-').map(Number);
  const partsB = dateB.split('-').map(Number);
  const utcA = Date.UTC(partsA[0], partsA[1] - 1, partsA[2]);
  const utcB = Date.UTC(partsB[0], partsB[1] - 1, partsB[2]);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((utcB - utcA) / msPerDay);
}

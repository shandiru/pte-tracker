/**
 * Date utilities for Asia/Colombo timezone and YYYY-MM-DD operations.
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
    // Offset for Asia/Colombo is +05:30 = 330 minutes
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const colomboTime = new Date(utc + (330 * 60000));
    return colomboTime.toISOString().slice(0, 10);
  }
}

export function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1] - 1;
  const day = parts[2];
  const d = new Date(Date.UTC(year, month, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(dateA: string, dateB: string): number {
  const partsA = dateA.split('-').map(Number);
  const partsB = dateB.split('-').map(Number);
  const utcA = Date.UTC(partsA[0], partsA[1] - 1, partsA[2]);
  const utcB = Date.UTC(partsB[0], partsB[1] - 1, partsB[2]);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((utcB - utcA) / msPerDay);
}

export function isValidDateFormat(str: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  return true;
}

export function getTodayColombo() {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    return formatter.format(/* @__PURE__ */ new Date());
  } catch {
    const now = /* @__PURE__ */ new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 6e4;
    const colomboTime = new Date(utc + 330 * 6e4);
    return colomboTime.toISOString().slice(0, 10);
  }
}
export function formatReadableDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}
export function formatShortDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC"
  }).format(date);
}
export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function daysBetween(dateA, dateB) {
  const partsA = dateA.split("-").map(Number);
  const partsB = dateB.split("-").map(Number);
  const utcA = Date.UTC(partsA[0], partsA[1] - 1, partsA[2]);
  const utcB = Date.UTC(partsB[0], partsB[1] - 1, partsB[2]);
  const msPerDay = 1e3 * 60 * 60 * 24;
  return Math.round((utcB - utcA) / msPerDay);
}

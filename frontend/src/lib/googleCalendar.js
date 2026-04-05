/**
 * Opens Google Calendar compose with a prefilled event (no OAuth).
 * Dates: YYYYMMDD for all-day; end date is exclusive per Google.
 */

function padDateParts(y, m, d) {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}${mm}${dd}`;
}

/** @param {string} isoDate 'YYYY-MM-DD' */
export function googleCalendarUrl({ title, details, isoDate }) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const start = padDateParts(y, m, d);
  const end = new Date(y, m - 1, d + 1);
  const endStr = padDateParts(end.getFullYear(), end.getMonth() + 1, end.getDate());
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: details || "",
    dates: `${start}/${endStr}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** UTC compact form for Google Calendar timed events: YYYYMMDDTHHmmssZ */
function toGcalUtc(dt) {
  return new Date(dt).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Timed event (default 1 hour). Pass ISO start string from the server.
 * @param {{ title: string, details?: string, startIso: string, durationMinutes?: number }} opts
 */
export function googleCalendarTimedEventUrl({
  title,
  details = "",
  startIso,
  durationMinutes = 60,
}) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details,
    dates: `${toGcalUtc(start)}/${toGcalUtc(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

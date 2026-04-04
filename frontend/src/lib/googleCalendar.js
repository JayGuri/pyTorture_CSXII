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

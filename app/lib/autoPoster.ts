// Helpers for the automatic event poster (app/api/poster/route.tsx).

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Band photos the automatic posters rotate through (files in assets/poster).
export const AUTO_POSTER_PHOTOS = ["live-band.jpg", "live-sparks.jpg", "live-stage-blue.jpg", "live-hands.jpg"];

/** "2026-12-19" → "Saturday 19 December 2026". Empty string for anything else. */
export function posterDateLine(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return "";
  const [year, month, day] = match.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${DAYS[weekday]} ${day} ${MONTHS[month - 1]} ${year}`;
}

/** The same show always gets the same photo; different shows spread across the set. */
export function posterPhotoFor(key: string): string {
  let hash = 0x811c9dc5; // FNV-1a
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  return AUTO_POSTER_PHOTOS[hash % AUTO_POSTER_PHOTOS.length];
}

/** URL of the automatic poster for a show. */
export function autoPosterUrl(datetime: string, venueName: string, city: string): string {
  const params = new URLSearchParams({ date: datetime.split("T")[0], venue: venueName, city });
  return `/api/poster?${params.toString()}`;
}

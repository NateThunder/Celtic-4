// Server-side fetch of Celtic Worship's upcoming events from the Bandsintown
// REST API. We render our own UI from this data instead of Bandsintown's
// embedded widget, so we control styling, date formatting, and artwork.

const ARTIST_ID = "id_849462";
const DEFAULT_APP_ID = "js_celticworship.co.uk";

// Our own poster artwork keyed to specific events. The API returns venues and
// ticket links but not our flyers, so we map posters by venue/city. Any event
// without a match falls back to FALLBACK_POSTER.
const FALLBACK_POSTER = "/posters/then-sings-my-soul-st-lukes.jpg";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export type HomeEvent = {
  id: string;
  /** Pre-formatted, e.g. "07 Aug 2026". No time, no "(local)", no ISO. */
  dateLabel: string;
  venueName: string;
  city: string;
  ticketUrl: string | null;
  poster: string;
};

type RawOffer = { type?: string; url?: string };
type RawVenue = { name?: string; city?: string };
type RawEvent = {
  id?: string | number;
  datetime?: string;
  url?: string;
  venue?: RawVenue;
  offers?: RawOffer[];
};

// Map an event's venue/city to one of our poster flyers.
function posterFor(venueName: string, city: string): string {
  const v = venueName.toLowerCase();
  const c = city.toLowerCase();

  if (v.includes("luke")) return "/posters/then-sings-my-soul-st-lukes.jpg";
  if (v.includes("charlotte chapel")) {
    return "/posters/then-sings-my-soul-charlotte-chapel.jpg";
  }
  // Big Church Festival is held near Wiston House, Steyning.
  if (v.includes("big church") || v.includes("wiston") || c.includes("steyning")) {
    return "/posters/big-church-day-out.jpg";
  }
  if (v.includes("o2 academy")) return "/posters/o-holy-night.jpg";

  return FALLBACK_POSTER;
}

// Format an ISO datetime as "07 Aug 2026". We parse the date parts directly
// rather than via `new Date()` so the displayed day never shifts with the
// server timezone.
function formatDate(datetime: string): string {
  const datePart = datetime.split("T")[0];
  const [year, month, day] = datePart.split("-").map((n) => Number.parseInt(n, 10));
  if (!year || !month || !day || month < 1 || month > 12) return "";
  return `${String(day).padStart(2, "0")} ${MONTHS[month - 1]} ${year}`;
}

// Prefer a real ticket offer URL; fall back to the event page URL.
function ticketUrlFor(event: RawEvent): string | null {
  if (Array.isArray(event.offers)) {
    const offer = event.offers.find(
      (o) => typeof o?.url === "string" && o.url.trim().length > 0
    );
    if (offer?.url) return offer.url;
  }
  if (typeof event.url === "string" && event.url.trim().length > 0) {
    return event.url;
  }
  return null;
}

function normalize(event: RawEvent): HomeEvent | null {
  if (!event || event.datetime == null || event.id == null) return null;

  const dateLabel = formatDate(String(event.datetime));
  if (!dateLabel) return null;

  const venueName = event.venue?.name?.trim() || "Venue to be announced";
  const city = event.venue?.city?.trim() || "";

  return {
    id: String(event.id),
    dateLabel,
    venueName,
    city,
    ticketUrl: ticketUrlFor(event),
    poster: posterFor(venueName, city),
  };
}

// Fetch upcoming events. On any failure (network, bad status, malformed body)
// we return an empty array so the caller can render nothing rather than break
// the page.
export async function getUpcomingEvents(): Promise<HomeEvent[]> {
  const appId =
    process.env.NEXT_PUBLIC_BANDSINTOWN_APP_ID?.trim() || DEFAULT_APP_ID;
  const url = `https://rest.bandsintown.com/artists/${ARTIST_ID}/events?app_id=${encodeURIComponent(
    appId
  )}`;

  try {
    // Revalidate hourly — event listings change rarely.
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];

    return (data as RawEvent[])
      .map(normalize)
      .filter((e): e is HomeEvent => e !== null);
  } catch {
    return [];
  }
}

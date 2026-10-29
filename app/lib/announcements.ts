// Site-wide announcement popup.
//
// To run a new announcement, add an entry below with its own unique `id` and
// start/end dates. The popup shows the first announcement whose window includes
// today, on every page load. Remove or expire old entries when done.

export type AnnouncementLink = {
  label: string;
  href: string;
};

export type AnnouncementRelease = {
  eyebrowBefore: string;
  eyebrowAfter: string;
  /** ISO date the release goes out. Before it the button says `before.label`, after it `after.label`. */
  releaseDate: string;
  title: string;
  /** How the outline title breaks over two lines, e.g. ["Come", "Behold"]. */
  titleLines: [string, string];
  subtitle: string;
  listHeading?: string;
  list?: { title: string; detail?: string }[];
  before: AnnouncementLink;
  after: AnnouncementLink;
  /** Streaming services on the pre-save page, shown as a stack of icons beside the button. */
  platforms?: { name: string; icon: string }[];
  nextLabel?: string;
  /** Small line above the next-step label, e.g. "Next · 17 December". */
  nextKicker?: string;
};

export type AnnouncementMontageItem = {
  src: string;
  kind?: "image" | "video";
  /** CSS object-position, e.g. "50% 20%". */
  position?: string;
  /** Extra zoom for stills, e.g. 1.4. */
  zoom?: number;
};

export type AnnouncementVenue = {
  board: string;
  /** The board cropped to its lettering, used by the "bigSign" layout. */
  boardTight?: string;
  /** classic: full-width sign; bigSign: larger, tighter sign; wideDoor: slimmer banners, wider doorway. */
  layout?: "classic" | "bigSign" | "wideDoor";
  bannerLeft: string;
  bannerRight: string;
  /** Full banner design scaled into a taller, slimmer panel, for the "wideDoor" layout. */
  bannerLeftSlim?: string;
  bannerRightSlim?: string;
  /** Wall texture that repeats behind the pieces. */
  wall: string;
  /** Optional colour laid over the wall tiles, e.g. { color: "#1b2238", mode: "multiply", opacity: 0.85 }. */
  tint?: { color: string; mode?: "multiply" | "color" | "overlay" | "soft-light"; opacity?: number };
  alt: string;
};

export type AnnouncementEvent = {
  eyebrow: string;
  title: string;
  titleLines: [string, string];
  /** ISO date-time of the event, used for the countdown. */
  date: string;
  details: string[];
  artLabel: string;
  artTitle: string;
  /** Photos or short muted clips that cycle behind the concert step, with glitch cuts. */
  montage?: AnnouncementMontageItem[];
  /** The venue's front, rebuilt as an archway around the montage: letterboard on top, banners down the sides. */
  venue?: AnnouncementVenue;
  tickets: AnnouncementLink;
  signupHeading?: string;
};

export type Announcement = {
  id: string;
  startsAt: string;
  endsAt: string;
  image: { src: string; alt: string };
  release: AnnouncementRelease;
  event?: AnnouncementEvent;
  bar?: { text: string; link: AnnouncementLink };
};

export const announcements: Announcement[] = [
  {
    id: "come-behold-deluxe-o2-2026",
    startsAt: "2026-10-29T00:00:00Z",
    endsAt: "2026-12-18T00:00:00Z",
    image: {
      src: "/announcements/come-behold-deluxe.jpg",
      alt: "Come Behold Deluxe Edition album artwork",
    },
    release: {
      eyebrowBefore: "Deluxe Edition · Out 30 October",
      eyebrowAfter: "Deluxe Edition · Out now",
      releaseDate: "2026-10-30T00:00:00Z",
      title: "Come Behold",
      titleLines: ["Come", "Behold"],
      subtitle: "Christmas Collaborations · Deluxe",
      listHeading: "New songs on the Deluxe",
      list: [
        { title: "Silent Night", detail: "(Instrumental)" },
        { title: "Prince of Peace", detail: "(feat. Zerua)" },
        { title: "Come Thou Long Expected Jesus" },
      ],
      before: { label: "Pre-save now", href: "https://found.ee/ComeBeholdDeluxe" },
      after: { label: "Listen now", href: "https://found.ee/ComeBeholdDeluxe" },
      platforms: [
        { name: "Spotify", icon: "/announcements/stream-spotify.png" },
        { name: "Apple Music", icon: "/announcements/stream-apple.png" },
        { name: "Amazon Music", icon: "/announcements/stream-amazon.png" },
        { name: "Deezer", icon: "/announcements/stream-deezer.png" },
        { name: "Tidal", icon: "/announcements/stream-tidal.png" },
      ],
      nextLabel: "Hear it live at the O2",
      nextKicker: "Next · 17 December",
    },
    event: {
      eyebrow: "Live · Thu 17 December · 7pm",
      title: "O Holy Night",
      titleLines: ["O Holy", "Night"],
      date: "2026-12-17T19:00:00Z",
      details: ["O2 Academy Glasgow", "Celtic Worship with Zerua Music"],
      artLabel: "Live on stage",
      artTitle: "O2 Academy Glasgow",
      // Photos from the St Luke's Celtic Worship & Zerua night.
      montage: [
        { src: "/announcements/live-choir-stage.jpg", position: "45% 50%" },
        { src: "/announcements/live-drums.jpg", position: "45% 55%" },
        { src: "/announcements/live-choir.jpg", position: "60% 45%" },
        { src: "/announcements/live-fiddle.jpg", position: "62% 40%" },
        { src: "/announcements/live-guitar.jpg", position: "42% 40%" },
        { src: "/announcements/live-band.jpg", position: "55% 55%" },
        { src: "/announcements/live-o-night.jpg", position: "40% 50%" },
        { src: "/announcements/live-crowd.jpg", position: "50% 60%" },
      ],
      venue: {
        board: "/announcements/o2-board.jpg",
        boardTight: "/announcements/o2-board-tight.jpg",
        layout: "bigSign",
        bannerLeft: "/announcements/o2-banner-left.jpg",
        bannerRight: "/announcements/o2-banner-right.jpg",
        bannerLeftSlim: "/announcements/o2-banner-left-slim.jpg",
        bannerRightSlim: "/announcements/o2-banner-right-slim.jpg",
        wall: "/announcements/o2-wall.jpg",
        tint: { color: "#1c2846", mode: "multiply", opacity: 0.93 },
        alt: "The O2 Academy Glasgow front: letterboard reading Thursday 17th December, Celtic Worship & Zerua Music",
      },
      tickets: {
        label: "Get tickets",
        href: "https://www.ticketmaster.co.uk/celtic-worship-glasgow-17-12-2026/event/3E0064B6C3704E18",
      },
      signupHeading: "Join the list",
    },
    bar: {
      text: "O Holy Night · O2 Academy Glasgow · 17 Dec",
      link: {
        label: "Tickets",
        href: "https://www.ticketmaster.co.uk/celtic-worship-glasgow-17-12-2026/event/3E0064B6C3704E18",
      },
    },
  },
];

export function getActiveAnnouncement(now: Date = new Date()): Announcement | null {
  const time = now.getTime();
  return (
    announcements.find(
      (item) => time >= Date.parse(item.startsAt) && time < Date.parse(item.endsAt),
    ) ?? null
  );
}

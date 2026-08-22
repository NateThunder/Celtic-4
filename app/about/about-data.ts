export const ABOUT_PHOTOS = "/photos/about";

export type HeroFrame = {
  src: string;
  /** CSS object-position for this crop. */
  position: string;
};

export type Member = {
  name: string;
  instrument: string;
  signature: string;
  frames: HeroFrame[];
};

export type TimelineMilestone = {
  dateLabel: string;
  dateTime: string;
  title: string;
  description: string;
  markerIcon: string;
  markerScale?: number;
  markerOffsetY?: string;
  image?: {
    src: string;
    alt: string;
    kind: "cover" | "photo";
    fit?: "cover" | "contain";
    href?: string;
  };
  portrait?: "naomi-chris" | "david-mhairi";
};

export const TIMELINE_MILESTONES: TimelineMilestone[] = [
  {
    dateLabel: "Late 2016",
    dateTime: "2016",
    title: "Formation",
    markerIcon: "/instrument/Acoustic%20Guitar.png",
    image: {
      src: "/photos/band%20field.png",
      alt: "Celtic Worship band standing together in a field",
      kind: "photo",
    },
    description:
      "Celtic Worship first came together to prepare for a live worship event during Glasgow’s Celtic Connections festival. The project was originally intended to be a one-off collaboration.",
  },
  {
    dateLabel: "2017",
    dateTime: "2017",
    title: "First Performance",
    markerIcon: "/instrument/Drums.png",
    description:
      "The group performed their first live set during the festival. The response to the collaboration encouraged them to continue beyond the original event, establishing Celtic Worship as an ongoing collective.",
    image: {
      src: "/photos/crowd-bw.jpg",
      alt: "Crowd gathered at a Celtic Worship event",
      kind: "photo",
      fit: "contain",
    },
  },
  {
    dateLabel: "March 2019",
    dateTime: "2019-03",
    title: "Homeward",
    markerIcon: "/instrument/Bag%20Pipes.png",
    description:
      "Celtic Worship released their debut studio album, Homeward. The record established their distinctive sound, bringing traditional Scottish instrumentation such as fiddle and bagpipes into contemporary Christian worship and reimagining well-known hymns and worship songs.",
    image: {
      src: "/HOMEWARD.jpeg",
      alt: "Homeward album artwork",
      kind: "cover",
      href: "/music#homeward",
    },
  },
  {
    dateLabel: "January 2021",
    dateTime: "2021-01",
    title: "Growing International Audience",
    markerIcon: "/instrument/Whistle.png",
    image: {
      src: "/photos/Band%20orchestra.png",
      alt: "Celtic Worship performing with an orchestra",
      kind: "photo",
    },
    description:
      "Their Scottish folk-inspired arrangement of In Christ Alone gained significant attention online, introducing Celtic Worship to a much wider international audience and becoming one of the group's best-known performances.",
  },
  {
    dateLabel: "2021",
    dateTime: "2021",
    title: "Morningtide",
    markerIcon: "/instrument/Fiddle.png",
    description:
      "Celtic Worship released their second studio album, Morningtide. Songs shaped by dawn, hope and stillness carried the collective's Scottish folk sound into a quieter, prayerful record centred on the nearness of Christ.",
    image: {
      src: "/MORNINGTIDE.webp",
      alt: "Morningtide album artwork",
      kind: "cover",
      href: "/music#morningtide",
    },
  },
  {
    dateLabel: "Late 2022",
    dateTime: "2022",
    title: "Come Behold: Christmas Collaborations",
    markerIcon: "/instrument/Bass%20Guitar.png",
    description:
      "The group released Come Behold: Christmas Collaborations, expanding their sound through a series of collaborations with musicians from across the folk and roots music world.",
    image: {
      src: "/COME%20BEHOLD.webp",
      alt: "Come Behold: Christmas Collaborations album artwork",
      kind: "cover",
      href: "/music#come-behold",
    },
  },
  {
    dateLabel: "Late 2025",
    dateTime: "2025",
    title: "Harvest",
    markerIcon: "/instrument/Studio.png",
    description:
      "Celtic Worship released their fourth studio album, Harvest. Written and recorded at a farm in Morayshire, the album drew heavily on biblical imagery surrounding land, cultivation, seasons and harvest. This period also marked another step in the group's international development and representation.",
    image: {
      src: "/Harvest.webp",
      alt: "Harvest album artwork",
      kind: "cover",
      href: "/music#harvest",
    },
  },
  {
    dateLabel: "17 December 2026",
    dateTime: "2026-12-17",
    title: "Glasgow Homecoming",
    markerIcon: "/instrument/ChatGPT%20Image%20Aug%2021%2C%202026%2C%2011_44_41%20AM.png",
    description:
      "Celtic Worship are scheduled to headline a major homecoming concert at the O2 Academy Glasgow, marking one of the largest headline performances in the group's journey so far.",
    image: {
      src: "/photos/band%20sitting.png",
      alt: "Celtic Worship band sitting together",
      kind: "photo",
    },
  },
];

/** The collective, in hero-strip and roster order (left to right). */
export const MEMBERS: Member[] = [
  {
    name: "Naomi Stirrat",
    instrument: "Vocals & Guitar",
    signature: "/signatures/naomi.png",
    frames: [
      { src: `${ABOUT_PHOTOS}/hero/naomi-stirrat-01.jpg`, position: "52% 28%" },
      { src: `${ABOUT_PHOTOS}/hero/naomi-stirrat-02.jpg`, position: "48% 26%" },
      { src: `${ABOUT_PHOTOS}/hero/naomi-stirrat-03.jpg`, position: "48% 26%" },
    ],
  },
  {
    name: "David Hogg",
    instrument: "Vocals & Guitar",
    signature: "/signatures/david.png",
    frames: [
      { src: `${ABOUT_PHOTOS}/hero/david-hogg-01.jpg`, position: "34% 22%" },
      { src: `${ABOUT_PHOTOS}/hero/david-hogg-02.jpg`, position: "52% 24%" },
      { src: `${ABOUT_PHOTOS}/hero/david-hogg-03.jpg`, position: "60% 24%" },
    ],
  },
  {
    name: "Chris Amer",
    instrument: "Guitars",
    signature: "/signatures/chris.png",
    frames: [
      { src: `${ABOUT_PHOTOS}/hero/chris-amer-01.jpg`, position: "44% 26%" },
      { src: `${ABOUT_PHOTOS}/hero/chris-amer-02.jpg`, position: "52% 26%" },
      { src: `${ABOUT_PHOTOS}/hero/chris-amer-03.jpg`, position: "58% 22%" },
    ],
  },
  {
    name: "Mhairi Marwick",
    instrument: "Fiddle",
    signature: "/signatures/Mhairi.png",
    frames: [
      { src: `${ABOUT_PHOTOS}/hero/mhairi-marwick-01.jpg`, position: "31% 28%" },
      { src: `${ABOUT_PHOTOS}/hero/mhairi-marwick-02.jpg`, position: "50% 34%" },
      { src: `${ABOUT_PHOTOS}/hero/mhairi-marwick-03.jpg`, position: "50% 26%" },
    ],
  },
  {
    name: "Gus Stirrat",
    instrument: "Bass",
    signature: "/signatures/gus.png",
    frames: [
      { src: `${ABOUT_PHOTOS}/hero/gus-stirrat-01.jpg`, position: "54% 26%" },
      { src: `${ABOUT_PHOTOS}/hero/gus-stirrat-02.jpg`, position: "40% 10%" },
      { src: `${ABOUT_PHOTOS}/hero/gus-stirrat-03.jpg`, position: "40% 18%" },
      { src: `${ABOUT_PHOTOS}/hero/gus-stirrat-04.jpg`, position: "54% 30%" },
    ],
  },
  {
    name: "Ifedade Thomas",
    instrument: "Drums",
    signature: "/signatures/dade.png",
    frames: [
      { src: `${ABOUT_PHOTOS}/hero/ifedade-thomas-01.jpg`, position: "50% 22%" },
      { src: `${ABOUT_PHOTOS}/hero/ifedade-thomas-02.jpg`, position: "62% 12%" },
      { src: `${ABOUT_PHOTOS}/hero/ifedade-thomas-03.jpg`, position: "70% 30%" },
    ],
  },
];

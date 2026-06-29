export type ResourceType = "Chord Chart" | "Chords & Lyrics" | "Lead & Piano" | "Full Pack";

export type ResourceFilter = "All" | ResourceType;

export type ResourceProductLink = {
  productId: number;
  label: string;
  price: string;
  productUrl: string;
  addToCartUrl: string;
  downloadType: "Downloadable PDF" | "Downloadable Pack";
};

export type SongResource = {
  id: string;
  songTitle: string;
  artist: string;
  album: string;
  year: string;
  albumDescription: string;
  keys: string[];
  resourceTypes: Exclude<ResourceType, "Full Pack">[];
  products: Record<Exclude<ResourceType, "Full Pack">, ResourceProductLink>;
  imageUrl: string;
  previewPdfImageUrl: string;
};

export type AlbumResourcePack = {
  id: string;
  title: string;
  artist: string;
  year: string;
  description: string;
  songCount: number;
  keys: string[];
  resourceTypes: ResourceType[];
  products: Partial<Record<ResourceType, ResourceProductLink>>;
  imageUrl: string;
  songTitles: string[];
};

export const RESOURCE_FILTERS: ResourceFilter[] = [
  "All",
  "Chord Chart",
  "Chords & Lyrics",
  "Lead & Piano",
  "Full Pack",
];

const RESOURCE_PRICE = "\u00a32.87";

function createProduct(
  productId: number,
  label: string,
  price = RESOURCE_PRICE,
  downloadType: ResourceProductLink["downloadType"] = "Downloadable PDF",
): ResourceProductLink {
  return {
    productId,
    label,
    price,
    productUrl: `/shop/${productId}`,
    addToCartUrl: `/cart/?add-to-cart=${productId}`,
    downloadType,
  };
}

function createSongProducts(baseId: number, songTitle: string): SongResource["products"] {
  return {
    "Chord Chart": createProduct(baseId, `${songTitle} Chord Chart`),
    "Chords & Lyrics": createProduct(baseId + 1, `${songTitle} Chords & Lyrics PDF`),
    "Lead & Piano": createProduct(baseId + 2, `${songTitle} Lead & Piano PDF`),
  };
}

export const MORNINGTIDE_ALBUM = {
  title: "Morningtide",
  year: "2021",
  artist: "Celtic Worship",
  imageUrl: "/MORNINGTIDE.webp",
  description: "Songs of dawn, hope, and stillness, drawing the heart toward prayer and the nearness of Christ.",
};

export const SONG_RESOURCES: SongResource[] = [
  {
    id: "come-thou-fount",
    songTitle: "Come Thou Fount",
    artist: MORNINGTIDE_ALBUM.artist,
    album: MORNINGTIDE_ALBUM.title,
    year: MORNINGTIDE_ALBUM.year,
    albumDescription: MORNINGTIDE_ALBUM.description,
    keys: ["A", "Bb", "C", "D", "Eb", "F", "G"],
    resourceTypes: ["Chord Chart", "Chords & Lyrics", "Lead & Piano"],
    products: createSongProducts(90101, "Come Thou Fount"),
    imageUrl: MORNINGTIDE_ALBUM.imageUrl,
    previewPdfImageUrl: "",
  },
  {
    id: "how-deep-the-fathers-love-for-us",
    songTitle: "How Deep The Father's Love For Us",
    artist: MORNINGTIDE_ALBUM.artist,
    album: MORNINGTIDE_ALBUM.title,
    year: MORNINGTIDE_ALBUM.year,
    albumDescription: MORNINGTIDE_ALBUM.description,
    keys: ["Eb", "F", "Gb", "G", "Ab", "Bb"],
    resourceTypes: ["Chord Chart", "Chords & Lyrics", "Lead & Piano"],
    products: createSongProducts(90111, "How Deep The Father's Love For Us"),
    imageUrl: MORNINGTIDE_ALBUM.imageUrl,
    previewPdfImageUrl: "",
  },
  {
    id: "blessed-assurance",
    songTitle: "Blessed Assurance",
    artist: MORNINGTIDE_ALBUM.artist,
    album: MORNINGTIDE_ALBUM.title,
    year: MORNINGTIDE_ALBUM.year,
    albumDescription: MORNINGTIDE_ALBUM.description,
    keys: ["A", "Bb", "C", "Db", "D", "Eb"],
    resourceTypes: ["Chord Chart", "Chords & Lyrics", "Lead & Piano"],
    products: createSongProducts(90121, "Blessed Assurance"),
    imageUrl: MORNINGTIDE_ALBUM.imageUrl,
    previewPdfImageUrl: "",
  },
  {
    id: "old-100th",
    songTitle: "Old 100th",
    artist: MORNINGTIDE_ALBUM.artist,
    album: MORNINGTIDE_ALBUM.title,
    year: MORNINGTIDE_ALBUM.year,
    albumDescription: MORNINGTIDE_ALBUM.description,
    keys: ["D", "Eb", "E", "F", "G"],
    resourceTypes: ["Chord Chart", "Chords & Lyrics", "Lead & Piano"],
    products: createSongProducts(90131, "Old 100th"),
    imageUrl: MORNINGTIDE_ALBUM.imageUrl,
    previewPdfImageUrl: "",
  },
  {
    id: "i-trust-in-jesus",
    songTitle: "I Trust In Jesus",
    artist: MORNINGTIDE_ALBUM.artist,
    album: MORNINGTIDE_ALBUM.title,
    year: MORNINGTIDE_ALBUM.year,
    albumDescription: MORNINGTIDE_ALBUM.description,
    keys: ["E", "F", "F#", "G", "Ab", "A"],
    resourceTypes: ["Chord Chart", "Chords & Lyrics", "Lead & Piano"],
    products: createSongProducts(90141, "I Trust In Jesus"),
    imageUrl: MORNINGTIDE_ALBUM.imageUrl,
    previewPdfImageUrl: "",
  },
];

export const ALBUM_RESOURCE_PACKS: AlbumResourcePack[] = [
  {
    id: "harvest",
    title: "Harvest",
    artist: "Celtic Worship",
    year: "2025",
    description: "Our fourth studio album. Songs of faithfulness, provision, and new life.",
    songCount: 12,
    keys: ["A", "Bb", "C", "D", "Eb"],
    resourceTypes: ["Chord Chart", "Lead & Piano", "Full Pack"],
    products: {
      "Chord Chart": createProduct(90201, "Harvest Chord Chart Bundle", "\u00a312.99", "Downloadable Pack"),
      "Lead & Piano": createProduct(90202, "Harvest Lead & Piano Bundle", "\u00a314.99", "Downloadable Pack"),
      "Full Pack": createProduct(90203, "Harvest Full Resource Pack", "\u00a319.99", "Downloadable Pack"),
    },
    imageUrl: "/Harvest.webp",
    songTitles: ["Faithful Provider", "New Life", "All Things Grow", "Harvest Hymn"],
  },
  {
    id: "come-behold",
    title: "Come Behold: Christmas Collaborations",
    artist: "Celtic Worship",
    year: "2022",
    description: "Christmas songs and collaborations that carry ancient wonder.",
    songCount: 9,
    keys: ["Bb", "C", "D", "Eb"],
    resourceTypes: ["Chord Chart", "Lead & Piano", "Full Pack"],
    products: {
      "Chord Chart": createProduct(90211, "Come Behold Chord Chart Bundle", "\u00a310.99", "Downloadable Pack"),
      "Lead & Piano": createProduct(90212, "Come Behold Lead & Piano Bundle", "\u00a312.99", "Downloadable Pack"),
      "Full Pack": createProduct(90213, "Come Behold Full Resource Pack", "\u00a316.99", "Downloadable Pack"),
    },
    imageUrl: "/COME%20BEHOLD.webp",
    songTitles: ["Come Behold", "O Holy Night", "Ancient Wonder"],
  },
  {
    id: "morningtide",
    title: MORNINGTIDE_ALBUM.title,
    artist: MORNINGTIDE_ALBUM.artist,
    year: MORNINGTIDE_ALBUM.year,
    description: "Songs of dawn, hope, and stillness, drawing the heart toward prayer.",
    songCount: 11,
    keys: ["Bb", "C", "D", "Eb"],
    resourceTypes: ["Chord Chart", "Lead & Piano", "Full Pack"],
    products: {
      "Chord Chart": createProduct(90221, "Morningtide Chord Chart Bundle", "\u00a312.99", "Downloadable Pack"),
      "Lead & Piano": createProduct(90222, "Morningtide Lead & Piano Bundle", "\u00a314.99", "Downloadable Pack"),
      "Full Pack": createProduct(90223, "Morningtide Full Resource Pack", "\u00a319.99", "Downloadable Pack"),
    },
    imageUrl: MORNINGTIDE_ALBUM.imageUrl,
    songTitles: SONG_RESOURCES.map((song) => song.songTitle),
  },
];

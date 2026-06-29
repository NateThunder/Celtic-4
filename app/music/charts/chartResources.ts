import {
  ALBUM_RESOURCE_PACKS,
  SONG_RESOURCES,
  type AlbumResourcePack,
  type ResourceProductLink,
  type ResourceType,
  type SongResource,
} from "./chartsData";

export const DEFAULT_SONG_RESOURCE: Exclude<ResourceType, "Full Pack"> = "Chords & Lyrics";
export const DEFAULT_ALBUM_RESOURCE: ResourceType = "Full Pack";

export type ChartResourceDetail =
  | {
      kind: "song";
      song: SongResource;
      product: ResourceProductLink;
      resourceType: Exclude<ResourceType, "Full Pack">;
    }
  | {
      kind: "albumPack";
      album: AlbumResourcePack;
      product: ResourceProductLink;
      resourceType: ResourceType;
    };

export function isResourceType(value: unknown): value is ResourceType {
  return (
    value === "Chord Chart" ||
    value === "Chords & Lyrics" ||
    value === "Lead & Piano" ||
    value === "Full Pack"
  );
}

export function getSongProduct(
  song: SongResource,
  resourceType: Exclude<ResourceType, "Full Pack">,
): ResourceProductLink {
  return song.products[resourceType] ?? song.products[DEFAULT_SONG_RESOURCE];
}

export function getAlbumProduct(
  album: AlbumResourcePack,
  resourceType: ResourceType,
): ResourceProductLink | undefined {
  return album.products[resourceType] ?? album.products[DEFAULT_ALBUM_RESOURCE] ?? Object.values(album.products)[0];
}

export function getChartResourceHref(resourceId: string, resourceType: ResourceType): string {
  return `/music/charts/${resourceId}?resource=${encodeURIComponent(resourceType)}`;
}

export function getChartResourceDetail(
  resourceId: string,
  requestedResourceType?: ResourceType,
): ChartResourceDetail | null {
  const song = SONG_RESOURCES.find((item) => item.id === resourceId);

  if (song) {
    const resourceType =
      requestedResourceType && requestedResourceType !== "Full Pack" && song.resourceTypes.includes(requestedResourceType)
        ? requestedResourceType
        : DEFAULT_SONG_RESOURCE;

    return {
      kind: "song",
      song,
      product: getSongProduct(song, resourceType),
      resourceType,
    };
  }

  const album = ALBUM_RESOURCE_PACKS.find((item) => item.id === resourceId);

  if (!album) return null;

  const resourceType =
    requestedResourceType && album.resourceTypes.includes(requestedResourceType)
      ? requestedResourceType
      : DEFAULT_ALBUM_RESOURCE;
  const product = getAlbumProduct(album, resourceType);

  if (!product) return null;

  return {
    kind: "albumPack",
    album,
    product,
    resourceType,
  };
}

export function getAllChartResourceParams() {
  return [
    ...SONG_RESOURCES.map((song) => ({ resourceId: song.id })),
    ...ALBUM_RESOURCE_PACKS.map((album) => ({ resourceId: album.id })),
  ];
}

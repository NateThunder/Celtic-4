import type { Stem } from "../components/stem-player/types";
import { sanitizePriceInput, toPenceAmount } from "./prices";
import { getStemTracks, type StoredTrack } from "./stemTracks";

export type StemPurchaseKind = "stem" | "all";

export type StemDownloadItem = {
  id: string;
  name: string;
  fileUrl: string;
};

export type StemPurchaseDetails = {
  kind: StemPurchaseKind;
  track: StoredTrack;
  stem?: Stem;
  title: string;
  description: string;
  price: string;
  unitAmount: number;
  downloadItems: StemDownloadItem[];
};

export type StemPurchaseLookupResult =
  | {
      ok: true;
      purchase: StemPurchaseDetails;
    }
  | {
      ok: false;
      message: string;
      status: number;
    };

function toDownloadItem(stem: Stem): StemDownloadItem {
  return {
    id: stem.id,
    name: stem.name || stem.fileName,
    fileUrl: stem.fileUrl,
  };
}

function getPricedAmount(price: string | undefined): { price: string; unitAmount: number } | null {
  const sanitizedPrice = sanitizePriceInput(price || "");
  const unitAmount = toPenceAmount(sanitizedPrice);
  return sanitizedPrice && unitAmount ? { price: sanitizedPrice, unitAmount } : null;
}

export async function getStemPurchaseDetails(input: {
  trackId: string;
  kind: StemPurchaseKind;
  stemId?: string;
}): Promise<StemPurchaseLookupResult> {
  const tracks = await getStemTracks();
  const track = tracks.find((candidate) => candidate.id === input.trackId);

  if (!track) {
    return { ok: false, message: "Stem session not found.", status: 404 };
  }

  if (input.kind === "all") {
    const pricedAmount = getPricedAmount(track.fullStemsPrice);
    if (!pricedAmount) {
      return { ok: false, message: "This full stem pack is not available to buy yet.", status: 400 };
    }

    return {
      ok: true,
      purchase: {
        kind: "all",
        track,
        title: `${track.title} - Full Stem Pack`,
        description: track.artistName
          ? `${track.artistName} full stem pack`
          : "Full stem pack",
        price: pricedAmount.price,
        unitAmount: pricedAmount.unitAmount,
        downloadItems: track.stems.map(toDownloadItem),
      },
    };
  }

  if (!input.stemId) {
    return { ok: false, message: "A stem id is required.", status: 400 };
  }

  const stem = track.stems.find((candidate) => candidate.id === input.stemId);
  if (!stem) {
    return { ok: false, message: "Stem not found.", status: 404 };
  }

  const pricedAmount = getPricedAmount(stem.price);
  if (!pricedAmount) {
    return { ok: false, message: "This stem is not available to buy yet.", status: 400 };
  }

  return {
    ok: true,
    purchase: {
      kind: "stem",
      track,
      stem,
      title: `${track.title} - ${stem.name || stem.fileName}`,
      description: track.artistName ? `${track.artistName} stem` : "Single stem",
      price: pricedAmount.price,
      unitAmount: pricedAmount.unitAmount,
      downloadItems: [toDownloadItem(stem)],
    },
  };
}

// Automatic event poster. Any show on Bandsintown without its own artwork gets
// one of these: band photo, CELTIC WORSHIP across the top, the city large, the
// date, and the venue. Same look as the Netherlands Christmas 2026 posters.
//
//   /api/poster?date=2026-12-19&venue=De%20Flambou&city=Surhuisterveen
//
// Returns a 1080x1350 PNG (the size of every poster on the site).

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { posterDateLine, posterPhotoFor } from "../../lib/autoPoster";

export const runtime = "nodejs";

const ASSETS = join(process.cwd(), "assets", "poster");
const INK = "#f3e9d2";
const GOLD = "#e2b86b";
const SHADE = "18,13,10";

function clean(value: string | null, max: number): string {
  return (value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

// Big word size so long city names still fit inside the margins.
function bigWordSize(word: string): number {
  return Math.max(64, Math.min(150, Math.floor(900 / (Math.max(word.length, 1) * 0.7))));
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const date = clean(params.get("date"), 10);
  const venue = clean(params.get("venue"), 60) || "Venue to be announced";
  const city = clean(params.get("city"), 40) || "Live";
  const dateLine = posterDateLine(date);

  const [display, text, bold, photo] = await Promise.all([
    readFile(join(ASSETS, "LibreCaslonDisplay-Regular.woff")),
    readFile(join(ASSETS, "LibreCaslonText-Regular.woff")),
    readFile(join(ASSETS, "LibreCaslonText-Bold.woff")),
    readFile(join(ASSETS, posterPhotoFor(`${date}|${venue}|${city}`))),
  ]);
  const photoSrc = `data:image/jpeg;base64,${photo.toString("base64")}`;
  const bigWord = city.toUpperCase();

  return new ImageResponse(
    (
      <div style={{ width: 1080, height: 1350, display: "flex", position: "relative", background: `rgb(${SHADE})`, color: INK, fontFamily: "Caslon Text" }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={photoSrc} width={1080} height={1350} style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1350, objectFit: "cover" }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 620, display: "flex", backgroundImage: `linear-gradient(180deg, rgba(${SHADE},0.9), rgba(${SHADE},0))` }} />
        <div style={{ position: "absolute", left: 0, bottom: 0, width: 1080, height: 520, display: "flex", backgroundImage: `linear-gradient(0deg, rgba(${SHADE},0.97) 0%, rgba(${SHADE},0.9) 45%, rgba(${SHADE},0) 100%)` }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1350, padding: "76px 80px 70px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontSize: 34, letterSpacing: 18, paddingLeft: 18 }}>CELTIC WORSHIP</div>
          <div style={{ marginTop: 18, fontFamily: "Caslon Display", fontSize: bigWordSize(bigWord), lineHeight: 1 }}>{bigWord}</div>
          <div style={{ marginTop: 26, fontSize: 22, letterSpacing: 9, color: GOLD }}>{dateLine.toUpperCase()}</div>
          <div style={{ flexGrow: 1, display: "flex" }} />
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 2.4 }}>{venue.toUpperCase()}</div>
          <div style={{ marginTop: 18, fontSize: 26, letterSpacing: 3.6 }}>{"TICKETS · CELTICWORSHIP.CO.UK"}</div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: "Caslon Display", data: display, weight: 400, style: "normal" },
        { name: "Caslon Text", data: text, weight: 400, style: "normal" },
        { name: "Caslon Text", data: bold, weight: 700, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    },
  );
}

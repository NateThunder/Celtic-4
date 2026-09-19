import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

mkdirSync("output/cloudflare", { recursive: true });
if (!existsSync("output/cloudflare/hero.mp4")) {
  const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-n", "-i",
    "public/Your Kindness (Official Music Video) - 1m58s compressed.mp4",
    "-vf", "scale=-2:720", "-c:v", "libx264", "-preset", "fast", "-b:v", "1250k",
    "-maxrate", "1400k", "-bufsize", "2800k", "-c:a", "aac", "-b:a", "96k",
    "-movflags", "+faststart", "output/cloudflare/hero.mp4"], { stdio: "inherit" });
  if (result.status !== 0) throw new Error("Install FFmpeg to prepare the Worker homepage video.");
}

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DIR = path.join(process.cwd(), "..", "media", "autovec");

export async function saveUploadedImage(
  buf: Buffer,
  mimeType: string,
): Promise<{ url: string }> {
  const ext =
    mimeType.includes("jpeg") || mimeType.includes("jpg")
      ? "jpg"
      : mimeType.includes("webp")
        ? "webp"
        : "png";
  await fs.mkdir(DIR, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await fs.writeFile(path.join(DIR, name), buf);
  return { url: `/media/autovec/${name}` };
}

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = path.join(process.cwd(), "public", "uploads");

export async function saveUploadedImage(
  buf: Buffer,
  mimeType: string,
  bucket: "ref" | "crop" = "ref",
): Promise<{ url: string }> {
  const ext =
    mimeType.includes("jpeg") || mimeType.includes("jpg")
      ? "jpg"
      : mimeType.includes("webp")
        ? "webp"
        : "png";
  const dir = path.join(ROOT, bucket);
  await fs.mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await fs.writeFile(path.join(dir, name), buf);
  return { url: `/uploads/${bucket}/${name}` };
}

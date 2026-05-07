import { env } from "@/lib/env";

export async function removeBackground(
  buf: Buffer,
  mimeType: string,
): Promise<Buffer> {
  if (!env.REMOVE_BG_API_KEY) {
    throw new Error("REMOVE_BG_API_KEY not configured");
  }
  const blob = new Blob([new Uint8Array(buf)], { type: mimeType });
  const form = new FormData();
  // "full" preserves the upload resolution. "auto" downscales when subscription is low.
  form.append("size", "full");
  form.append("format", "png");
  form.append("image_file", blob, "image");

  const r = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": env.REMOVE_BG_API_KEY },
    body: form,
  });

  if (!r.ok) {
    const text = await r.text().catch(() => r.statusText);
    throw new Error(`remove.bg ${r.status}: ${text}`);
  }
  return Buffer.from(await r.arrayBuffer());
}

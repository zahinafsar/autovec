import { removeBackground as imglyRemoveBackground } from "@imgly/background-removal-node";

export async function removeBackground(
  buf: Buffer,
  mimeType: string,
): Promise<Buffer> {
  const blob = new Blob([new Uint8Array(buf)], { type: mimeType });
  const out = await imglyRemoveBackground(blob);
  return Buffer.from(await out.arrayBuffer());
}

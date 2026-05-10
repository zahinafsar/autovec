import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { removeBackground } from "@/lib/services/removebg";
import sharp from "sharp";

const MODEL = "gemini-2.5-flash-image";

let _client: GoogleGenAI | null = null;
function client() {
  if (!_client) _client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return _client;
}

export type GenOptions = {
  transparent: boolean;
};

export type VariantSpec = {
  id: string;
  prompt: string;
};

function buildPrompt(spec: VariantSpec, opts: GenOptions, commonPrompt?: string): string {
  const parts: string[] = [];
  if (commonPrompt && commonPrompt.trim()) {
    parts.push(commonPrompt.trim());
  }
  if (spec.prompt && spec.prompt.trim()) {
    parts.push(spec.prompt.trim());
  }
  if (opts.transparent) {
    parts.push(
      "Place the subject on a uniform plain pastel background that contrasts with the subject's colors. The subject must be sharply isolated with crisp edges — no shadows that blend into the background, no surrounding scene, no patterns. The background will be removed in post-processing.",
    );
  }
  return parts.join("\n\n");
}

async function fetchToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  if (url.startsWith("/")) {
    const local = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    const buf = await fs.readFile(local);
    const ext = path.extname(local).slice(1).toLowerCase();
    const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext || "png"}`;
    return { data: buf.toString("base64"), mimeType };
  }
  const r = await fetch(url);
  const ab = await r.arrayBuffer();
  const mimeType = r.headers.get("content-type") ?? "image/png";
  return { data: Buffer.from(ab).toString("base64"), mimeType };
}

export async function generateVariant(opts: {
  referenceImageUrl: string | null;
  spec: VariantSpec;
  genOptions: GenOptions;
  commonPrompt?: string;
}): Promise<{ url: string }> {
  const ai = client();
  const parts: Array<
    | { text: string }
    | { inlineData: { data: string; mimeType: string } }
  > = [];
  if (opts.referenceImageUrl) {
    const ref = await fetchToBase64(opts.referenceImageUrl);
    parts.push({ inlineData: ref });
  }
  parts.push({ text: buildPrompt(opts.spec, opts.genOptions, opts.commonPrompt) });

  const resp = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
  });

  const candidate = resp.candidates?.[0];
  const inline = candidate?.content?.parts?.find(
    (p) => "inlineData" in p && p.inlineData?.data,
  ) as { inlineData: { data: string; mimeType: string } } | undefined;

  if (!inline?.inlineData?.data) {
    throw new Error("Gemini returned no image data");
  }

  let imgBytes: Uint8Array = Buffer.from(inline.inlineData.data, "base64");
  let mime = inline.inlineData.mimeType || "image/png";

  if (opts.genOptions.transparent) {
    try {
      const noBg = await removeBackground(Buffer.from(imgBytes), mime);
      // trim transparent borders so the subject fills the canvas, lossless PNG out
      const trimmed = await sharp(noBg)
        .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
        .png({ compressionLevel: 9, palette: false })
        .toBuffer();
      imgBytes = trimmed;
      mime = "image/png";
    } catch (e) {
      console.error("[gemini] transparent post-process failed, falling back", e);
    }
  }

  const ext = mime.includes("jpeg") ? "jpg" : "png";
  const filename = `${randomUUID()}.${ext}`;
  const outDir = path.join(process.cwd(), "..", "media", "autovec");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, filename), imgBytes);
  return { url: `/media/autovec/${filename}` };
}

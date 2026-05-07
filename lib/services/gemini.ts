import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const MODEL = "gemini-2.5-flash-image";

let _client: GoogleGenAI | null = null;
function client() {
  if (!_client) _client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return _client;
}

export type GenOptions = {
  transparent: boolean;
  ratio: "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
  padding: boolean;
};

export type VariantSpec = {
  id: string;
  prompt: string;
};

function buildPrompt(spec: VariantSpec, opts: GenOptions, commonPrompt?: string): string {
  const parts: string[] = [];
  parts.push(
    "Generate a single high-quality vector-style cartoon illustration.",
  );
  parts.push(
    "Use the provided reference image to match the character/style/subject identity, then apply the variation requested below.",
  );
  if (commonPrompt && commonPrompt.trim()) {
    parts.push(`Shared instructions for every variant in this session: ${commonPrompt.trim()}`);
  }
  parts.push(`Variation request: ${spec.prompt || "(no extra detail)"}`);
  parts.push("Style: clean cartoon vector look, smooth flat colors, crisp edges, no photoreal textures, no watermarks, no text labels.");
  parts.push(`Aspect ratio: ${opts.ratio}.`);
  if (opts.transparent) {
    parts.push(
      "Output the subject on a fully transparent background (PNG alpha) — no surrounding scene.",
    );
  } else {
    parts.push("Output on a clean simple solid background.");
  }
  if (opts.padding) {
    parts.push("Leave generous empty padding/margin around the subject.");
  } else {
    parts.push("Frame the subject tightly with minimal padding.");
  }
  return parts.join("\n");
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

  const ext = inline.inlineData.mimeType.includes("jpeg") ? "jpg" : "png";
  const filename = `${randomUUID()}.${ext}`;
  const outDir = path.join(process.cwd(), "public", "uploads", "generated");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, filename);
  await fs.writeFile(outPath, Buffer.from(inline.inlineData.data, "base64"));
  return { url: `/uploads/generated/${filename}` };
}

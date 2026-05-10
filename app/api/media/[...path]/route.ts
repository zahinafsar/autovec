import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await ctx.params;
    const filename = path.join("/");

    if (filename.includes("..")) {
      return new NextResponse("Not found", { status: 404 });
    }

    const filepath = join(process.cwd(), "..", "media", filename);

    const fileStat = await stat(filepath).catch(() => null);
    if (!fileStat || !fileStat.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }

    const ext = "." + (filename.split(".").pop()?.toLowerCase() ?? "");
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const buffer = await readFile(filepath);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

import { NextResponse } from "next/server";
import { saveUploadedImage } from "@/lib/services/uploads";
import { getSessionUser } from "@/lib/session";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }
  const mime = file.type || "image/png";
  if (!mime.startsWith("image/")) {
    return NextResponse.json({ error: "Not an image" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const { url } = await saveUploadedImage(buf, mime);
  return NextResponse.json({ url });
}

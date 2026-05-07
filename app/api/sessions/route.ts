import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { genSessions, variants } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ sessions: [] });
  const rows = await db
    .select()
    .from(genSessions)
    .where(eq(genSessions.userId, u.id))
    .orderBy(desc(genSessions.updatedAt));
  return NextResponse.json({ sessions: rows });
}

export async function POST(req: Request) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = body?.title ? String(body.title).slice(0, 120) : "Untitled session";
  const referenceImageUrl = body?.referenceImageUrl
    ? String(body.referenceImageUrl)
    : null;
  const initialPrompt = body?.prompt ? String(body.prompt) : "";

  const [s] = await db
    .insert(genSessions)
    .values({
      userId: u.id,
      title,
      referenceImageUrl,
      originalReferenceUrl: referenceImageUrl,
    })
    .returning();

  await db.insert(variants).values({
    sessionId: s.id,
    position: 0,
    prompt: initialPrompt,
  });

  return NextResponse.json({ session: s });
}

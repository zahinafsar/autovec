import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { genSessions, variants } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { and, eq, asc } from "drizzle-orm";

async function loadSession(userId: string, id: string) {
  const [s] = await db
    .select()
    .from(genSessions)
    .where(and(eq(genSessions.id, id), eq(genSessions.userId, userId)));
  if (!s) return null;
  const vs = await db
    .select()
    .from(variants)
    .where(eq(variants.sessionId, id))
    .orderBy(asc(variants.position));
  return { ...s, variants: vs };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const session = await loadSession(u.id, id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ session });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const update: Partial<typeof genSessions.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (typeof body?.title === "string") update.title = body.title.slice(0, 120);
  if (typeof body?.commonPrompt === "string") update.commonPrompt = body.commonPrompt;
  if (body?.referenceImageUrl !== undefined)
    update.referenceImageUrl = body.referenceImageUrl
      ? String(body.referenceImageUrl)
      : null;
  if (body?.originalReferenceUrl !== undefined)
    update.originalReferenceUrl = body.originalReferenceUrl
      ? String(body.originalReferenceUrl)
      : null;
  if (body?.options) update.options = body.options;

  await db
    .update(genSessions)
    .set(update)
    .where(and(eq(genSessions.id, id), eq(genSessions.userId, u.id)));

  const session = await loadSession(u.id, id);
  return NextResponse.json({ session });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await db
    .delete(genSessions)
    .where(and(eq(genSessions.id, id), eq(genSessions.userId, u.id)));
  return NextResponse.json({ ok: true });
}

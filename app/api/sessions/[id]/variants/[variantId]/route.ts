import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { genSessions, variants } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { and, eq } from "drizzle-orm";

async function ownsSession(userId: string, sessionId: string) {
  const [s] = await db
    .select({ id: genSessions.id })
    .from(genSessions)
    .where(and(eq(genSessions.id, sessionId), eq(genSessions.userId, userId)));
  return !!s;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; variantId: string }> },
) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, variantId } = await ctx.params;
  if (!(await ownsSession(u.id, id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const update: Partial<typeof variants.$inferInsert> = {};
  if (typeof body?.prompt === "string") update.prompt = body.prompt;

  const [v] = await db
    .update(variants)
    .set(update)
    .where(and(eq(variants.id, variantId), eq(variants.sessionId, id)))
    .returning();
  return NextResponse.json({ variant: v });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; variantId: string }> },
) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, variantId } = await ctx.params;
  if (!(await ownsSession(u.id, id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(variants)
    .where(and(eq(variants.id, variantId), eq(variants.sessionId, id)));
  return NextResponse.json({ ok: true });
}

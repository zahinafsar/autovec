import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { genSessions, variants } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { and, eq, max } from "drizzle-orm";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const [s] = await db
    .select()
    .from(genSessions)
    .where(and(eq(genSessions.id, id), eq(genSessions.userId, u.id)));
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ value: maxPos }] = await db
    .select({ value: max(variants.position) })
    .from(variants)
    .where(eq(variants.sessionId, id));

  const [v] = await db
    .insert(variants)
    .values({
      sessionId: id,
      position: (maxPos ?? -1) + 1,
      prompt: String(body?.prompt ?? ""),
    })
    .returning();

  return NextResponse.json({ variant: v });
}

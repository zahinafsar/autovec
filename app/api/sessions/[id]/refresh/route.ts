import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { genSessions, variants } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { and, eq, asc } from "drizzle-orm";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const [s] = await db
    .select()
    .from(genSessions)
    .where(and(eq(genSessions.id, id), eq(genSessions.userId, u.id)));
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const vs = await db
    .select()
    .from(variants)
    .where(eq(variants.sessionId, id))
    .orderBy(asc(variants.position));

  return NextResponse.json({
    status: s.status,
    variants: vs.map((v) => ({
      id: v.id,
      status: v.status,
      resultUrl: v.resultUrl,
      error: v.error,
    })),
  });
}

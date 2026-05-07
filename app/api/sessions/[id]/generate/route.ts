import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { genSessions, users, variants } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { and, eq, asc, inArray, sql } from "drizzle-orm";
import { generateVariant, type GenOptions } from "@/lib/services/gemini";
import { CREDITS_PER_VARIANT, env } from "@/lib/env";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const requestedIds = Array.isArray(body?.variantIds)
    ? (body.variantIds as unknown[]).filter((x): x is string => typeof x === "string")
    : null;

  const [s] = await db
    .select()
    .from(genSessions)
    .where(and(eq(genSessions.id, id), eq(genSessions.userId, u.id)));
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!s.referenceImageUrl)
    return NextResponse.json(
      { error: "Upload a reference image first" },
      { status: 400 },
    );

  const vs = await db
    .select()
    .from(variants)
    .where(eq(variants.sessionId, id))
    .orderBy(asc(variants.position));

  // explicit list -> regenerate any (skip currently GENERATING)
  // no list -> all PENDING/FAILED
  const targets = requestedIds
    ? vs.filter((v) => requestedIds.includes(v.id) && v.status !== "GENERATING")
    : vs.filter((v) => v.status === "PENDING" || v.status === "FAILED");

  if (targets.length === 0)
    return NextResponse.json({ error: "Nothing to generate" }, { status: 400 });

  const cost = targets.length * CREDITS_PER_VARIANT;
  if (u.credits < cost) {
    return NextResponse.json(
      { error: "Insufficient credits", required: cost, have: u.credits },
      { status: 402 },
    );
  }

  if (!env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured on server" },
      { status: 503 },
    );
  }

  const dec = await db
    .update(users)
    .set({ credits: sql`${users.credits} - ${cost}` })
    .where(and(eq(users.id, u.id), sql`${users.credits} >= ${cost}`))
    .returning({ credits: users.credits });
  if (dec.length === 0) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }

  await db
    .update(genSessions)
    .set({ status: "GENERATING", updatedAt: new Date() })
    .where(eq(genSessions.id, id));
  await db
    .update(variants)
    .set({ status: "GENERATING", error: null, resultUrl: null })
    .where(
      and(
        eq(variants.sessionId, id),
        inArray(
          variants.id,
          targets.map((t) => t.id),
        ),
      ),
    );

  void runBatch(id, s.referenceImageUrl, s.options as GenOptions, s.commonPrompt, targets);

  return NextResponse.json({
    ok: true,
    queued: targets.length,
    cost,
    remainingCredits: dec[0].credits,
  });
}

async function runBatch(
  sessionId: string,
  refUrl: string,
  options: GenOptions,
  commonPrompt: string,
  targets: { id: string; prompt: string }[],
) {
  await Promise.all(
    targets.map(async (v) => {
      try {
        const { url } = await generateVariant({
          referenceImageUrl: refUrl,
          spec: { id: v.id, prompt: v.prompt },
          genOptions: options,
          commonPrompt,
        });
        await db
          .update(variants)
          .set({ status: "COMPLETED", resultUrl: url, error: null })
          .where(eq(variants.id, v.id));
      } catch (e) {
        await db
          .update(variants)
          .set({
            status: "FAILED",
            error: e instanceof Error ? e.message : "Unknown error",
          })
          .where(eq(variants.id, v.id));
      }
    }),
  );

  // recompute session status from any remaining active/failed variants
  const remaining = await db
    .select({ status: variants.status })
    .from(variants)
    .where(eq(variants.sessionId, sessionId));
  const stillRunning = remaining.some((r) => r.status === "GENERATING");
  const anyFail = remaining.some((r) => r.status === "FAILED");
  if (!stillRunning) {
    await db
      .update(genSessions)
      .set({
        status: anyFail ? "FAILED" : "COMPLETED",
        updatedAt: new Date(),
      })
      .where(eq(genSessions.id, sessionId));
  }
}

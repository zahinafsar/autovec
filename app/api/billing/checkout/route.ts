import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { purchases } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import {
  CREDIT_PACKS,
  createCreditCheckout,
  type PackKey,
} from "@/lib/services/lemonsqueezy";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!env.LS_API_KEY)
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const pack = body?.pack as PackKey | undefined;
  if (!pack || !(pack in CREDIT_PACKS))
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 });

  const meta = CREDIT_PACKS[pack];
  const [p] = await db
    .insert(purchases)
    .values({
      userId: u.id,
      pack,
      credits: meta.credits,
      amountCents: meta.priceCents,
      status: "PENDING",
    })
    .returning();

  try {
    const { url } = await createCreditCheckout({
      pack,
      userId: u.id,
      email: u.email,
      purchaseId: p.id,
    });
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 500 },
    );
  }
}

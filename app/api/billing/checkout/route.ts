import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { purchases } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import {
  createCreditCheckout,
  priceCentsForCredits,
} from "@/lib/services/lemonsqueezy";
import { env, MIN_CREDIT_PURCHASE } from "@/lib/env";

export async function POST(req: Request) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!env.LS_API_KEY)
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const credits = Math.floor(Number(body?.credits));
  if (!Number.isFinite(credits) || credits < MIN_CREDIT_PURCHASE) {
    return NextResponse.json(
      { error: `Minimum ${MIN_CREDIT_PURCHASE} credits` },
      { status: 400 },
    );
  }

  const cents = priceCentsForCredits(credits);

  const [p] = await db
    .insert(purchases)
    .values({
      userId: u.id,
      credits,
      amountCents: cents,
      status: "PENDING",
    })
    .returning();

  try {
    const { url } = await createCreditCheckout({
      credits,
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

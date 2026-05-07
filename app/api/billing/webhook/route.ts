import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { purchases, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifyLsSignature } from "@/lib/services/lemonsqueezy";

type LsBody = {
  meta?: {
    event_name?: string;
    webhook_id?: string;
    custom_data?: { purchase_id?: string; user_id?: string; pack?: string };
  };
  data?: { id?: string; attributes?: { status?: string } };
};

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-signature");
  if (!verifyLsSignature(raw, sig))
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });

  let body: LsBody;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const event = body?.meta?.event_name ?? "";
  if (event !== "order_created") {
    return NextResponse.json({ received: true });
  }

  const orderId = body?.data?.id;
  const status = body?.data?.attributes?.status;
  const purchaseId = body?.meta?.custom_data?.purchase_id;
  const eventId = `${body?.meta?.webhook_id ?? ""}-${orderId ?? ""}`;

  if (!orderId || !purchaseId || status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const [p] = await db.select().from(purchases).where(eq(purchases.id, purchaseId));
  if (!p || p.status === "PAID" || p.lsEventId === eventId) {
    return NextResponse.json({ received: true });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(purchases)
      .set({
        status: "PAID",
        lsOrderId: orderId,
        lsEventId: eventId,
      })
      .where(eq(purchases.id, purchaseId));
    await tx
      .update(users)
      .set({ credits: sql`${users.credits} + ${p.credits}` })
      .where(eq(users.id, p.userId));
  });

  return NextResponse.json({ received: true });
}

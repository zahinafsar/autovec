import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { purchases, users } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { verifyLsSignature } from "@/lib/services/lemonsqueezy";

export const runtime = "nodejs";

type LsOrderPayload = {
  meta?: {
    event_name?: string;
    webhook_id?: string;
    custom_data?: Record<string, string>;
  };
  data?: { id?: string; attributes?: { status?: string } };
};

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-signature");
  if (!verifyLsSignature(raw, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = req.headers.get("x-event-name") ?? "";
  let body: LsOrderPayload;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  try {
    switch (event) {
      case "order_created": {
        const lsOrderId = body.data?.id;
        const status = body.data?.attributes?.status;
        const purchaseId = body.meta?.custom_data?.purchase_id;
        if (!lsOrderId || status !== "paid" || !purchaseId) break;

        const [p] = await db
          .select({
            id: purchases.id,
            userId: purchases.userId,
            credits: purchases.credits,
            status: purchases.status,
            lsEventId: purchases.lsEventId,
          })
          .from(purchases)
          .where(
            and(eq(purchases.id, purchaseId), eq(purchases.status, "PENDING")),
          );
        if (!p) break;

        const eventId = `${body.meta?.webhook_id ?? ""}-${lsOrderId}`;
        if (p.lsEventId === eventId) break;

        await db.transaction(async (tx) => {
          const updated = await tx
            .update(purchases)
            .set({ status: "PAID", lsOrderId, lsEventId: eventId })
            .where(
              and(eq(purchases.id, p.id), eq(purchases.status, "PENDING")),
            )
            .returning({ id: purchases.id });
          if (updated.length === 0) return; // someone else processed it concurrently
          await tx
            .update(users)
            .set({ credits: sql`${users.credits} + ${p.credits}` })
            .where(eq(users.id, p.userId));
        });
        break;
      }
    }
  } catch (e) {
    console.error("[ls/webhook] handler failed", e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

import { NextResponse } from "next/server";
import { CREDIT_PACKS } from "@/lib/services/lemonsqueezy";
import { CREDITS_PER_VARIANT } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    packs: Object.entries(CREDIT_PACKS).map(([key, meta]) => ({
      key,
      label: meta.label,
      credits: meta.credits,
      priceCents: meta.priceCents,
    })),
    creditsPerVariant: CREDITS_PER_VARIANT,
  });
}

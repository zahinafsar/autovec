import { NextResponse } from "next/server";
import {
  CREDITS_PER_VARIANT,
  PRICE_CENTS_PER_CREDIT,
  MIN_CREDIT_PURCHASE,
} from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    creditsPerVariant: CREDITS_PER_VARIANT,
    priceCentsPerCredit: PRICE_CENTS_PER_CREDIT,
    minCredits: MIN_CREDIT_PURCHASE,
  });
}

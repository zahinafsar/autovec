import {
  lemonSqueezySetup,
  createCheckout,
} from "@lemonsqueezy/lemonsqueezy.js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env, PRICE_CENTS_PER_CREDIT, MIN_CREDIT_PURCHASE } from "@/lib/env";

if (env.LS_API_KEY) {
  lemonSqueezySetup({
    apiKey: env.LS_API_KEY,
    onError: (e) => console.error("[lemonsqueezy]", e),
  });
}

export function priceCentsForCredits(credits: number): number {
  return Math.max(MIN_CREDIT_PURCHASE, Math.floor(credits)) * PRICE_CENTS_PER_CREDIT;
}

export function verifyLsSignature(
  rawBody: string,
  sigHeader: string | null,
): boolean {
  if (!sigHeader || !env.LS_WEBHOOK_SECRET) return false;
  const expected = createHmac("sha256", env.LS_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(sigHeader, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createCreditCheckout(opts: {
  credits: number;
  userId: string;
  email: string;
  purchaseId: string;
}): Promise<{ url: string }> {
  if (!env.LS_VARIANT_ID) throw new Error("LEMONSQUEEZY_VARIANT_ID not configured");

  const cents = priceCentsForCredits(opts.credits);

  const { data, error } = await createCheckout(env.LS_STORE_ID, env.LS_VARIANT_ID, {
    testMode: !env.IS_PROD,
    productOptions: {
      name: `${opts.credits} Autovec credits`,
      description: `${opts.credits} credits — generates ${Math.floor(opts.credits / 10)} variants.`,
      redirectUrl: `${env.APP_URL}/billing/success`,
      receiptButtonText: "Back to Autovec",
      receiptLinkUrl: `${env.APP_URL}/dashboard`,
    },
    checkoutOptions: { embed: false, media: false, logo: true },
    checkoutData: {
      email: opts.email,
      custom: {
        purchase_id: opts.purchaseId,
        user_id: opts.userId,
        credits: String(opts.credits),
      },
    },
    customPrice: cents,
  });
  if (error) throw new Error(`LS checkout failed: ${error.message}`);
  const url = data?.data?.attributes?.url;
  if (!url) throw new Error("LS checkout missing url");
  return { url };
}

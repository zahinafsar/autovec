import {
  lemonSqueezySetup,
  createCheckout,
} from "@lemonsqueezy/lemonsqueezy.js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

if (env.LS_API_KEY) {
  lemonSqueezySetup({
    apiKey: env.LS_API_KEY,
    onError: (e) => console.error("[lemonsqueezy]", e),
  });
}

export const CREDIT_PACKS = {
  "100": { credits: 100, label: "Starter", priceCents: 999 },
  "500": { credits: 500, label: "Pro", priceCents: 3999 },
  "1500": { credits: 1500, label: "Studio", priceCents: 9999 },
} as const;

export type PackKey = keyof typeof CREDIT_PACKS;

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
  pack: PackKey;
  userId: string;
  email: string;
  purchaseId: string;
}): Promise<{ url: string }> {
  const pack = CREDIT_PACKS[opts.pack];
  const variantId = env.LS_VARIANTS[opts.pack];
  if (!variantId) throw new Error(`No LS variant for pack ${opts.pack}`);

  const { data, error } = await createCheckout(env.LS_STORE_ID, variantId, {
    testMode: !env.IS_PROD,
    productOptions: {
      name: `${pack.credits} Autovec credits`,
      description: `${pack.label} pack — ${pack.credits} credits`,
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
        pack: opts.pack,
      },
    },
  });
  if (error) throw new Error(`LS checkout failed: ${error.message}`);
  const url = data?.data?.attributes?.url;
  if (!url) throw new Error("LS checkout missing url");
  return { url };
}

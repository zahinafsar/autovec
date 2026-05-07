function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  SESSION_SECRET: required("SESSION_SECRET"),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  REMOVE_BG_API_KEY: process.env.REMOVE_BG_API_KEY ?? "",
  LS_API_KEY: process.env.LEMONSQUEEZY_API_KEY ?? "",
  LS_STORE_ID: process.env.LEMONSQUEEZY_STORE_ID ?? "",
  LS_VARIANT_ID: process.env.LEMONSQUEEZY_VARIANT_ID ?? "",
  LS_WEBHOOK_SECRET: process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "",
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  IS_PROD: process.env.NODE_ENV === "production",
};

export const CREDITS_PER_VARIANT = 10;
export const PRICE_CENTS_PER_CREDIT = 1; // $0.01 per credit → $0.10 per variant → 10 variants = $1
export const MIN_CREDIT_PURCHASE = 100;

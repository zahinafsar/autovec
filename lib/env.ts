function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  SESSION_SECRET: required("SESSION_SECRET"),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  LS_API_KEY: process.env.LEMONSQUEEZY_API_KEY ?? "",
  LS_STORE_ID: process.env.LEMONSQUEEZY_STORE_ID ?? "",
  LS_VARIANTS: {
    "100": process.env.LEMONSQUEEZY_VARIANT_ID_100 ?? "",
    "500": process.env.LEMONSQUEEZY_VARIANT_ID_500 ?? "",
    "1500": process.env.LEMONSQUEEZY_VARIANT_ID_1500 ?? "",
  } as Record<string, string>,
  LS_WEBHOOK_SECRET: process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "",
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  IS_PROD: process.env.NODE_ENV === "production",
};

export const CREDITS_PER_VARIANT = 10;

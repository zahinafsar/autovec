# Autovec

AI cartoon variant generator. Upload one reference cartoon, prompt multiple variants, get unique generations powered by Gemini.

## Stack
- Next.js 16 (App Router)
- Postgres 16 in Docker
- Drizzle ORM
- bcryptjs + HMAC cookie sessions
- Gemini (`@google/genai`, model `gemini-2.5-flash-image`)
- Lemon Squeezy for credit purchases

## Quick start

```bash
docker compose up -d           # postgres on :5434
cp .env.example .env           # then fill GEMINI_API_KEY and LS_*
npm install
npm run db:migrate             # apply drizzle migrations
npm run db:seed                # creates test@autovec.dev / test1234 with 1000 credits
npm run dev                    # http://localhost:3000
```

## Env

| Var | Notes |
|---|---|
| `DATABASE_URL` | Already points at Docker postgres on `:5434` |
| `SESSION_SECRET` | Long random string; signs the auth cookie |
| `GEMINI_API_KEY` | From Google AI Studio |
| `LEMONSQUEEZY_API_KEY` | LS API JWT |
| `LEMONSQUEEZY_STORE_ID` | LS store ID |
| `LEMONSQUEEZY_VARIANT_ID_100` | Variant for 100-credit pack |
| `LEMONSQUEEZY_VARIANT_ID_500` | Variant for 500-credit pack |
| `LEMONSQUEEZY_VARIANT_ID_1500` | Variant for 1500-credit pack |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | For HMAC signature check |
| `NEXT_PUBLIC_APP_URL` | Origin used for LS redirect |

LS webhook URL: `${APP_URL}/api/billing/webhook` — subscribe to `order_created`.

## Pricing

10 credits per generated variant. Packs:

| Pack | Credits | Price | Variants |
|---|---|---|---|
| Starter | 100 | $9.99 | 10 |
| Pro | 500 | $39.99 | 50 |
| Studio | 1500 | $99.99 | 150 |

Gemini 2.5 Flash Image is ~$0.039/image. Cost per variant ≈ $0.04. Sale price per variant ≈ $1 (Starter pack). ~96% gross margin.

## Architecture

- `lib/db/schema.ts` — `users`, `gen_sessions`, `variants`, `purchases`
- `lib/session.ts` — HMAC-signed cookie auth (no JWT lib)
- `lib/services/gemini.ts` — calls `generateContent` with reference image + prompt; saves PNG into `/public/uploads/generated`
- `lib/services/lemonsqueezy.ts` — checkout creation + webhook signature verify
- `app/api/sessions/[id]/generate/route.ts` — atomic credit deduction (`sql\`credits >= ${cost}\``), then fires the per-variant generation in the background
- `app/api/sessions/[id]/refresh/route.ts` — client polls every 2.5s for status while `GENERATING`

### Why not the Gemini Batch API?

Spec mentioned the Batch API but its SLA is up to 24h. For a chat-style UX users expect seconds, so generation runs synchronously per variant. The credit price and margin are tuned for the standard API. Swap `lib/services/gemini.ts` to use the Batch API if you want the 50% discount and are OK with delayed delivery.

## Pages

- `/` — generation entry: upload reference, prompt, click Generate. If logged out: opens login modal. If no credits: opens buy modal.
- `/dashboard` — list of all sessions (drafts + completed). "+ New session" creates a draft and redirects.
- `/s/[id]` — session editor: reference image, options panel (transparent / aspect ratio / padding), variant rows (add/remove, prompt edit), generate button.
- `/billing/success` — LS post-payment redirect.

## Reset

```bash
docker compose down -v          # wipe DB
docker compose up -d
npm run db:migrate
```

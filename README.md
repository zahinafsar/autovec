# Autovec

> **AI cartoon variants from one reference.** Upload a cartoon, prompt multiple variations, get unique generations powered by Gemini.

🌐 **Live**: <https://autovec.zahinafsar.com>

---

## What it does

Drop in one reference cartoon. Describe N variations ("happy", "waving", "looking surprised"). Autovec sends each variant to Gemini, optionally strips backgrounds via remove.bg, and saves the session as a draft you can come back to.

- **One reference, many variants** — add/remove rows on the fly
- **Per-variant prompt** + a **shared common prompt** for the whole session
- **Transparent PNG output** when toggled — Gemini → remove.bg → tight alpha-trim
- **Free-form crop** of the reference (drag corners; original is preserved for re-cropping)
- **Per-variant generate / regenerate** with a confirm dialog showing cost
- **Sessions = drafts**: dashboard lists every session you started, finished or not
- **Credits + Lemon Squeezy checkout** with `customPrice` (no fixed packs — buy any amount ≥ 100)

## Pricing

- **10 credits per generated variant**
- **$0.01 per credit** → $0.10 per variant → **10 variants = $1**
- Minimum purchase: **100 credits ($1.00)**

## Stack

- **Next.js 16** (App Router, Turbopack)
- **Postgres 16** in Docker
- **Drizzle ORM** with migrations
- **bcryptjs + HMAC cookie sessions** (no auth library)
- **Gemini 2.5 Flash Image** (`@google/genai`) for generation
- **remove.bg** + **sharp** for transparent post-processing
- **Lemon Squeezy** for credits / checkout / webhooks
- **react-image-crop** for the free-form cropper
- **Tailwind v4** with custom glass / orange-purple aesthetic

## Quick start

```bash
git clone <repo> autovec && cd autovec
docker compose up -d                     # postgres on :5434
cp .env.example .env                     # then fill API keys
npm install
npm run db:migrate                       # apply drizzle migrations
npm run db:seed                          # creates test@autovec.dev / test1234 with 1000 credits
npm run dev                              # http://localhost:3000
```

## Env

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Postgres URL (Docker default points at `:5434`) |
| `SESSION_SECRET` | Long random string; signs the auth cookie |
| `GEMINI_API_KEY` | From Google AI Studio |
| `LEMONSQUEEZY_API_KEY` | LS API JWT |
| `LEMONSQUEEZY_STORE_ID` | LS store ID |
| `LEMONSQUEEZY_VARIANT_ID` | Single variant; price overridden per-checkout via `customPrice` |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | For HMAC signature check |
| `NEXT_PUBLIC_APP_URL` | Origin used for LS redirect |

LS webhook URL: `${APP_URL}/api/billing/webhook` — subscribe to `order_created`.

`.env.production` ships pre-populated with the prod LS keys; replace `DATABASE_URL`, `LEMONSQUEEZY_VARIANT_ID`, and `NEXT_PUBLIC_APP_URL` for your environment.

## Architecture

```
app/
├─ page.tsx, HomeClient.tsx          → landing: ref upload + variants[] entry
├─ dashboard/                        → list all sessions
├─ s/[id]/                           → session editor (variants, options, crop, generate)
├─ billing/success                   → LS post-payment redirect
└─ api/
   ├─ auth/{signup,login,logout,me}  → cookie-session auth
   ├─ upload                         → image upload to /public/uploads
   ├─ sessions/                      → CRUD + variants + generate + refresh
   └─ billing/{checkout,webhook,packs}

lib/
├─ db/schema.ts                      → users, gen_sessions, variants, purchases
├─ session.ts                        → HMAC cookie sign/verify
└─ services/
   ├─ gemini.ts                      → reference image + commonPrompt + variant prompt
   ├─ removebg.ts                    → bg removal (size: full)
   └─ lemonsqueezy.ts                → checkout creation + webhook signature verify

components/
├─ HomeClient / SessionClient        → main client logic
├─ ImageDropzone                     → upload-now or defer-until-login mode
├─ VariantList, OptionsPanel         → editor UI
├─ CropModal                         → free-form react-image-crop
├─ ConfirmModal                      → imperative confirm() API
├─ auth/AuthProvider, LoginModal
└─ billing/BuyCreditsModal           → custom-amount input
```

### Generation flow

1. User clicks **Generate** on a variant (or "Generate N" to fan out all pending in parallel).
2. Server: load session row + variant rows fresh → atomic credit deduct (`UPDATE … WHERE credits >= cost RETURNING`) → mark variants `GENERATING` → spawn one Gemini call per target via `Promise.all`.
3. Each Gemini result, if transparent: → remove.bg (`size: full`) → `sharp.trim()` to clip empty alpha → write PNG.
4. Client polls `/refresh` every 2.5s while any variant is `GENERATING`.

### Why not Gemini Batch?

Spec mentioned the Batch API but its SLA is up to 24h, hostile to chat-style UX. Sync `generateContent` is what's used. Swap `lib/services/gemini.ts` if you want the 50% batch discount and are OK with delayed delivery.

## Reset DB

```bash
docker compose down -v
docker compose up -d
npm run db:migrate
npm run db:seed
```

## Author

Built by **Zahin Afsar** ([@zahinafsar](https://github.com/zahinafsar)).

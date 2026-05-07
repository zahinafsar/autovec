import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";

const COOKIE = "autovec_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function sign(payload: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(payload).digest("hex");
}

function build(userId: string): string {
  const exp = Date.now() + MAX_AGE * 1000;
  const body = `${userId}.${exp}`;
  return `${body}.${sign(body)}`;
}

function verify(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  const body = `${userId}.${expStr}`;
  const expected = sign(body);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(expStr) < Date.now()) return null;
  return userId;
}

export async function setSessionCookie(userId: string): Promise<void> {
  const c = await cookies();
  c.set(COOKIE, build(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.IS_PROD,
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE);
}

export async function getSessionUser() {
  const c = await cookies();
  const tok = c.get(COOKIE)?.value;
  if (!tok) return null;
  const userId = verify(tok);
  if (!userId) return null;
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  return u ?? null;
}

export async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Response("Unauthorized", { status: 401 });
  return u;
}

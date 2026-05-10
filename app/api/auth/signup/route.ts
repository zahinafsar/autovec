import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { setSessionCookie } from "@/lib/session";
import { FREE_SIGNUP_CREDITS } from "@/lib/env";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = body?.name ? String(body.name).trim() : null;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 chars" },
      { status: 400 },
    );
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [u] = await db
    .insert(users)
    .values({ email, passwordHash, name, credits: FREE_SIGNUP_CREDITS })
    .returning();

  await setSessionCookie(u.id);
  return NextResponse.json({ ok: true, user: { id: u.id, email: u.email, credits: u.credits } });
}

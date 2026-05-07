import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const TEST_EMAIL = "test@autovec.dev";
const TEST_PASSWORD = "test1234";
const TEST_CREDITS = 1000;
const TEST_NAME = "Test User";

async function main() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const [existing] = await db.select().from(users).where(eq(users.email, TEST_EMAIL));
  if (existing) {
    await db
      .update(users)
      .set({ passwordHash, credits: TEST_CREDITS, name: TEST_NAME })
      .where(eq(users.id, existing.id));
    console.log(`Updated test user ${TEST_EMAIL} → ${TEST_CREDITS} credits`);
  } else {
    const [u] = await db
      .insert(users)
      .values({ email: TEST_EMAIL, passwordHash, name: TEST_NAME, credits: TEST_CREDITS })
      .returning();
    console.log(`Created test user ${u.email} (${u.id}) → ${TEST_CREDITS} credits`);
  }
  console.log("Login: " + TEST_EMAIL + " / " + TEST_PASSWORD);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

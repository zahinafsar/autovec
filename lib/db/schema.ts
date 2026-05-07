import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const sessionStatusEnum = pgEnum("session_status", [
  "DRAFT",
  "GENERATING",
  "COMPLETED",
  "FAILED",
]);

export const variantStatusEnum = pgEnum("variant_status", [
  "PENDING",
  "GENERATING",
  "COMPLETED",
  "FAILED",
]);

export const purchaseStatusEnum = pgEnum("purchase_status", [
  "PENDING",
  "PAID",
  "FAILED",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    credits: integer("credits").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
  }),
);

export const genSessions = pgTable(
  "gen_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled session"),
    commonPrompt: text("common_prompt").notNull().default(""),
    referenceImageUrl: text("reference_image_url"),
    originalReferenceUrl: text("original_reference_url"),
    options: jsonb("options")
      .$type<{
        transparent: boolean;
      }>()
      .notNull()
      .default({ transparent: false }),
    status: sessionStatusEnum("status").notNull().default("DRAFT"),
    batchJobId: text("batch_job_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("gen_sessions_user_idx").on(t.userId),
  }),
);

export const variants = pgTable(
  "variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => genSessions.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    prompt: text("prompt").notNull().default(""),
    status: variantStatusEnum("status").notNull().default("PENDING"),
    resultUrl: text("result_url"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    sessIdx: index("variants_session_idx").on(t.sessionId),
  }),
);

export const purchases = pgTable("purchases", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  credits: integer("credits").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: purchaseStatusEnum("status").notNull().default("PENDING"),
  lsCheckoutId: text("ls_checkout_id"),
  lsOrderId: text("ls_order_id"),
  lsEventId: text("ls_event_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type GenSession = typeof genSessions.$inferSelect;
export type Variant = typeof variants.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;

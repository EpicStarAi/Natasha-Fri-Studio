import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const lemlistTokensTable = pgTable("lemlist_tokens", {
  id: serial("id").primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type").notNull().default("Bearer"),
  expiresIn: integer("expires_in"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  scope: text("scope"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLemlistTokenSchema = createInsertSchema(lemlistTokensTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLemlistToken = z.infer<typeof insertLemlistTokenSchema>;
export type LemlistToken = typeof lemlistTokensTable.$inferSelect;

import { pgTable, text, serial, integer, timestamp, varchar, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  discordId: varchar("discord_id", { length: 20 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  avatarColor: varchar("avatar_color", { length: 20 }).notNull(),
  balance: integer("balance").notNull().default(1000),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  password: (schema) => schema.min(6, "Password must be at least 6 characters"),
  discordId: (schema) => schema.min(1, "Discord ID is required"),
  displayName: (schema) => schema.min(1, "Display name is required"),
  avatarColor: (schema) => schema.min(1, "Avatar color is required"),
  balance: (schema) => schema.gte(0, "Balance cannot be negative")
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const catalogItems = pgTable("catalog_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertCatalogItemSchema = createInsertSchema(catalogItems, {
  name: (schema) => schema.min(1, "Name is required"),
  description: (schema) => schema.min(1, "Description is required"),
  price: (schema) => schema.gt(0, "Price must be greater than 0"),
  slug: (schema) => schema.min(1, "Slug is required")
});

export type CatalogItem = typeof catalogItems.$inferSelect;
export type InsertCatalogItem = z.infer<typeof insertCatalogItemSchema>;

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(),
  itemId: integer("item_id").references(() => catalogItems.id), // Made optional for direct transfers
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertTransactionSchema = createInsertSchema(transactions, {
  senderId: (schema) => schema.positive("Sender ID must be positive"),
  receiverId: (schema) => schema.positive("Receiver ID must be positive"),
  amount: (schema) => schema.gt(0, "Amount must be greater than 0")
});

// Add additional validation for optional itemId
export const insertTransactionSchemaWithValidation = insertTransactionSchema.extend({
  itemId: z.number().positive("Item ID must be positive").optional()
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  sentTransactions: many(transactions, { relationName: "sender" }),
  receivedTransactions: many(transactions, { relationName: "receiver" })
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  sender: one(users, { fields: [transactions.senderId], references: [users.id], relationName: "sender" }),
  receiver: one(users, { fields: [transactions.receiverId], references: [users.id], relationName: "receiver" }),
  item: one(catalogItems, { fields: [transactions.itemId], references: [catalogItems.id] })
}));

export const catalogItemsRelations = relations(catalogItems, ({ many }) => ({
  transactions: many(transactions)
}));

export const purchaseSchema = z.object({
  userId: z.number().positive(),
  itemSlug: z.string().min(1)
});

export type PurchaseRequest = z.infer<typeof purchaseSchema>;

// Rules schema
export const rules = pgTable("rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // E.g., "bargain", "discount", etc.
  parameters: text("parameters").notNull().default(JSON.stringify({})),
  isActive: integer("is_active").notNull().default(1), // 1 = active, 0 = inactive
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertRuleSchema = createInsertSchema(rules, {
  name: (schema) => schema.min(1, "Name is required"),
  description: (schema) => schema.min(1, "Description is required"),
  type: (schema) => schema.min(1, "Type is required"),
  parameters: (schema) => schema.min(1, "Parameters are required")
});

export type Rule = typeof rules.$inferSelect;
export type InsertRule = z.infer<typeof insertRuleSchema>;

// Bargain request schema
export const bargainSchema = z.object({
  userId: z.number().int().positive(),
  itemSlug: z.string().min(1),
  offeredPrice: z.number().int().positive(),
});

export type BargainRequest = z.infer<typeof bargainSchema>;


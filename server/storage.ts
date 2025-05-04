import { db } from "@db";
import * as schema from "@shared/schema";
import { and, eq, desc, sql, gt } from "drizzle-orm";

export const storage = {
  // Rules functions
  async getAllRules() {
    return await db.select().from(schema.rules);
  },

  async getRuleById(id: number) {
    const result = await db.select().from(schema.rules).where(eq(schema.rules.id, id)).limit(1);
    return result.length ? result[0] : null;
  },

  async createRule(data: schema.InsertRule) {
    return (await db.insert(schema.rules).values(data).returning())[0];
  },

  async updateRule(id: number, data: Partial<schema.InsertRule>) {
    return (await db.update(schema.rules).set(data).where(eq(schema.rules.id, id)).returning())[0];
  },

  async deleteRule(id: number) {
    return await db.delete(schema.rules).where(eq(schema.rules.id, id)).returning();
  },

  // User-related operations
  async getAllUsers() {
    return await db.select().from(schema.users);
  },
  
  async getUserById(id: number) {
    return await db.query.users.findFirst({
      where: eq(schema.users.id, id)
    });
  },
  
  async getUserByDiscordId(discordId: string) {
    return await db.query.users.findFirst({
      where: eq(schema.users.discordId, discordId)
    });
  },
  
  async updateUserBalance(userId: number, newBalance: number) {
    return await db.update(schema.users)
      .set({ balance: newBalance })
      .where(eq(schema.users.id, userId))
      .returning();
  },
  
  // Catalog items operations
  async getAllCatalogItems() {
     return await db.select().from(schema.catalogItems).orderBy(schema.catalogItems.price);
  },
  
  async getCatalogItemById(id: number) {
    return await db.query.catalogItems.findFirst({
      where: eq(schema.catalogItems.id, id)
    });
  },
  
  async getCatalogItemBySlug(slug: string) {
    return await db.query.catalogItems.findFirst({
      where: eq(schema.catalogItems.slug, slug)
    });
  },
  
  async createCatalogItem(data: schema.InsertCatalogItem) {
    return await db.insert(schema.catalogItems)
      .values(data)
      .returning();
  },
  
  async updateCatalogItem(id: number, data: Partial<schema.InsertCatalogItem>) {
    return await db.update(schema.catalogItems)
      .set(data)
      .where(eq(schema.catalogItems.id, id))
      .returning();
  },
  
  async deleteCatalogItem(id: number) {
    // Check if there are any transactions that reference this item
    const transactions = await db.query.transactions.findMany({
      where: eq(schema.transactions.itemId, id)
    });
    
    if (transactions.length > 0) {
      throw new Error("Cannot delete item that has been purchased");
    }
    
    return await db.delete(schema.catalogItems)
      .where(eq(schema.catalogItems.id, id))
      .returning();
  },
  
  // Transaction operations
  async createTransaction(data: schema.InsertTransaction) {
    return await db.insert(schema.transactions)
      .values(data)
      .returning();
  },
  
  async getTransactions(limit: number = 10) {
    return await db.query.transactions.findMany({
      orderBy: [desc(schema.transactions.createdAt)],
      limit,
      with: {
        sender: true,
        receiver: true,
        item: true
      }
    });
  },
  
  async getTransactionsByUserId(userId: number, limit: number = 10) {
    // Use separate queries with fixed conditions
    return await db.query.transactions.findMany({
      where: (transactions) => {
        return or(
          eq(transactions.senderId, userId),
          eq(transactions.receiverId, userId)
        );
      },
      orderBy: [desc(schema.transactions.createdAt)],
      limit,
      with: {
        sender: true,
        receiver: true,
        item: true
      }
    });
  },
  
  // Purchase item operation
  async purchaseItem(senderId: number, itemSlug: string, customPrice?: number) {
    // Get the sender
    const sender = await this.getUserById(senderId);
    if (!sender) {
      throw new Error("Sender not found");
    }
    
    // Get the item
    const item = await this.getCatalogItemBySlug(itemSlug);
    if (!item) {
      throw new Error("Item not found");
    }
    
    // Use the custom price if provided, otherwise use the item's original price
    const actualPrice = customPrice !== undefined ? customPrice : item.price;
    
    // Check if sender has enough balance
    if (sender.balance < actualPrice) {
      throw new Error("Insufficient balance");
    }
    
    // Find the other user (receiver)
    const users = await this.getAllUsers();
    const receiver = users.find(user => user.id !== sender.id);
    if (!receiver) {
      throw new Error("Receiver not found");
    }
    
    // Start a transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // Update sender's balance
      const newSenderBalance = sender.balance - actualPrice;
      await tx.update(schema.users)
        .set({ balance: newSenderBalance })
        .where(eq(schema.users.id, sender.id));
      
      // Update receiver's balance
      const newReceiverBalance = receiver.balance + actualPrice;
      await tx.update(schema.users)
        .set({ balance: newReceiverBalance })
        .where(eq(schema.users.id, receiver.id));
      
      // Create transaction record
      const [transaction] = await tx.insert(schema.transactions)
        .values({
          senderId: sender.id,
          receiverId: receiver.id,
          amount: actualPrice,
          itemId: item.id
        })
        .returning();
      
      return {
        transaction,
        sender: {
          ...sender,
          balance: newSenderBalance
        },
        receiver: {
          ...receiver,
          balance: newReceiverBalance
        },
        item,
        actualPrice // Return the actual price paid
      };
    });
  }
};

// Helper function for OR conditions (not provided by drizzle directly)
function or(...conditions: unknown[]) {
  return sql`(${conditions.join(" OR ")})`;
}

import { db } from "./index";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  try {
    console.log("Starting database seed...");
    
    // Check if users already exist
    const existingUsers = await db.select().from(schema.users);
    
    if (existingUsers.length === 0) {
      console.log("Seeding users...");
      
      // Create two initial users
      const usersToInsert = [
        {
          username: "user1",
          password: "password123", // In a real app, this would be hashed
          discordId: "12345678901234567890",
          displayName: "Alice",
          avatarColor: "bg-blue-500",
          balance: 5000
        },
        {
          username: "user2",
          password: "password123", // In a real app, this would be hashed
          discordId: "09876543210987654321",
          displayName: "Bob",
          avatarColor: "bg-green-500",
          balance: 3500
        }
      ];
      
      const insertedUsers = await db.insert(schema.users)
        .values(usersToInsert)
        .returning();
      
      console.log(`Created ${insertedUsers.length} users`);
    } else {
      console.log(`Found ${existingUsers.length} existing users, skipping user creation`);
    }
    
    // Check if catalog items already exist
    const existingItems = await db.select().from(schema.catalogItems);
    
    if (existingItems.length === 0) {
      console.log("Seeding catalog items...");
      
      // Create initial catalog items
      const itemsToInsert = [
        {
          name: "Coffee Run",
          description: "Get coffee for both of us",
          price: 150,
          slug: "coffee-run"
        },
        {
          name: "Movie Night",
          description: "Choose the movie for our movie night",
          price: 200,
          slug: "movie-night"
        },
        {
          name: "Dinner Takeout",
          description: "Choose where we order dinner from",
          price: 350,
          slug: "dinner-takeout"
        },
        {
          name: "Game Choice",
          description: "Pick the next game we play together",
          price: 250,
          slug: "game-choice"
        }
      ];
      
      const insertedItems = await db.insert(schema.catalogItems)
        .values(itemsToInsert)
        .returning();
      
      console.log(`Created ${insertedItems.length} catalog items`);
    } else {
      console.log(`Found ${existingItems.length} existing catalog items, skipping item creation`);
    }
    
    // Seed some initial transactions if there are none
    const existingTransactions = await db.select().from(schema.transactions);
    
    if (existingTransactions.length === 0) {
      // Get user IDs
      const users = await db.select().from(schema.users);
      if (users.length < 2) {
        console.log("Not enough users to create sample transactions");
        return;
      }
      
      const user1 = users[0];
      const user2 = users[1];
      
      // Get item IDs
      const items = await db.select().from(schema.catalogItems);
      if (items.length < 3) {
        console.log("Not enough catalog items to create sample transactions");
        return;
      }
      
      console.log("Seeding transactions...");
      
      // Create sample transactions
      const transactionsToInsert = [
        {
          senderId: user2.id,
          receiverId: user1.id,
          amount: 200,
          itemId: items.find(item => item.slug === "movie-night")?.id || items[0].id,
        },
        {
          senderId: user1.id,
          receiverId: user2.id,
          amount: 150,
          itemId: items.find(item => item.slug === "coffee-run")?.id || items[1].id,
        },
        {
          senderId: user2.id,
          receiverId: user1.id,
          amount: 350,
          itemId: items.find(item => item.slug === "dinner-takeout")?.id || items[2].id,
        }
      ];
      
      const insertedTransactions = await db.insert(schema.transactions)
        .values(transactionsToInsert)
        .returning();
      
      console.log(`Created ${insertedTransactions.length} sample transactions`);
    } else {
      console.log(`Found ${existingTransactions.length} existing transactions, skipping transaction creation`);
    }
    
    console.log("Database seed completed successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();

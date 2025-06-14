import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupDiscordBot } from "./discord";
import { z } from "zod";
import { purchaseSchema, insertCatalogItemSchema, insertRuleSchema, bargainSchema, users, transactions, catalogItems } from "@shared/schema";
import * as schema from "@shared/schema";

// Export BargainOffer type for use in other modules
export type BargainOffer = {
  userId: number;  // The user who made the offer
  itemSlug: string;
  offeredPrice: number;
  timestamp: Date;
};
import { fromZodError } from "zod-validation-error";
import { eq, or, desc, sql } from "drizzle-orm";
import { db } from "@db";

// Store active bargain offers by userId
const activeBargains: Map<number, BargainOffer> = new Map();

// Make activeBargains available globally for Discord bot usage
declare global {
  var activeBargains: Map<number, BargainOffer>;
}
global.activeBargains = activeBargains;

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Discord bot
  if (process.env.DISCORD_TOKEN) {
    try {
      await setupDiscordBot();
      console.log("Discord bot initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Discord bot:", error);
    }
  } else {
    console.warn("DISCORD_TOKEN not provided, bot features will not be available");
  }

  // API endpoints
  const apiPrefix = "/api";

  // Get all users
  app.get(`${apiPrefix}/users`, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get user by ID
  app.get(`${apiPrefix}/users/:id`, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Get all catalog items
  app.get(`${apiPrefix}/catalog`, async (req, res) => {
    try {
      const items = await storage.getAllCatalogItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching catalog items:", error);
      res.status(500).json({ error: "Failed to fetch catalog items" });
    }
  });
  
  // Get catalog item by ID
  app.get(`${apiPrefix}/catalog/:id`, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }
      
      const item = await storage.getCatalogItemById(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Error fetching catalog item:", error);
      res.status(500).json({ error: "Failed to fetch catalog item" });
    }
  });
  
  // Create a new catalog item
  app.post(`${apiPrefix}/catalog`, async (req, res) => {
    try {
      const data = insertCatalogItemSchema.parse(req.body);
      
      // Check if an item with the same slug already exists
      const existingItem = await storage.getCatalogItemBySlug(data.slug);
      if (existingItem) {
        return res.status(400).json({ error: "An item with this slug already exists" });
      }
      
      const [newItem] = await storage.createCatalogItem(data);
      res.status(201).json(newItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: fromZodError(error).message
        });
      }
      
      console.error("Error creating catalog item:", error);
      res.status(500).json({ error: "Failed to create catalog item" });
    }
  });
  
  // Update a catalog item
  app.put(`${apiPrefix}/catalog/:id`, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }
      
      // Check if the item exists
      const existingItem = await storage.getCatalogItemById(itemId);
      if (!existingItem) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // If slug is being changed, check if the new slug is already in use
      if (req.body.slug && req.body.slug !== existingItem.slug) {
        const itemWithSlug = await storage.getCatalogItemBySlug(req.body.slug);
        if (itemWithSlug && itemWithSlug.id !== itemId) {
          return res.status(400).json({ error: "An item with this slug already exists" });
        }
      }
      
      // Partial validation of the update data
      const updateData = insertCatalogItemSchema.partial().parse(req.body);
      
      const [updatedItem] = await storage.updateCatalogItem(itemId, updateData);
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: fromZodError(error).message
        });
      }
      
      console.error("Error updating catalog item:", error);
      res.status(500).json({ error: "Failed to update catalog item" });
    }
  });
  
  // Delete a catalog item
  app.delete(`${apiPrefix}/catalog/:id`, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }
      
      // Check if the item exists
      const existingItem = await storage.getCatalogItemById(itemId);
      if (!existingItem) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      const [deletedItem] = await storage.deleteCatalogItem(itemId);
      res.json(deletedItem);
    } catch (error) {
      console.error("Error deleting catalog item:", error);
      
      if (error instanceof Error && error.message === "Cannot delete item that has been purchased") {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: "Failed to delete catalog item" });
    }
  });

  // Get recent transactions
  app.get(`${apiPrefix}/transactions`, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const transactions = await storage.getTransactions(limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Get transactions for a specific user
  app.get(`${apiPrefix}/users/:id/transactions`, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const transactions = await storage.getTransactionsByUserId(userId, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching user transactions:", error);
      res.status(500).json({ error: "Failed to fetch user transactions" });
    }
  });

  // Purchase an item
  app.post(`${apiPrefix}/purchase`, async (req, res) => {
    try {
      const data = purchaseSchema.parse(req.body);
      
      const result = await storage.purchaseItem(data.userId, data.itemSlug);
      
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: fromZodError(error).message
        });
      }

      console.error("Error processing purchase:", error);
      
      // Handle specific error messages
      if (error instanceof Error) {
        const knownErrors = [
          "Sender not found", 
          "Item not found", 
          "Insufficient balance", 
          "Receiver not found"
        ];
        
        if (knownErrors.includes(error.message)) {
          return res.status(400).json({ error: error.message });
        }
      }
      
      res.status(500).json({ error: "Failed to process purchase" });
    }
  });

  // Simulate Discord command
  app.post(`${apiPrefix}/simulate-command`, async (req, res) => {
    try {
      const { userId, command } = req.body;
      
      if (!userId || !command) {
        return res.status(400).json({ 
          error: "Missing required fields",
          details: "Both userId and command are required"
        });
      }

      // Process the command and get a response
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const commandParts = command.trim().split(/\s+/);
      const commandName = commandParts[0].toLowerCase();
      
      let response: any = { type: "error", content: "Unknown command" };
      
      switch (commandName) {
        case "!help":
          response = {
            type: "help",
            content: {
              commands: [
                { name: "!balance", description: "Check your current balance" },
                { name: "!catalogue", description: "View items available for purchase" },
                { name: "!buy [item]", description: "Purchase an item from the catalogue" },
                { name: "!bargain [item] [price]", description: "Make a bargain offer for an item" },
                { name: "!accept", description: "Accept the last bargain offer" },
                { name: "!reject", description: "Reject the last bargain offer" },
                { name: "!all-in", description: "Transfer all your points to the other user" },
                { name: "!transactions", description: "View your recent transactions (last 5)" },
                { name: "!help", description: "Display this help message" }
              ]
            }
          };
          break;
          
        case "!balance":
          response = {
            type: "balance",
            content: {
              user,
            }
          };
          break;
          
        case "!catalogue":
        case "!catalog":
          const catalogItems = await storage.getAllCatalogItems();
          response = {
            type: "catalogue",
            content: {
              items: catalogItems
            }
          };
          break;
          
        case "!buy":
          if (commandParts.length < 2) {
            response = {
              type: "error",
              content: "Please specify an item to buy (e.g., !buy coffee-run)"
            };
            break;
          }
          
          const itemSlug = commandParts[1].toLowerCase();
          
          try {
            const purchaseResult = await storage.purchaseItem(user.id, itemSlug);
            response = {
              type: "purchase_success",
              content: {
                purchase: {
                  item: purchaseResult.item,
                  cost: purchaseResult.item.price,
                  newBalance: purchaseResult.sender.balance,
                  recipient: purchaseResult.receiver.displayName
                }
              }
            };
          } catch (purchaseError) {
            response = {
              type: "error",
              content: purchaseError instanceof Error ? purchaseError.message : "Failed to process purchase"
            };
          }
          break;

        case "!bargain":
          if (commandParts.length < 3) {
            response = {
              type: "error",
              content: "Please specify an item and price (e.g., !bargain coffee-run 100)"
            };
            break;
          }
          
          const bargainItemSlug = commandParts[1].toLowerCase();
          const offeredPrice = parseInt(commandParts[2]);
          
          if (isNaN(offeredPrice) || offeredPrice <= 0) {
            response = {
              type: "error",
              content: "Please provide a valid price (e.g., !bargain coffee-run 100)"
            };
            break;
          }
          
          try {
            // Check if the item exists
            const itemToBargain = await storage.getCatalogItemBySlug(bargainItemSlug);
            if (!itemToBargain) {
              response = {
                type: "error",
                content: `Item '${bargainItemSlug}' not found in catalog`
              };
              break;
            }
            
            // Check if the price is reasonable
            if (offeredPrice < 1) {
              response = {
                type: "error",
                content: `Offered price is too low. The minimum acceptable price is 1 minipoint.`
              };
              break;
            }
            
            // Check if user has enough balance
            if (user.balance < offeredPrice) {
              response = {
                type: "error",
                content: `You don't have enough balance for this offer. Your balance: ${user.balance}, Offered: ${offeredPrice}`
              };
              break;
            }
            
            // Store the bargain offer
            const bargainOffer: BargainOffer = {
              userId: user.id,
              itemSlug: bargainItemSlug,
              offeredPrice: offeredPrice,
              timestamp: new Date()
            };
            
            // Find the other user (for whom this offer is intended)
            const users = await storage.getAllUsers();
            const otherUser = users.find(u => u.id !== user.id);
            if (!otherUser) {
              response = {
                type: "error",
                content: "Could not find the other user to make an offer to"
              };
              break;
            }
            
            // Store the bargain in our Map using the other user's ID as the key
            // (since they're the one who will accept or reject it)
            activeBargains.set(otherUser.id, bargainOffer);
            
            // Success - bargain initiated
            response = {
              type: "bargain_initiated",
              content: {
                bargain: {
                  item: itemToBargain,
                  originalPrice: itemToBargain.price,
                  offeredPrice: offeredPrice,
                  discount: itemToBargain.price - offeredPrice,
                  discountPercentage: Math.round((itemToBargain.price - offeredPrice) / itemToBargain.price * 100)
                }
              }
            };
          } catch (bargainError) {
            response = {
              type: "error",
              content: bargainError instanceof Error ? bargainError.message : "Failed to process bargain"
            };
          }
          break;
          
        case "!transactions":
          try {
            // Get recent transactions for the user (limited to 5)
            const userTransactions = await db.query.transactions.findMany({
              where: (transactions) => {
                return or(
                  eq(transactions.senderId, user.id),
                  eq(transactions.receiverId, user.id)
                );
              },
              orderBy: [desc(schema.transactions.createdAt)],
              limit: 5,
              with: {
                sender: true,
                receiver: true,
                item: true
              }
            });
            
            if (userTransactions.length === 0) {
              response = {
                type: "transactions",
                content: {
                  transactions: [],
                  message: "You don't have any transactions yet."
                }
              };
              break;
            }
            
            // Format transactions like the UI displays them
            const formattedTransactions = userTransactions.map(tx => {
              const isOutgoing = tx.senderId === user.id;
              const otherParty = isOutgoing ? tx.receiver.displayName : tx.sender.displayName;
              const amountDisplay = isOutgoing ? `-${tx.amount}` : `+${tx.amount}`;
              const itemName = tx.item ? tx.item.name : "Direct transfer";
              
              return {
                ...tx,
                formattedAmount: amountDisplay,
                otherParty,
                direction: isOutgoing ? "sent" : "received",
                itemName
              };
            });
            
            response = {
              type: "transactions",
              content: {
                transactions: formattedTransactions
              }
            };
          } catch (transactionsError) {
            console.error("Transaction error:", transactionsError);
            response = {
              type: "error",
              content: transactionsError instanceof Error ? transactionsError.message : "Failed to fetch transactions"
            };
          }
          break;

        case "!accept":
          try {
            // Check if there's an active bargain offer for this user
            const activeBargain = activeBargains.get(user.id);
            if (!activeBargain) {
              response = {
                type: "error",
                content: "You don't have any active bargain offers to accept."
              };
              break;
            }
            
            // Process the purchase with the bargained price
            const purchaseResult = await storage.purchaseItem(
              activeBargain.userId, // The user who made the offer
              activeBargain.itemSlug,
              activeBargain.offeredPrice // Use the bargained price
            );
            
            // Clear the active bargain after processing
            activeBargains.delete(user.id);
            
            // Build the response
            const item = purchaseResult.item;
            response = {
              type: "bargain_accepted",
              content: {
                message: "You've accepted the bargain offer. The transaction has been processed at the discounted price.",
                bargain: {
                  item: item,
                  originalPrice: item.price,
                  agreedPrice: activeBargain.offeredPrice,
                  discount: item.price - activeBargain.offeredPrice,
                  discountPercentage: Math.round((item.price - activeBargain.offeredPrice) / item.price * 100)
                },
                transaction: purchaseResult.transaction
              }
            };
          } catch (acceptError) {
            response = {
              type: "error",
              content: acceptError instanceof Error ? acceptError.message : "Failed to process the bargain acceptance"
            };
          }
          break;
          
        case "!reject":
          try {
            // Check if there's an active bargain offer for this user
            const bargainToReject = activeBargains.get(user.id);
            if (!bargainToReject) {
              response = {
                type: "error",
                content: "You don't have any active bargain offers to reject."
              };
              break;
            }
            
            // Get the bargained item details for the response
            const rejectedItem = await storage.getCatalogItemBySlug(bargainToReject.itemSlug);
            
            // Remove the bargain offer
            activeBargains.delete(user.id);
            
            response = {
              type: "bargain_rejected",
              content: {
                message: "You've rejected the bargain offer. The item remains at its original price.",
                bargain: {
                  item: rejectedItem,
                  originalPrice: rejectedItem?.price,
                  offeredPrice: bargainToReject.offeredPrice
                }
              }
            };
          } catch (rejectError) {
            response = {
              type: "error",
              content: rejectError instanceof Error ? rejectError.message : "Failed to process the bargain rejection"
            };
          }
          break;
          
        case "!all-in":
          try {
            // Find the other user who will receive the points
            const allUsers = await storage.getAllUsers();
            const receiver = allUsers.find(u => u.id !== user.id);
            if (!receiver) {
              response = {
                type: "error",
                content: "Could not find another user to transfer points to."
              };
              break;
            }
            
            // Get latest user data (in case it changed)
            const currentUser = await storage.getUserById(user.id);
            if (!currentUser) {
              response = {
                type: "error",
                content: "Could not find your user data."
              };
              break;
            }
            
            // Check if user has any balance at all
            if (currentUser.balance <= 0) {
              response = {
                type: "error",
                content: "You don't have any points to transfer."
              };
              break;
            }
            
            const amountToTransfer = currentUser.balance;
            
            // Start a database transaction for consistency
            const transferResult = await db.transaction(async (tx) => {
              // 1. Update the receiver balance
              const newReceiverBalance = receiver.balance + amountToTransfer;
              await tx.update(schema.users)
                .set({ balance: newReceiverBalance })
                .where(eq(schema.users.id, receiver.id));
              
              // 2. Create a transaction record
              // Use raw insert without itemId
              const [transaction] = await tx.insert(schema.transactions)
                .values({
                  senderId: currentUser.id,
                  receiverId: receiver.id,
                  amount: amountToTransfer
                  // Deliberately omit itemId for direct transfers
                })
                .returning();
              
              // 3. Update the sender's balance (set to 0)
              await tx.update(schema.users)
                .set({ balance: 0 })
                .where(eq(schema.users.id, currentUser.id));
                
              return {
                transaction,
                receiverBalance: newReceiverBalance,
                transferAmount: amountToTransfer
              };
            });
            
            // Build the response
            response = {
              type: "all_in_success",
              content: {
                message: `You've transferred all your ${transferResult.transferAmount} points to ${receiver.displayName}!`,
                transfer: {
                  amount: transferResult.transferAmount,
                  newSenderBalance: 0,
                  receiver: receiver.displayName
                },
                transaction: transferResult.transaction
              }
            };
          } catch (allInError) {
            response = {
              type: "error",
              content: allInError instanceof Error ? allInError.message : "Failed to process all-in transfer"
            };
          }
          break;
          
        default:
          response = {
            type: "error",
            content: `Unknown command: ${commandName}. Try !help for a list of commands.`
          };
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error processing simulated command:", error);
      res.status(500).json({ 
        error: "Failed to process command", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Rules API endpoints
  // Get all rules
  app.get(`${apiPrefix}/rules`, async (req, res) => {
    try {
      const rules = await storage.getAllRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching rules:", error);
      res.status(500).json({ error: "Failed to fetch rules" });
    }
  });

  // Get rule by ID
  app.get(`${apiPrefix}/rules/:id`, async (req, res) => {
    try {
      const ruleId = parseInt(req.params.id);
      if (isNaN(ruleId)) {
        return res.status(400).json({ error: "Invalid rule ID" });
      }

      const rule = await storage.getRuleById(ruleId);
      if (!rule) {
        return res.status(404).json({ error: "Rule not found" });
      }

      res.json(rule);
    } catch (error) {
      console.error("Error fetching rule:", error);
      res.status(500).json({ error: "Failed to fetch rule" });
    }
  });

  // Create a new rule
  app.post(`${apiPrefix}/rules`, async (req, res) => {
    try {
      const data = insertRuleSchema.parse(req.body);
      const newRule = await storage.createRule(data);
      res.status(201).json(newRule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: fromZodError(error).message
        });
      }

      console.error("Error creating rule:", error);
      res.status(500).json({ error: "Failed to create rule" });
    }
  });

  // Update a rule
  app.put(`${apiPrefix}/rules/:id`, async (req, res) => {
    try {
      const ruleId = parseInt(req.params.id);
      if (isNaN(ruleId)) {
        return res.status(400).json({ error: "Invalid rule ID" });
      }

      // Check if the rule exists
      const existingRule = await storage.getRuleById(ruleId);
      if (!existingRule) {
        return res.status(404).json({ error: "Rule not found" });
      }

      // Partial validation of the update data
      const updateData = insertRuleSchema.partial().parse(req.body);

      const updatedRule = await storage.updateRule(ruleId, updateData);
      res.json(updatedRule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: fromZodError(error).message
        });
      }

      console.error("Error updating rule:", error);
      res.status(500).json({ error: "Failed to update rule" });
    }
  });

  // Delete a rule
  app.delete(`${apiPrefix}/rules/:id`, async (req, res) => {
    try {
      const ruleId = parseInt(req.params.id);
      if (isNaN(ruleId)) {
        return res.status(400).json({ error: "Invalid rule ID" });
      }

      // Check if the rule exists
      const existingRule = await storage.getRuleById(ruleId);
      if (!existingRule) {
        return res.status(404).json({ error: "Rule not found" });
      }

      const [deletedRule] = await storage.deleteRule(ruleId);
      res.json(deletedRule);
    } catch (error) {
      console.error("Error deleting rule:", error);
      res.status(500).json({ error: "Failed to delete rule" });
    }
  });

  // Bargain endpoint
  app.post(`${apiPrefix}/bargain`, async (req, res) => {
    try {
      const data = bargainSchema.parse(req.body);
      
      // Get the user
      const user = await storage.getUserById(data.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get the item
      const item = await storage.getCatalogItemBySlug(data.itemSlug);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // Check if the offered price is reasonable (e.g., not too low)
      if (data.offeredPrice < item.price * 0.5) {
        return res.status(400).json({ error: "Offered price is too low" });
      }
      
      // Check if the user has enough balance
      if (user.balance < data.offeredPrice) {
        return res.status(400).json({ error: "Insufficient balance" });
      }
      
      // In a real application, we might create a pending bargain request here
      // and notify the other user for approval
      // For now, we'll just return a success response
      res.json({
        status: "pending",
        message: "Bargain request submitted",
        details: {
          item,
          originalPrice: item.price,
          offeredPrice: data.offeredPrice,
          user
        }
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: fromZodError(error).message
        });
      }
      
      console.error("Error processing bargain:", error);
      res.status(500).json({ error: "Failed to process bargain request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

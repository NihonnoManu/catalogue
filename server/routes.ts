import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupDiscordBot } from "./discord";
import { z } from "zod";
import { purchaseSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

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

  const httpServer = createServer(app);
  return httpServer;
}

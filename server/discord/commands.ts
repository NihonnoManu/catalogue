import { MessageCreateOptions } from 'discord.js';
import { storage } from '../storage';
import { User, CatalogItem } from '@shared/schema';
import { db } from '@db';
import { eq, or, desc } from 'drizzle-orm';
import * as schema from '@shared/schema';
import { BargainOffer } from '../routes';

/**
 * Process a command and return the response
 */
export async function handleCommand(commandText: string, user: User): Promise<string | MessageCreateOptions> {
  // Parse the command
  const parts = commandText.trim().split(/\s+/);
  const command = parts[0].toLowerCase();

  try {
    switch (command) {
      case '!help':
        return getHelpMessage();
      
      case '!balance':
        return getBalanceMessage(user);
      
      case '!catalogue':
      case '!catalog':
        return await getCatalogueMessage();
      
      case '!buy':
        if (parts.length < 2) {
          return 'Please specify an item to buy (e.g., !buy coffee-run)';
        }
        return await handlePurchase(user.id, parts[1]);
      
      case '!transactions':
        return await getTransactionsMessage(user.id);
        
      case '!bargain':
        if (parts.length < 3) {
          return 'Please specify an item and price (e.g., !bargain coffee-run 3)';
        }
        const itemSlug = parts[1];
        const offeredPrice = parseFloat(parts[2]);
        if (isNaN(offeredPrice)) {
          return 'Please provide a valid price (e.g., !bargain coffee-run 3)';
        }
        return await handleBargain(user.id, itemSlug, offeredPrice);
        
      case '!accept':
        return await handleBargainResponse(user.id, true);
        
      case '!reject':
        return await handleBargainResponse(user.id, false);
        
      case '!all-in':
        return await handleAllIn(user.id);

      case '!rules':
        return await getRulesMessage();

      case '!teodio':
      case 'teodio':
	return await getTeOdioMessage(user);
      
      default:
        return `Unknown command: ${command}. Try !help for a list of commands.`;
    }
  } catch (error) {
    console.error('Error handling command:', error);
    return `Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`;
  }
}

/**
 * Generate the help message
 */
function getHelpMessage(): string {
  return `
**MiniPoints Economy Bot Commands**

\`!balance\` - Check your current balance
\`!catalogue\` - View items available for purchase
\`!buy [item]\` - Purchase an item from the catalogue
\`!bargain [item] [price]\` - Make a bargain offer for an item
\`!accept\` - Accept the last bargain offer
\`!reject\` - Reject the last bargain offer
\`!all-in\` - Transfer all your points to the other user
\`!transactions\` - View your recent transactions (last 5)
\`!rules\` - View special rules
\`!teodio\` - Show your hate randomly
\`!help\` - Display this help message
`;
}

/**
 * Generate the balance message
 */
function getBalanceMessage(user: User): string {
  return `
**Current Balance**
User: ${user.displayName}
Balance: **${user.balance} MP**
`;
}

/**
 * Generate the catalogue message
 */
async function getCatalogueMessage(): Promise<string> {
  const items = await storage.getAllCatalogItems();
  
  if (items.length === 0) {
    return 'No items are currently available in the catalogue.';
  }
  
  let message = '**Catalogue Items**\n\n';
  
  items.forEach(item => {
    message += `**${item.name}** - ${item.price} MP\n`;
    message += `${item.description}\n`;
    message += `To purchase: \`!buy ${item.slug}\`\n\n`;
  });
  
  return message;
}

/**
 * Handle a purchase command
 */
async function handlePurchase(userId: number, itemSlug: string): Promise<string> {
  try {
    const result = await storage.purchaseItem(userId, itemSlug);
    
    return `
**Purchase Successful!**
Item: ${result.item.name}
Cost: -${result.item.price} MP
New Balance: ${result.sender.balance} MP

Points have been transferred to ${result.receiver.displayName}
`;
  } catch (error) {
    return `Purchase failed: ${error instanceof Error ? error.message : 'An error occurred'}`;
  }
}

/**
 * Get recent transactions for a user
 */
async function getTransactionsMessage(userId: number): Promise<string> {
  try {
    // Get recent transactions for the user (limited to 5)
    const userTransactions = await db.query.transactions.findMany({
      where: (transactions) => {
        return or(
          eq(transactions.senderId, userId),
          eq(transactions.receiverId, userId)
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
      return 'You don\'t have any transactions yet.';
    }
    
    // Format the transactions nicely for Discord
    let message = '**Recent Transactions**\n\n';
    
    userTransactions.forEach(tx => {
      const isOutgoing = tx.senderId === userId;
      const otherParty = isOutgoing ? tx.receiver.displayName : tx.sender.displayName;
      const amountDisplay = isOutgoing ? `-${tx.amount}` : `+${tx.amount}`;
      const itemName = tx.item ? tx.item.name : 'Direct transfer';
      const date = new Date(tx.createdAt).toLocaleDateString();


      // Format the transaction date/time
      const transactionDate = new Date(tx.createdAt);
      const dateStr = transactionDate.toLocaleDateString();
      const timeStr = transactionDate.toLocaleTimeString(["es-ES"], { hour: '2-digit', minute: '2-digit' });

      message += `**${itemName}** (${dateStr} ${timeStr})\n`;
      message += `${isOutgoing ? 'To' : 'From'}: ${otherParty}\n`;
      message += `Amount: ${amountDisplay} MP\n\n`;
    });
    
    return message;
  } catch (error) {
    console.error('Transaction error:', error);
    return `Failed to get transaction history: ${error instanceof Error ? error.message : 'An error occurred'}`;
  }
}

/**
 * Handle a bargain offer
 */
async function handleBargain(userId: number, itemSlug: string, offeredPrice: number): Promise<string> {
  try {
    // Get the user
    const user = await storage.getUserById(userId);
    if (!user) {
      return 'User not found';
    }
    
    // Get the item
    const item = await storage.getCatalogItemBySlug(itemSlug);
    if (!item) {
      return `Item "${itemSlug}" not found in catalog.`;
    }
    
    // Check if the offered price is reasonable (e.g., not too low)
    if (offeredPrice < item.price * 0.5) {
      return `Offered price is too low. Minimum price is ${Math.ceil(item.price * 0.5)} minipoints.`;
    }
    
    // Check if the user has enough balance
    if (user.balance < offeredPrice) {
      return `You don't have enough balance. Current balance: ${user.balance} MP.`;
    }
    
    // Find the other user
    const users = await storage.getAllUsers();
    const receiver = users.find(u => u.id !== userId);
    if (!receiver) {
      return 'Could not find another user to bargain with.';
    }
    
    // Store the bargain offer in a map (simulating saving to database)
    // In a real implementation, this would be stored in a database
    const bargainOffer = {
      userId,
      itemSlug,
      offeredPrice,
      timestamp: new Date()
    };
    
    // Import the map from routes.ts (this is a simplification)
    // In a real implementation, this would be handled better
    const activeBargains = global.activeBargains || new Map();
    activeBargains.set(receiver.id, bargainOffer);
    global.activeBargains = activeBargains;
    
    const discount = item.price - offeredPrice;
    const discountPercentage = Math.round((discount / item.price) * 100);
    
    return `
**Bargain Offer Sent!**
Item: ${item.name}
Original Price: ${item.price} MP
Your Offer: ${offeredPrice} MP
Discount: ${discount} MP (${discountPercentage}%)

Your offer has been sent to ${receiver.displayName}. They can use !accept or !reject to respond.
`;
  } catch (error) {
    console.error('Bargain error:', error);
    return `Failed to process bargain: ${error instanceof Error ? error.message : 'An error occurred'}`;
  }
}

/**
 * Handle accepting or rejecting a bargain
 */
async function handleBargainResponse(userId: number, accept: boolean): Promise<string> {
  try {
    // Check if there's an active bargain offer for this user
    const activeBargains = global.activeBargains || new Map();
    const bargainOffer = activeBargains.get(userId);
    
    if (!bargainOffer) {
      return 'You don\'t have any active bargain offers to respond to.';
    }
    
    if (accept) {
      // Process the purchase with the bargained price
      const result = await storage.purchaseItem(
        bargainOffer.userId,
        bargainOffer.itemSlug,
        bargainOffer.offeredPrice
      );
      
      // Clear the active bargain after processing
      activeBargains.delete(userId);
      
      const item = result.item;
      const discount = item.price - bargainOffer.offeredPrice;
      const discountPercentage = Math.round((discount / item.price) * 100);
      
      return `
**Bargain Accepted!**
Item: ${item.name}
Original Price: ${item.price} MP
Agreed Price: ${bargainOffer.offeredPrice} MP
Discount: ${discount} MP (${discountPercentage}%)

The transaction has been processed at the agreed price.
`;
    } else {
      // Get the bargained item details for the response
      const rejectedItem = await storage.getCatalogItemBySlug(bargainOffer.itemSlug);
      
      // Remove the bargain offer
      activeBargains.delete(userId);
      
      return `
**Bargain Rejected**
You've rejected the bargain offer for ${rejectedItem?.name || 'the item'}.
The item remains at its original price of ${rejectedItem?.price || '?'} MP.
`;
    }
  } catch (error) {
    console.error('Bargain response error:', error);
    return `Failed to process the ${accept ? 'acceptance' : 'rejection'}: ${error instanceof Error ? error.message : 'An error occurred'}`;
  }
}

/**
 * Handle the all-in command
 */
async function handleAllIn(userId: number): Promise<string> {
  try {
    // Find the other user who will receive the points
    const allUsers = await storage.getAllUsers();
    const receiver = allUsers.find(u => u.id !== userId);
    if (!receiver) {
      return 'Could not find another user to transfer points to.';
    }
    
    // Get latest user data (in case it changed)
    const currentUser = await storage.getUserById(userId);
    if (!currentUser) {
      return 'Could not find your user data.';
    }
    
    // Check if user has any balance at all
    if (currentUser.balance <= 0) {
      return 'You don\'t have any points to transfer.';
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
    
    return `
**ALL-IN! 🔥**
You've transferred all your ${transferResult.transferAmount} points to ${receiver.displayName}!
Your new balance: 0 MP
${receiver.displayName}'s new balance: ${transferResult.receiverBalance} MP
`;
    
  //console.log("Transfer ID: ${transferResult.transaction.id}");
    
  } catch (error) {
    console.error('All-in error:', error);
    return `Failed to transfer all points: ${error instanceof Error ? error.message : 'An error occurred'}`;
  }
}

/**
 * Generate the catalogue message
 */
async function getRulesMessage(): Promise<string> {
  const rules = await storage.getAllRules();
  
  if (rules.length === 0) {
    return 'No rules are currently available in the catalogue.';
  }
  
  let message = '**Rules**\n\n';
  
  rules.forEach(rule => {
    message += `**${rule.name}**\n`;
    message += `${rule.description}\n`;
  });
  
  return message;
}

/**
 * Generate te odio message
 */


async function getTeOdioMessage(user): Promise<string> {
  
  let message = '**Traducción**\n\n';
  message += `Lo que ${user.displayName} intenta decir es:\n`;

  let teodio = ["Me gustas","Me encantas","Daisuki","d)","Te quiero","Me apeteces"]

  let rdm = Math.floor(Math.random() * (5 - 0 + 1) + 0);

  console.log(user.id=='2')
  
  if(rdm==3 && user.id=='2')
    message +=`**De rodillas**\n`;
  if(rdm==3 && user.id=='1')
    message +=`**¿Un ratito más?**\n`;
  else
    message +=`**${teodio[rdm]}**\n`;
  
//  rules.forEach(rule => {
//   message += `**${rule.name}**\n`;
//    message += `${rule.description}\n`;
//  });

  return message;
}

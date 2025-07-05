import { MessageCreateOptions } from 'discord.js';
import { storage } from '../storage';
import { User, CatalogItem } from '@shared/schema';
import { db } from '@db';
import { eq, or, desc, and, gte, lt } from 'drizzle-orm';
import * as schema from '@shared/schema';
import { BargainOffer } from '../routes';
import { Mission } from '../missions';

/**
 * Process a command and return the response
 */
export async function handleCommand(commandText: string, user: User): Promise<string | MessageCreateOptions> {
  // Parse the command
  const parts = commandText.trim().split(/\s+/);  // Split by whitespace
  const command = parts[0].toLowerCase();

  try {
    switch (command) {
      case '!help':
        return getHelpMessage();
      
      case '!balance':
        return getBalanceMessage(user);
      
      case '!catalogue':
      case '!catalog':
      case '!catalogo':
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
        
      case '!robinhood':
        return await handleRobinHood(user.id);

      case '!steal':
        return await handleSteal(user.id);

      case '!teodio':
      case 'teodio':
      	return await getTeOdioMessage(user);
      
      
      case '!addmission':
        //Split the command text to get the mission name and description by " - "
        const  missionToAdd = commandText.trim().split(' - '); // Split by " - "
        if (missionToAdd.length < 3) {
          return 'Please provide a valid description (e.g., !addmission - Hola - Di hola)';
        }
        const missionName = missionToAdd[1];
        const description = missionToAdd[2];
        // Check if description is empty or not
        if (!missionName || !description) {
          return 'Please provide a valid description (e.g., !addmission - Hola - Di hola)';
        }

        return await addMissionToPool(user.id, missionName, description);
      
      case '!mission':
        // Get the active mission for the user
        return await getActiveMissionForUser(user.id);
        
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
\`!robinhood\` - Steal half of the other user's points if they haven't made a transaction in the last 24 hours
\`!steal\` - Try to steal a point from the other user with a 66% chance of success. If you fail, you will give a point to the other user instead. You can only use this command once every 2 hours.
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
      let itemName = tx.item ? tx.item.name : 'Direct transfer (All-in or Robin Hood)';

      if( tx.itemId == "1001" ) {
        itemName = 'Steal';
      }

      
      const date = new Date(tx.createdAt).toLocaleDateString();


      // Format the transaction date/time
      const transactionDate = new Date(tx.createdAt);
      const dateStr = transactionDate.toLocaleDateString("es-ES", {
        timeZone: "UTC" // Use UTC to avoid timezone issues with the Database timestamps
      });;
      const timeStr = transactionDate.toLocaleTimeString(["es-ES"], { 
        timeZone: "UTC", // Use UTC to avoid timezone issues with the Database timestamps
        hour: '2-digit', 
        minute: '2-digit' 
      });

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
    if (offeredPrice < 1) {
      return `Offered price is too low. Minimum price is 1 minipoint.`;
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

/**
 * Create a function to steal half of the other user's points in case of not having done a transaction in the last 24 hours.
 * This function will be called when the user types !robinhood command. The ID of the user from whom points are being stolen
 * its the ID of the user that's not calling the command.
 * @param userId - The ID of the user who is trying to steal points
 * @return A message indicating the result of the operation
 * */
async function handleRobinHood(userId: number): Promise<string> {
  try {
    // Get the user who is trying to steal points
    const user = await storage.getUserById(userId);
    if (!user) {
      return 'User not found';
    }
    
    // Get the other user (the one from whom points will be stolen)
    const allUsers = await storage.getAllUsers();
    const otherUser = allUsers.find(u => u.id !== userId);
    if (!otherUser) {
      return 'Could not find another user to steal points from.';
    }
    
    // Check if the other user has made a transaction in the last 24 hours
    const lastTransaction = await db.query.transactions.findFirst({
      where: eq(schema.transactions.senderId, otherUser.id),
      orderBy: [desc(schema.transactions.createdAt)],
      limit: 1
    });
    
    if (lastTransaction && new Date(lastTransaction.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000) {
      return `${otherUser.displayName} has made a transaction in the last 24 hours. You cannot steal points right now.`;
    }
    
    // Calculate half of the other user's balance, rounded down
    if (otherUser.balance <= 0 || otherUser.balance < user.balance) {
      return `${otherUser.displayName} has no points to steal or has less points than you.`;
    }
    const amountToSteal = Math.floor(otherUser.balance / 2);
    if (amountToSteal <= 0) {
      return `${otherUser.displayName} has no points to steal.`;
    }

    // Start a database transaction for consistency
    await db.transaction(async (tx) => {
      // Update the other user's balance
      await tx.update(schema.users)
        .set({ balance: otherUser.balance - amountToSteal })
        .where(eq(schema.users.id, otherUser.id));
      
      // Update the stealing user's balance
      await tx.update(schema.users)
        .set({ balance: user.balance + amountToSteal })
        .where(eq(schema.users.id, user.id));
      
      // Create a transaction record for the theft
      await tx.insert(schema.transactions)
        .values({
          senderId: otherUser.id,
          receiverId: user.id,
          amount: amountToSteal,
          itemId: null // No item involved in this case
        });
    });
    
    let message = '**Robin hood has made an appearance!**\n\n';
    message += `${amountToSteal} MP has been stolen from ${otherUser.displayName}\n\n`;
    
    return message;
  } catch (error) {
    console.error('Transaction error:', error);
    return `Failed to get transaction history: ${error instanceof Error ? error.message : 'An error occurred'}`;
  }
}


/**
 * Create a function to try and steal a point from the other user with a 66% chance of success.
 * If the user fails they will, instead, give a point to the other user.
 * You can only use this command once every 2 hours, this will be checked by looking at the transactions table.
 * The item id will be "1001" for this transaction, so you can check it with it later.
 * This function will be called when the user types !steal command.
 * @param userId - The ID of the user who is trying to steal points
 * @return A message indicating the result of the operation.
 * */
async function handleSteal(userId: number): Promise<string> {
  try {
    // Get the user who is trying to steal points
    const user = await storage.getUserById(userId);
    if (!user) {
      return 'User not found';
    }
    
    // Get the other user (the one from whom points will be stolen)
    const allUsers = await storage.getAllUsers();
    const otherUser = allUsers.find(u => u.id !== userId);
    if (!otherUser) {
      return 'Could not find another user to steal points from.';
    }
    
    // Check if the user has used this command in the last 2 hours by looking at the last transaction with itemId "1001" made by the userId, if it exists.
    const lastStealTransaction = await db.query.transactions.findFirst({
      where: and(eq(schema.transactions.itemId, '1001'),
      eq(schema.transactions.receiverId, userId),
      ),
      orderBy: [desc(schema.transactions.createdAt)],
      limit: 1
    });

    // If the last steal transaction exists and was made less than 2 hours ago, return an error message 
    if (lastStealTransaction && new Date(lastStealTransaction.createdAt).getTime() > Date.now() - 2 * 60 * 60 * 1000) {
      return 'You can only use this command once every 2 hours.';
    }
    
    // Generate a random number to determine success (66% chance)
    const success = Math.random() < 0.66;
    
    let amountToSteal = 1;
    
    if (success) {
      // Steal a point from the other user
      if (otherUser.balance <= 0 || otherUser.balance < amountToSteal) {
        return `${otherUser.displayName} has no points to steal.`;
      }
      
      // Start a database transaction for consistency
      await db.transaction(async (tx) => {
        // Update the other user's balance
        await tx.update(schema.users)
          .set({ balance: otherUser.balance - amountToSteal })
          .where(eq(schema.users.id, otherUser.id));
        
        // Update the stealing user's balance
        await tx.update(schema.users)
          .set({ balance: user.balance + amountToSteal })
          .where(eq(schema.users.id, user.id));
        
        // Create a transaction record for the theft
        await tx.insert(schema.transactions)
          .values({
            senderId: otherUser.id,
            receiverId: user.id,
            amount: amountToSteal,
            itemId: '1001' // Special item ID for this transaction
          });
      });
        
      let message = '**You stole a point!**\n\n';
      message += `${amountToSteal} MP has been stolen from ${otherUser.displayName}\n\n`;


      return message;

    } else {
      // Give a point to the other user instead
      if (user.balance <= 0) {
        return 'You have no points to give.';
      }
      
      // Start a database transaction for consistency
      await db.transaction(async (tx) => {
        // Update the other user's balance
        await tx.update(schema.users)
          .set({ balance: otherUser.balance + amountToSteal })
          .where(eq(schema.users.id, otherUser.id));
        
        // Update the stealing user's balance
        await tx.update(schema.users)
          .set({ balance: user.balance - amountToSteal })
          .where(eq(schema.users.id, user.id));
        
        // Create a transaction record for the theft
        await tx.insert(schema.transactions)
          .values({
            senderId: user.id,
            receiverId: otherUser.id,
            amount: amountToSteal,
            itemId: '1001' // Special item ID for this transaction
          });
      });
      
      let message = '**You failed to steal a point!**\n\n';
      message += `You gave ${amountToSteal} MP to ${otherUser.displayName}\n\n`;
      
      return message;
    }
  }
  catch (error) {
    console.error('Steal error:', error);
    return `Failed to steal points: ${error instanceof Error ? error.message : 'An error occurred'}`;
  }
}








/*
*APARTADO PARA LAS MISIONES.
*/


/*
Sería tener un pool de misiones aleatorias, de las cuales una se asigna diariamente a cada usuario, se le comunicaría a ese usuario de manera secreta, 
al completarse una misión se consigue un descuento de 1 minipunto en la siguiente compra. 
Si ambos consiguen completar la misión dicho descuento se anula. Cuando un jugador consigue completar su misión esta se anuncia como completada. 
*/
// Function to create a new mission
export async function createMission(mission: Mission): Promise<Mission> {
  const { id, name, description, reward } = mission;

  // Insert the mission into the database
  const result = await db.insert(schema.missions).values({
    id,
    name,
    description,
    reward
  }).returning();

  // Return the newly created mission
  return result[0];
}

function addMissionToPool(userId: number, missionName: string, description: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if the user exists
    storage.getUserById(userId)
      .then(user => {
        if (!user) {
          return reject('User not found');
        }

        // Create a new mission
        const newMission: Mission = {
          name: missionName,
          description,
          reward: 1 // Default reward for completing a mission
        };

        // Add the mission to the pool (this would typically involve saving to a database)
        createMission(newMission)
          .then(mission => resolve(`Mission "${mission.name}" added successfully!`))
          .catch(err => reject(`Failed to add mission: ${err}`));
      })
      .catch(err => reject(`Error fetching user: ${err}`));
  });
}

/**
 * Function to assign a random mission to a user from the pool of available missions.
 * This function will be automatically called daily to assign a new mission to each user.
 * @param userId - The ID of the user to whom the mission will be assigned
 * @return A message indicating the assigned mission
 * This function will also send a private message to the user with the details of the assigned mission.
 * It will create a new entry in the active_missions table with isCompleted set to false.
 * When the user completes the mission, they will call a command like !completemission [missionId] to mark it as completed.
 * The function will then update the isCompleted field to true and send a message to the group so the other user is also notified.
 */
export async function assignRandomMissionToUser(userId: number): Promise<string> {
  try {
    // Get all available missions
    const missions = await db.query.missions.findMany();
    
    if (missions.length === 0) {
      return 'No missions available at the moment.';
    }
    
    // Select a random mission
    const randomMission = missions[Math.floor(Math.random() * missions.length)];
    
    // Create an entry in the active_missions table
    await db.insert(schema.activeMissions).values({
      userId,
      missionId: randomMission.id,
      isCompleted: false
    });
    
    // Send a private message to the user with the mission details
    const user = await storage.getUserById(userId);
    if (user) {
      return `You have been assigned a new mission: **${randomMission.name}**\nDescription: ${randomMission.description}\nReward: ${randomMission.reward} MP`;
    } else {
      return 'User not found';
    }
  } catch (error) {
    console.error('Error assigning mission:', error);
    return `Failed to assign mission: ${error instanceof Error ? error.message : 'An error occurred'}`;
  }
}


/* Daily assign a random mission to both users. The way it's going to work is that each user will check if they have an active mission assigned to them for today,
* if not, they will be automatically assigned one through assignRandomMissionToUser(userId: number) function, which will select a random mission from the pool.
* if the user already has an active mission assigned to them, they will not be assigned a new one until next day.
* This function will show the assigned mission to the user and it's status (completed or not) when they type !mission command.
* The user can complete the mission by typing !completemission [missionId] command.
*/
export async function getActiveMissionForUser(userId: number): Promise<string> {
  try {
  // Definir fechas para hoy y mañana
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  let message;

  // Consultar la misión activa para el usuario
  const activeMission = await db.query.activeMissions.findFirst({
    where: {
      userId: userId,
      createdAt: {
        gte: today, // Fecha de inicio (hoy)
        lt: tomorrow // Fecha de fin (mañana)
      }
    },
    include: {
      mission: true // Incluir los detalles de la misión
    }
  });

  // Si no hay misión activa, asignar una nueva
  if (!activeMission) {
    await assignRandomMissionToUser(userId);
    message = 'You had no active missions assigned for today. A new mission has been assigned to you. Use !mission to check it.';
  } else {
    // Si existe una misión activa, mostrar los detalles
    const mission = activeMission.mission;
    message = `**Active Mission**\nName: ${mission.name}\nDescription: ${mission.description}\nReward: ${mission.reward} MP of discount\nStatus: ${activeMission.isCompleted ? 'Completed' : 'In Progress'}`;
  }

  return message;
} catch (error) {
  console.error('Error fetching active mission:', error);
  return `Failed to fetch active mission: ${error instanceof Error ? error.message : 'An error occurred'}`;
}

}



  


import { MessageCreateOptions } from 'discord.js';
import { storage } from '../storage';
import { User } from '@shared/schema';

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

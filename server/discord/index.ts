import { Client, GatewayIntentBits, Events } from 'discord.js';
import { storage } from '../storage';
import { handleCommand } from './commands';

let client: Client | null = null;

export async function setupDiscordBot() {
  // Check if we have the required environment variables
  if (!process.env.DISCORD_TOKEN) {
    throw new Error("DISCORD_TOKEN is required to run the Discord bot");
  }

  // Initialize Discord.js client
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ]
  });

  // Handle ready event
  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Discord bot ready! Logged in as ${readyClient.user.tag}`);
  });

  // Handle incoming messages
  client.on(Events.MessageCreate, async (message) => {
    // Ignore messages from bots to prevent loops
    if (message.author.bot) return;

    // Check if this is a command (starts with !)
    if (message.content.startsWith('!')) {
      try {
        // Get user from database or create if it doesn't exist
        const discordId = message.author.id;
        let user = await storage.getUserByDiscordId(discordId);
        
        if (!user) {
          console.log(`User with Discord ID ${discordId} not found in database. The command will not be processed.`);
          await message.reply("You don't seem to be registered in our system. Please contact an administrator.");
          return;
        }
        
        // Process the command
        const response = await handleCommand(message.content, user);
        
        // Send the response back to Discord
        if (response) {
          await message.reply(response);
        }
      } catch (error) {
        console.error('Error handling command:', error);
        await message.reply('Sorry, there was an error processing your command. Please try again later.');
      }
    }
  });

  // Log in to Discord
  try {
    await client.login(process.env.DISCORD_TOKEN);
    return client;
  } catch (error) {
    console.error('Failed to log in to Discord:', error);
    throw error;
  }
}

export function getDiscordClient() {
  if (!client) {
    throw new Error('Discord client not initialized. Call setupDiscordBot first.');
  }
  return client;
}

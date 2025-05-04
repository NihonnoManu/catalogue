// Test the catalogue functionality directly
import { storage } from './server/storage';

async function testCatalogue() {
  try {
    // First, get all catalog items directly from storage
    console.log('Getting all catalog items...');
    const items = await storage.getAllCatalogItems();
    console.log(`Found ${items.length} catalog items:`);
    console.log(items);
    
    if (items.length === 0) {
      console.log('No catalog items found!');
      return;
    }
    
    // Create formatted message
    let message = '**Catalogue Items**\n\n';
    
    items.forEach(item => {
      message += `**${item.name}** - ${item.price} MP\n`;
      message += `${item.description}\n`;
      message += `To purchase: \`!buy ${item.slug}\`\n\n`;
    });
    
    console.log('Formatted catalogue message:');
    console.log(message);
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testCatalogue().catch(console.error);
#!/usr/bin/env ts-node
import { config } from 'dotenv';
import { REST, Routes } from 'discord.js';

// Load environment variables
config();

interface CommandRegistrationOptions {
  mode: 'guild' | 'global';
  guildId?: string;
}

/**
 * Register Discord slash commands
 * 
 * Usage:
 * - Guild (development): ts-node scripts/register-commands.ts guild
 * - Global (production): ts-node scripts/register-commands.ts global
 */
async function registerCommands(options: CommandRegistrationOptions) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token) {
    throw new Error('DISCORD_BOT_TOKEN is not set in environment variables');
  }

  if (!clientId) {
    throw new Error('DISCORD_CLIENT_ID is not set in environment variables');
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('🔄 Starting slash command registration...');
    console.log(`📍 Mode: ${options.mode.toUpperCase()}`);

    if (options.mode === 'guild') {
      const guildId = options.guildId || process.env.DISCORD_GUILD_ID;
      
      if (!guildId) {
        throw new Error('DISCORD_GUILD_ID is not set in environment variables');
      }

      console.log(`🏠 Guild ID: ${guildId}`);
      console.log('⏱️  Guild commands register instantly!');

      // For guild commands, Necord handles registration automatically
      // This script just clears old commands if needed
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: [] }, // Empty array clears all commands
      );

      console.log('✅ Guild commands cleared!');
      console.log('💡 Start your bot to auto-register commands: pnpm run start:dev');
    } else {
      // Global commands
      console.log('🌍 Registering global commands...');
      console.log('⏱️  Note: Global commands can take up to 1 hour to propagate!');

      // Clear global commands
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: [] },
      );

      console.log('✅ Global commands cleared!');
      console.log('💡 Start your bot in production mode to auto-register commands');
      console.log('   Remove the "development" option from NecordModule.forRoot()');
    }

    console.log('');
    console.log('📝 Command Registration Guide:');
    console.log('   - Development: Commands auto-register to guild when bot starts');
    console.log('   - Production: Commands auto-register globally when bot starts');
    console.log('   - This script is useful for clearing old commands');
    console.log('');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args[0] as 'guild' | 'global' || 'guild';
const guildId = args[1];

if (!['guild', 'global'].includes(mode)) {
  console.error('❌ Invalid mode. Use: guild or global');
  console.log('');
  console.log('Usage:');
  console.log('  pnpm run register:dev     - Clear guild commands');
  console.log('  pnpm run register:prod    - Clear global commands');
  console.log('');
  process.exit(1);
}

registerCommands({ mode, guildId }).catch(console.error);


# Discord Bot Command Registration

## How Slash Commands Work

Your Discord bot uses **Necord**, which automatically registers slash commands when the bot starts.

### Current Setup (Development Mode)

```typescript
// src/app.module.ts
NecordModule.forRoot({
  token: process.env.DISCORD_BOT_TOKEN,
  development: [process.env.DISCORD_GUILD_ID], // 👈 Guild-specific (instant)
})
```

**Benefits:**
- ✅ Commands register **instantly** (no waiting)
- ✅ Only visible in your test server
- ✅ Perfect for development and testing

## Quick Start

### 1. Development (Recommended)

Just start your bot - commands auto-register!

```bash
pnpm run start:dev
```

Commands will appear immediately in your test server.

### 2. Clear Guild Commands (if needed)

```bash
pnpm run register:dev
```

This clears all commands from your test guild. Start the bot to re-register them.

### 3. Production Deployment

For production, you need to switch to **global registration**:

**Step 1:** Update `src/app.module.ts` - Remove or comment out the `development` line:

```typescript
NecordModule.forRoot({
  token: process.env.DISCORD_BOT_TOKEN,
  // development: [process.env.DISCORD_GUILD_ID], // 👈 Remove this line
})
```

**Step 2:** Clear global commands (optional):

```bash
pnpm run register:prod
```

**Step 3:** Start the bot:

```bash
pnpm run build
pnpm run start:prod
```

**Note:** Global commands can take up to **1 hour** to propagate to all servers.

## Environment Variables

Make sure these are set in your `.env` file:

```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_bot_client_id_here
DISCORD_GUILD_ID=your_test_server_id_here
```

## Creating New Commands

1. Create a new command file (e.g., `my-feature.commands.ts`):

```typescript
import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';

@Injectable()
export class MyFeatureCommands {
  @SlashCommand({
    name: 'my-command',
    description: 'My awesome command',
  })
  async handleMyCommand(@Context() [interaction]: SlashCommandContext) {
    await interaction.reply('Hello from my command!');
  }
}
```

2. Add it to your module:

```typescript
import { Module } from '@nestjs/common';
import { MyFeatureCommands } from './my-feature.commands';

@Module({
  providers: [MyFeatureCommands],
})
export class MyFeatureModule {}
```

3. Import the module in `app.module.ts`:

```typescript
imports: [
  // ... other modules
  MyFeatureModule,
]
```

4. Start the bot - commands auto-register! 🎉

## Troubleshooting

### Commands not showing up?

1. **Check environment variables:**
   ```bash
   cat .env | grep DISCORD
   ```

2. **Verify bot is running:**
   ```bash
   pnpm run start:dev
   ```

3. **Check bot logs** for errors

4. **Try clearing and re-registering:**
   ```bash
   pnpm run register:dev
   pnpm run start:dev
   ```

### Commands stuck in old state?

In development mode (guild commands), they update instantly. If they seem stuck:

1. Clear the commands:
   ```bash
   pnpm run register:dev
   ```

2. Restart the bot:
   ```bash
   pnpm run start:dev
   ```

### Global commands taking too long?

Global commands can take up to 1 hour. For testing, always use development mode!

## Command Registration Modes

| Mode | Speed | Visibility | Use Case |
|------|-------|------------|----------|
| **Guild** (development) | Instant | Test server only | Development & testing |
| **Global** (production) | Up to 1 hour | All servers | Production deployment |

## Manual Registration Script

The `register-commands.ts` script is mainly for **clearing commands**. Necord automatically registers commands when the bot starts, so you rarely need to run this manually.

### When to use the script:

- ✅ Clearing old/broken commands
- ✅ Switching between development and production
- ✅ Troubleshooting command issues
- ❌ Normal development (just start the bot!)

## Additional Resources

- [Necord Documentation](https://necord.org/)
- [Discord.js Guide](https://discordjs.guide/)
- [Discord Developer Portal](https://discord.com/developers/applications)


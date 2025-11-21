# Discord Bot - Slash Command Registration Guide

## 🎯 Quick Answer

**Your commands automatically register when you start the bot!**

```bash
# Development - Commands register instantly to your test server
pnpm run start:dev
```

That's it! Your slash commands will appear in Discord immediately.

---

## 📋 Table of Contents

1. [How It Works](#how-it-works)
2. [Quick Start](#quick-start)
3. [Environment Setup](#environment-setup)
4. [Development vs Production](#development-vs-production)
5. [Creating New Commands](#creating-new-commands)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 How It Works

Your bot uses **Necord** (a NestJS wrapper for discord.js) which handles command registration automatically.

### Current Configuration

```typescript
// src/app.module.ts (lines 51-75)
NecordModule.forRoot({
  token: process.env.DISCORD_BOT_TOKEN,
  development: [process.env.DISCORD_GUILD_ID], // 👈 This enables instant registration
})
```

The `development` array tells Necord to:
- ✅ Register commands to specific guild(s) only
- ✅ Update commands **instantly** (no waiting)
- ✅ Perfect for testing without affecting production

---

## 🚀 Quick Start

### Step 1: Ensure Environment Variables

Make sure your `.env` file contains:

```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
DISCORD_GUILD_ID=your_test_server_id_here
```

**Where to find these:**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. **Bot Token:** Bot → Token (click "Reset Token" if needed)
4. **Client ID:** General Information → Application ID
5. **Guild ID:** Enable Developer Mode in Discord → Right-click your server → Copy ID

### Step 2: Start Your Bot

```bash
# Development mode (recommended)
pnpm run start:dev

# Or production mode
pnpm run start:prod
```

### Step 3: Check Discord

Your commands should appear immediately in your test server! 🎉

Try typing `/` in any channel to see your commands.

---

## 🌍 Development vs Production

### Development Mode (Current Setup)

**Configuration:**
```typescript
NecordModule.forRoot({
  development: [process.env.DISCORD_GUILD_ID], // 👈 Guild-specific
})
```

**Characteristics:**
- ✅ **Speed:** Instant registration
- ✅ **Visibility:** Only in test server(s)
- ✅ **Updates:** Instant when bot restarts
- ✅ **Best for:** Development and testing

**Commands:**
```bash
pnpm run start:dev  # Start bot in dev mode
pnpm run register:dev  # Clear guild commands (if needed)
```

### Production Mode (Global Registration)

**Configuration:**
```typescript
NecordModule.forRoot({
  // Remove the development line
})
```

**Characteristics:**
- ⏱️ **Speed:** Up to 1 hour to propagate
- 🌍 **Visibility:** All servers the bot joins
- ⏱️ **Updates:** Up to 1 hour when changed
- ✅ **Best for:** Production deployment

**Commands:**
```bash
pnpm run build  # Build the project
pnpm run start:prod  # Start bot in prod mode
pnpm run register:prod  # Clear global commands (if needed)
```

**When to switch:**
- Development/Testing → Use **Development Mode**
- Public Bot/Production → Use **Production Mode**

---

## 🛠️ Creating New Commands

### Step 1: Create Command File

Example: `src/my-feature/my-feature.commands.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext, StringOption } from 'necord';

@Injectable()
export class MyFeatureCommands {
  private readonly logger = new Logger(MyFeatureCommands.name);

  // Simple command
  @SlashCommand({
    name: 'hello',
    description: 'Say hello!',
  })
  async handleHello(@Context() [interaction]: SlashCommandContext) {
    await interaction.reply('Hello! 👋');
  }

  // Command with options
  @SlashCommand({
    name: 'greet',
    description: 'Greet someone',
  })
  async handleGreet(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: { name: string }
  ) {
    await interaction.reply(`Hello, ${options.name}! 🎉`);
  }

  // Admin-only command
  @SlashCommand({
    name: 'admin-command',
    description: 'Administrator only command',
    defaultMemberPermissions: '8', // Administrator permission
  })
  async handleAdmin(@Context() [interaction]: SlashCommandContext) {
    await interaction.reply({ 
      content: 'Admin command executed!',
      ephemeral: true // Only visible to the user
    });
  }
}
```

### Step 2: Create Module

Example: `src/my-feature/my-feature.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { MyFeatureCommands } from './my-feature.commands';
import { MyFeatureService } from './my-feature.service';

@Module({
  providers: [MyFeatureCommands, MyFeatureService],
})
export class MyFeatureModule {}
```

### Step 3: Register Module

Add to `src/app.module.ts`:

```typescript
import { MyFeatureModule } from './my-feature/my-feature.module';

@Module({
  imports: [
    // ... existing modules
    MyFeatureModule, // 👈 Add your module here
  ],
})
export class AppModule {}
```

### Step 4: Restart Bot

```bash
pnpm run start:dev
```

Your new command will appear immediately! ✨

---

## 🔍 Troubleshooting

### Commands Not Appearing

**1. Check environment variables:**
```bash
# View your .env file (make sure it's not empty)
cat .env | grep DISCORD
```

**2. Verify bot is running:**
```bash
pnpm run start:dev
```

Check the console output for errors.

**3. Check bot permissions:**
- Ensure bot has `applications.commands` scope
- Re-invite bot if needed: [Discord Permissions Calculator](https://discordapi.com/permissions.html)

**4. Clear and re-register:**
```bash
pnpm run register:dev  # Clear guild commands
pnpm run start:dev     # Restart bot
```

### Commands Showing Wrong Information

Commands are cached in your Discord client. Try:
1. Restart Discord app
2. Clear Discord cache
3. Use Discord in a different browser/incognito mode

### Bot Token Invalid

```
Error: An invalid token was provided
```

**Solution:**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application → Bot
3. Reset token and copy the new one
4. Update `DISCORD_BOT_TOKEN` in `.env`
5. Restart the bot

### Guild ID Not Working

```
Error: Unknown Guild
```

**Solution:**
1. Enable Developer Mode in Discord: User Settings → Advanced → Developer Mode
2. Right-click your server → Copy ID
3. Update `DISCORD_GUILD_ID` in `.env`
4. Restart the bot

### Commands Taking Too Long (Production)

If you're in **production mode** (no `development` line), commands can take up to **1 hour** to appear globally.

**Solutions:**
- Use development mode for testing
- Be patient in production (it will eventually appear)

---

## 📊 Command Registration Flow

```
┌─────────────────────────────────────┐
│  Start Bot (pnpm run start:dev)    │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Necord Scans @SlashCommand         │
│  Decorators in All Modules          │
└───────────────┬─────────────────────┘
                │
                ▼
        ┌───────────────┐
        │ Development?  │
        └───────┬───────┘
                │
        ┌───────┴────────┐
        │                │
        ▼                ▼
  ┌─────────┐      ┌──────────┐
  │  Guild  │      │  Global  │
  │  (Fast) │      │  (Slow)  │
  └────┬────┘      └─────┬────┘
       │                 │
       ▼                 ▼
  ┌─────────┐      ┌──────────┐
  │ Instant │      │ 1 Hour   │
  └─────────┘      └──────────┘
```

---

## 🎓 Best Practices

### 1. Always Use Development Mode for Testing
```typescript
// ✅ Good for development
development: [process.env.DISCORD_GUILD_ID]

// ❌ Don't use global commands for testing
// (removed development line)
```

### 2. Use Ephemeral Responses for Sensitive Data
```typescript
await interaction.reply({
  content: 'Sensitive information here',
  ephemeral: true, // Only the user can see this
});
```

### 3. Defer Long-Running Commands
```typescript
@SlashCommand({ name: 'slow-command', description: 'Takes a while' })
async handleSlow(@Context() [interaction]: SlashCommandContext) {
  // Tell Discord we're working on it
  await interaction.deferReply();
  
  // Do long-running work
  await someSlowOperation();
  
  // Send the actual response
  await interaction.editReply('Done!');
}
```

### 4. Handle Errors Gracefully
```typescript
@SlashCommand({ name: 'my-command', description: 'Example' })
async handleCommand(@Context() [interaction]: SlashCommandContext) {
  try {
    // Your command logic
    await interaction.reply('Success!');
  } catch (error) {
    this.logger.error('Command failed:', error);
    await interaction.reply({
      content: '❌ Something went wrong!',
      ephemeral: true,
    });
  }
}
```

### 5. Use Command Options for User Input
```typescript
class GreetDto {
  @StringOption({
    name: 'name',
    description: 'The name to greet',
    required: true,
  })
  name: string;
}

@SlashCommand({ name: 'greet', description: 'Greet someone' })
async handleGreet(
  @Context() [interaction]: SlashCommandContext,
  @Options() { name }: GreetDto
) {
  await interaction.reply(`Hello, ${name}!`);
}
```

---

## 📚 Additional Resources

- **Necord Documentation:** https://necord.org/
- **Discord.js Guide:** https://discordjs.guide/
- **Discord Developer Portal:** https://discord.com/developers/applications
- **Command Registration Scripts:** See `scripts/README.md`

---

## 🎉 Summary

1. **Commands auto-register** when you start the bot
2. **Development mode** = instant updates (recommended for testing)
3. **Production mode** = global commands (up to 1 hour)
4. Create commands with `@SlashCommand()` decorator
5. Add modules to `app.module.ts`
6. Restart bot to see changes

**That's it! Happy coding! 🚀**


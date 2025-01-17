import { Collection, Guild, IntentsBitField } from 'discord.js';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NecordPaginationModule } from '@necord/pagination';
import { NecordModule } from 'necord';
import { AppService } from './app.service';
import { AppUpdate } from './app.update';
import { PrismaService } from './prisma.service';
// ดึงคำสั่ง
import { BlogModule } from './blog/blog.module';
import { FormRegisterModule } from './form-register/form-register.module';
import { GameCreateRoomModule } from './game-create-room/game-create-room.module';
import { GameRankModule } from './game-rank/game-rank.module';
import { GameTypeModule } from './game-type/game-type.module';
import { GameModule } from './game/game.module';
import { GuildCreateModule } from './guild-create/guild-create.module';
import { GuildManageModule } from './guild-manage/guild-manage.module';
import { GuildKickModule } from './guild-kick/guild-kick.module';
import { GuildInviteModule } from './guild-invite/guild-invite.module';
import { PrototypemModule } from './prototype/prototype.module';
import { ServerRegistermModule } from './server-register/server-register.module';
import { UserDataModule } from './user-data/user-data.module';
import { WelcomeModule } from './welcome/welcome.module';
import { NewsUpdateModule } from './news-update/news-update.module';
import { ServerTryItOnModule } from './server-try-it-out/server-try-it-on.module';
import { ServerCreateRolemModule } from './server-create-role/server-create-role.module';
import { ServerUpdateRolemModule } from './server-update-role/server-update-role.module';
import { ServerSetRoommModule } from './server-set-room/server-set-room.module';
import { Client, GatewayIntentBits } from 'discord.js';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot(),
    NecordModule.forRoot({
      token: process.env.DISCORD_BOT_TOKEN,
      intents: [
        IntentsBitField.Flags.Guilds, // การจัดการเซิร์ฟเวอร์ (เช่นคำสั่ง Slash Commands)
        IntentsBitField.Flags.GuildMessages, // ตรวจสอบข้อความที่ส่งในเซิร์ฟเวอร์
        IntentsBitField.Flags.GuildVoiceStates, // ตรวจสอบ Voice Channels
        IntentsBitField.Flags.DirectMessages, // รับข้อความจาก DM ของบอท
        IntentsBitField.Flags.GuildMembers, // รับข้อมูลสมาชิกในเซิร์ฟเวอร์
        IntentsBitField.Flags.GuildBans, // ตรวจสอบ/จัดการการแบนสมาชิก
        IntentsBitField.Flags.GuildEmojisAndStickers, // ใช้ Emoji และ Stickers
        IntentsBitField.Flags.GuildIntegrations, // การทำงานร่วมกับ Integrations
        IntentsBitField.Flags.GuildWebhooks, // ตรวจสอบการทำงานของ Webhooks
        IntentsBitField.Flags.GuildInvites, // ตรวจสอบการสร้าง/ใช้ Invite Links
        IntentsBitField.Flags.GuildPresences, // ตรวจสอบสถานะออนไลน์/ออฟไลน์ของสมาชิก
        IntentsBitField.Flags.GuildMessageReactions, // ตรวจสอบปฏิกิริยา (Reactions) ในข้อความ
        IntentsBitField.Flags.GuildMessageTyping, // ตรวจสอบว่าผู้ใช้กำลังพิมพ์ข้อความ
        IntentsBitField.Flags.DirectMessageReactions, // ปฏิกิริยาในข้อความ DM
        IntentsBitField.Flags.DirectMessageTyping, // ตรวจสอบการพิมพ์ข้อความใน DM
        IntentsBitField.Flags.MessageContent, // อ่านเนื้อหาข้อความที่ส่ง (ต้องการ Privileged Intent)
        IntentsBitField.Flags.GuildScheduledEvents, // จัดการ Events ในเซิร์ฟเวอร์
        IntentsBitField.Flags.AutoModerationConfiguration, // ตรวจสอบการตั้งค่า Auto Moderation
        IntentsBitField.Flags.AutoModerationExecution, // ตรวจสอบการทำงานของ Auto Moderationƒ
      ],
      development: [],
    }),
    NecordPaginationModule.forRoot({
      buttons: {
        next: {
          label: 'หน้าถัดไป',
          emoji: '➡️',
        },
        back: {
          label: 'หน้าก่อนหน้า',
          emoji: '⬅️',
        },
      },
      allowSkip: false,
      allowTraversal: false,
      buttonsPosition: 'end',
    }),
    BlogModule,
    FormRegisterModule,
    GameCreateRoomModule,
    GameRankModule,
    GameTypeModule,
    GameModule,
    GuildCreateModule,
    GuildManageModule,
    GuildKickModule,
    GuildInviteModule,
    NewsUpdateModule,
    PrototypemModule,
    ServerRegistermModule,
    ServerTryItOnModule,
    ServerCreateRolemModule,
    ServerUpdateRolemModule,
    ServerSetRoommModule,
    UserDataModule,
    WelcomeModule,
  ],
  providers: [PrismaService, AppUpdate, AppService],
  exports: [PrismaService, AppService],
})
export class AppModule {
  private client: Client;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.client.login(process.env.DISCORD_BOT_TOKEN);
    this.client.on('ready', async () => {
      const guilds = this.client.guilds.cache;
      const allCommands = new Map<string, any>();

      for (const guild of guilds.values()) {
        const commands = await guild.commands.fetch();

        if (commands.size > 0) {
          // Save commands to allCommands map
          commands.forEach((command) => {
            allCommands.set(command.name, command);
          });
        }

        commands.forEach((command) => {
          console.log(
            `Command Name: ${command.name}, Command Description: ${command.description}`,
          );
        });
      }

      // Create commands for each guild
      for (const guild of guilds.values()) {
        allCommands.forEach((command) => {
          guild.commands.create({
            name: command.name,
            description: command.description,
            options: command.options as any,
          });
        });
      }
    });

  }
}

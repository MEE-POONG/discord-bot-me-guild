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
import { PrototypeModule } from './prototype/prototype.module';
import { ServerRegisterModule } from './server-register/server-register.module';
import { UserDataModule } from './user-data/user-data.module';
import { WelcomeModule } from './welcome/welcome.module';
import { NewsUpdateModule } from './news-update/news-update.module';
import { ServerTryItOnModule } from './server-try-it-out/server-try-it-on.module';
import { ServerCreateRoleModule } from './server-create-role/server-create-role.module';
import { ServerUpdateRoleModule } from './server-update-role/server-update-role.module';
import { ServerSetRoomModule } from './server-set-room/server-set-room.module';
import { Client, GatewayIntentBits } from 'discord.js';
import { GameJoinModule } from './game-join/game-join.module';
import { ServerClearModule } from './server-clear/server-clear.module';
import { ServerclearRoleModule } from './server-clear-role/server-clear-role.module';
import { BuskingModule } from './busking/busking.module';
import { FormGameModule } from './form-game/form-game.module';
import { DonationModule } from './donation/donation.module';
import { VoiceTimeModule } from './voice-time/voice-time.module';
import { TransferModule } from './transfer/transfer.module';
import { StageChannelModule } from './stage-channel/stage-channel.module';

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
      development: [process.env.DISCORD_GUILD_ID],
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
    DonationModule,
    FormGameModule,
    FormRegisterModule,
    GameCreateRoomModule,
    GameRankModule,
    GameTypeModule,
    GameModule,
    GameJoinModule,
    GuildCreateModule,
    GuildManageModule,
    GuildKickModule,
    GuildInviteModule,
    NewsUpdateModule,
    PrototypeModule,
    ServerRegisterModule,
    ServerTryItOnModule,
    ServerCreateRoleModule,
    ServerClearModule,
    ServerclearRoleModule,
    ServerUpdateRoleModule,
    ServerSetRoomModule,
    UserDataModule,
    WelcomeModule,
    BuskingModule,
    VoiceTimeModule,
    TransferModule,
    StageChannelModule,
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
            `Guild: ${guild.name}, Command Name: ${command.name}, Command Description: ${command.description}`,
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

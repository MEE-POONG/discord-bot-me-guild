import { Global, Module } from '@nestjs/common';
import { AppService } from './app.service';
import { IntentsBitField } from 'discord.js';
import { NecordModule } from 'necord';
import { ConfigModule } from '@nestjs/config';
import { NecordPaginationModule } from '@necord/pagination';
import { GameCreateRoomModule } from './game-create-room/game-create-room.module';
import { AppUpdate } from './app.update';
import { PrismaService } from './prisma.service';
import { GameRankModule } from './game-rank/game-rank.module';
import { GameTypeModule } from './game-type/game-type.module';
import { GameModule } from './game/game.module';
import { WelcomeModule } from './welcome/welcome.module';
import { FormRegisterModule } from './form-register/form-register.module';
import { GuildCreateModule } from './guild-create/guild-create.module';
import { GuildManageModule } from './guild-manage/guild-manage.module';
import { UserDataModule } from './user-data/user-data.module';
import { GuildKickModule } from './guild-kick/guild-kick.module';
import { GuildInviteModule } from './guild-invite/guild-invite.module';

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
      development: [process.env.DISCORD_DEVELOPMENT_GUILD_ID],
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
    GameCreateRoomModule,
    GameRankModule,
    GameTypeModule,
    GameModule,
    WelcomeModule,
    FormRegisterModule,
    GuildCreateModule,
    GuildManageModule,
    UserDataModule,
    GuildKickModule,
    GuildInviteModule,
  ],
  providers: [PrismaService, AppUpdate, AppService],
  exports: [PrismaService, AppService],
})
export class AppModule {}

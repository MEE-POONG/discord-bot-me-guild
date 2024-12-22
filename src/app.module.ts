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

@Global()
@Module({
  imports: [
    ConfigModule.forRoot(),
    NecordModule.forRoot({
      token: process.env.DISCORD_BOT_TOKEN,
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.DirectMessages,
        IntentsBitField.Flags.GuildVoiceStates,
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
  ],
  providers: [PrismaService, AppUpdate, AppService],
  exports: [PrismaService, AppService],
})
export class AppModule {}

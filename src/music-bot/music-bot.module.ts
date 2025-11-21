import { Module } from '@nestjs/common';
import { MusicBotService } from './music-bot.service';
import { MusicBotCommands } from './music-bot.commands';
import { PrismaService } from '../prisma.service';
import { ServerRepository } from '../repository/server';

@Module({
    providers: [MusicBotService, MusicBotCommands, PrismaService, ServerRepository],
    exports: [MusicBotService],
})
export class MusicBotModule { }

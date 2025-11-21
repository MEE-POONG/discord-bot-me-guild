import { Module } from '@nestjs/common';
import { GuildEventsService } from './guild-events.service';
import { ServerRepository } from 'src/repository/server';
import { PrismaClient } from '@prisma/client';
import { ServerMeguildSetService } from 'src/server-meguild-set/server-meguild-set.service';
import { PrismaService } from 'src/prisma.service';

@Module({
    providers: [
        GuildEventsService,
        ServerRepository,
        ServerMeguildSetService,
        PrismaClient,
        PrismaService,
    ],
    exports: [GuildEventsService],
})
export class GuildEventsModule { }

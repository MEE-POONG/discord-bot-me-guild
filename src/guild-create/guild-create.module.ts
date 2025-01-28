import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { GuildCreateService } from './guild-create.service';
import { GuildCreateCommand } from './guild-create.command';
import { UserDataService } from 'src/user-data/user-data.service';
import { GuildManageService } from 'src/guild-manage/guild-manage.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [
    PrismaClient,
    GuildCreateService,
    GuildCreateCommand,
    GuildManageService,
    UserDataService,
    ServerRepository,
  ],
})
export class GuildCreateModule {}

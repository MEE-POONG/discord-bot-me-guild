import { Module } from '@nestjs/common';
import { GuildCreateService } from './guild-create.service';
import { PrismaClient } from '@prisma/client';
import { GuildCreateCommand } from './guild-create.command';
import { UserDataService } from 'src/user-data/user-data.service';
import { GuildManageService } from 'src/guild-manage/guild-manage.service';

@Module({
  providers: [
    GuildCreateService,
    PrismaClient,
    GuildCreateCommand,
    GuildManageService,
    UserDataService,
  ],
})
export class GuildCreateModule {}

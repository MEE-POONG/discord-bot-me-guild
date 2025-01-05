import { Module } from '@nestjs/common';
import { GuildManageService } from './guild-manage.service';
import { PrismaClient } from '@prisma/client';

@Module({
  providers: [GuildManageService, PrismaClient],
})
export class GuildManageModule {}

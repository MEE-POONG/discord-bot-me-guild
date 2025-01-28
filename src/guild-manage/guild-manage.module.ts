import { Module } from '@nestjs/common';
import { GuildManageService } from './guild-manage.service';
import { PrismaClient } from '@prisma/client';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [GuildManageService, PrismaClient, ServerRepository],
})
export class GuildManageModule {}

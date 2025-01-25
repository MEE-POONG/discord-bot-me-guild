import { Module } from '@nestjs/common';
import { NewsUpdateCommands } from './news-update.command';
import { NewsUpdateService } from './news-update.service';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [
    NewsUpdateCommands,
    NewsUpdateService,
    PrismaService,
    ServerRepository,
  ],
})
export class NewsUpdateModule { }

import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { NewsCommands } from './News.commands';
import { NewsService } from './news.service';

@Module({
  providers: [
    PrismaClient,
    NewsCommands,
    NewsService,
  ],
})
export class NewsmModule { }

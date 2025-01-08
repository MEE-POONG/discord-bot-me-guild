import { Module } from '@nestjs/common';
import { NewsUpdateCommands } from './news-update.command';
import { NewsUpdateService } from './news-update.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [
    NewsUpdateCommands,
    NewsUpdateService,
    PrismaService,
  ],
})
export class NewsUpdateModule { }

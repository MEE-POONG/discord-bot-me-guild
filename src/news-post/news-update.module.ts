import { Module } from '@nestjs/common';
import { NewsUpdateService } from './news-update.service';
import { NewsUpdateRepository } from './news-update.repository';
import { NewsUpdateCommands } from './news-update.command';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [
    NewsUpdateService,
    NewsUpdateRepository,
    NewsUpdateCommands,
    PrismaService,
  ],
  exports: [NewsUpdateRepository],
})
export class NewsUpdateModule {}

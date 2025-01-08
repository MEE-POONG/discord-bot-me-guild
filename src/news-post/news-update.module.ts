import { Module } from '@nestjs/common';
import { NewsUpdateService } from './news-update.service'; // Import Service
import { NewsUpdateRepository } from './news-update.repository'; // Import Repository
import { PrismaService } from 'src/prisma.service'; // Import Prisma Service

@Module({
  providers: [NewsUpdateService, NewsUpdateRepository, PrismaService], // ลงทะเบียน Providers
  exports: [NewsUpdateRepository], // Export Repository
})
export class NewsUpdateModule { }

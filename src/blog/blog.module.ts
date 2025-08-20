import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { BlogCommands } from './blog.command';
import { BlogService } from './blog.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [BlogCommands, BlogService, PrismaService, ServerRepository],
})
export class BlogModule {}

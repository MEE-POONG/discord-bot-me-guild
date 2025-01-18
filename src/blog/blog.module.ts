import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { BlogCommands } from './blog.command';
import { BlogService } from './blog.service';

@Module({
  providers: [
    BlogCommands,
    BlogService,
    PrismaService,
  ],
})
export class BlogModule { }

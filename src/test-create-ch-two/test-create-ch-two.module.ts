import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TestCreateChTwoCommands } from './test-create-ch-two.commands';
import { TestCreateChTwoService } from './test-create-ch-two.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [
    PrismaClient,
    ServerRepository,
    TestCreateChTwoCommands,
    TestCreateChTwoService,
  ],
})
export class TestCreateChTwoModule { }

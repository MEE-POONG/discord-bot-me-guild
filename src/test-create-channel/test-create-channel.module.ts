import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TestCreateChannelCommands } from './test-create-channel.commands';
import { TestCreateChannelService } from './test-create-channel.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [
    PrismaClient,
    ServerRepository,
    TestCreateChannelCommands,
    TestCreateChannelService,
  ],
})
export class TestCreateChannelModule { }

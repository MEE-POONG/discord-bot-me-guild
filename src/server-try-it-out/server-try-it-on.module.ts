import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ServerTryItOnCommands } from './server-try-it-on.commands';
import { ServerTryItOnService } from './server-try-it-on.service';

@Module({
  providers: [
    PrismaClient,
    ServerTryItOnCommands,
    ServerTryItOnService,
  ],
})
export class ServerTryItOnModule { }

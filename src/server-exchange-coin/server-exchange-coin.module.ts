import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ServerExchangCoinCommands } from './server-exchange-coin.commands';
import { ServerExchangCoinService } from './server-exchange-coin.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [PrismaClient, ServerRepository, ServerExchangCoinCommands, ServerExchangCoinService],
})
export class ServerExchangCoinModule {}

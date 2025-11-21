import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ServerBuyPackageCommands } from './server-buy-package.commands';
import { ServerBuyPackageService } from './server-buy-package.service';
import { ServerRepository } from 'src/repository/server';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  imports: [PaymentModule],
  providers: [PrismaClient, ServerRepository, ServerBuyPackageCommands, ServerBuyPackageService],
})
export class ServerBuyPackageModule { }

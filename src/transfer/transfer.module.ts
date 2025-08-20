import { Module } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { TransferCommands } from './transfer.commands';

@Module({
  providers: [TransferService, TransferCommands],
})
export class TransferModule {}

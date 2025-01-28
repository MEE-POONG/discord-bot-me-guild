import { Module } from '@nestjs/common';
import { BuskingService } from './busking.service';
import { BuskingCommand } from './busking.controller';

@Module({
  providers: [BuskingService, BuskingCommand],
})
export class BuskingModule {}

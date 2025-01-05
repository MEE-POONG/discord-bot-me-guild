import { Module } from '@nestjs/common';
import { UserDataService } from './user-data.service';
import { PrismaClient } from '@prisma/client';

@Module({
  providers: [UserDataService, PrismaClient],
})
export class UserDataModule {}

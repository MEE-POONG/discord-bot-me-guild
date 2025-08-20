import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DonationCommands } from './donation.commands';
import { DonationService } from './donation.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [PrismaClient, ServerRepository, DonationCommands, DonationService],
})
export class DonationModule {}

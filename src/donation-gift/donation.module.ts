import { Module } from '@nestjs/common';
import { DonationService } from './donation.service';
import { DonationCommands } from './donation.command';

@Module({
    providers: [DonationService, DonationCommands],
})
export class DonationModule { }
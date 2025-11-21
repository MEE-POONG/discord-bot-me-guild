import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PrismaService } from '../prisma.service';
import { ServerRepository } from '../repository/server';
import { MusicBotModule } from '../music-bot/music-bot.module';

@Module({
    imports: [MusicBotModule],
    controllers: [PaymentController],
    providers: [PaymentService, PrismaService, ServerRepository],
    exports: [PaymentService],
})
export class PaymentModule { }

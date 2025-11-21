import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PrismaService } from '../prisma.service';
import { ServerRepository } from '../repository/server';

@Module({
    controllers: [PaymentController],
    providers: [PaymentService, PrismaService, ServerRepository],
    exports: [PaymentService],
})
export class PaymentModule { }

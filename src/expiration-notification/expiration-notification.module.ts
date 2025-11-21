import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ExpirationNotificationService } from './expiration-notification.service';
import { ExpirationNotificationCommands } from './expiration-notification.commands';
import { ServerRepository } from 'src/repository/server';
import { PrismaService } from 'src/prisma.service';

@Module({
    imports: [ScheduleModule.forRoot()],
    providers: [
        ExpirationNotificationService,
        ExpirationNotificationCommands,
        ServerRepository,
        PrismaService,
    ],
    exports: [ExpirationNotificationService],
})
export class ExpirationNotificationModule { }

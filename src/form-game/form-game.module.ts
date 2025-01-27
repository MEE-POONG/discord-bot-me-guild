import { Module } from '@nestjs/common';
import { FormGameCommands } from './form-game.commands';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';
import { FormGameService } from './form-game.service';

@Module({
  providers: [FormGameService, FormGameCommands, PrismaService, ServerRepository],
})
export class FormGameModule { }

import { Module } from '@nestjs/common';
import { FormRegisterService } from './form-register.service';
import { FormRegisterCommands } from './form-register.commands';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [FormRegisterService, FormRegisterCommands, PrismaService, ServerRepository],
})
export class FormRegisterModule {}

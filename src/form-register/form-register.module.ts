import { Module } from '@nestjs/common';
import { FormRegisterService } from './form-register.service';
import { FormRegisterCommands } from './form-register.commands';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [FormRegisterService, FormRegisterCommands, PrismaService],
})
export class FormRegisterModule {}

import { Module } from '@nestjs/common';
import { WelcomeUpdate } from './welcome.update';
import { ServerRepository } from 'src/repository/server';

@Module({
  providers: [WelcomeUpdate, ServerRepository],
  exports: [WelcomeUpdate],
})
export class WelcomeModule {}

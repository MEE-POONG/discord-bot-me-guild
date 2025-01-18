import { Module } from '@nestjs/common';
import { WelcomeUpdate } from './welcome.update';

@Module({
  providers: [WelcomeUpdate],
  exports: [WelcomeUpdate],
})
export class WelcomeModule {}

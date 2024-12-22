import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class GameConditionMatchService {
  private readonly logger = new Logger(GameConditionMatchService.name);

  public onModuleInit() {
    this.logger.log('GameConditionMatchService initialized');
  }
}

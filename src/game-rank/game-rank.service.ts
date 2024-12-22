import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class GameRankService {
  private readonly logger = new Logger(GameRankService.name);

  public onModuleInit() {
    this.logger.log('GameRankService initialized');
  }
}

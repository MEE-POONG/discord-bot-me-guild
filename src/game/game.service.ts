import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  public onModuleInit() {
    this.logger.log('GameService initialized');
  }
}

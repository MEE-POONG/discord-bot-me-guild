import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class GameTypeService {
  private readonly logger = new Logger(GameTypeService.name);

  public onModuleInit() {
    this.logger.log('GameTypeService initialized');
  }
}

import { Injectable } from '@nestjs/common';
import { NewsUpdateRepository } from './news-update.repository';
import { NewsUpdateDB } from '@prisma/client';

@Injectable()
export class NewsUpdateService {
  constructor(private readonly repository: NewsUpdateRepository) {}

  // ดึงข่าว 5 ลำดับล่าสุด
  async getLatestNews(): Promise<NewsUpdateDB[]> {
    return this.repository.getLatestNewsUpdates();
  }

  // ดึงข่าวตาม ID
  async getNewsById(id: string): Promise<NewsUpdateDB> {
    return this.repository.getNewsUpdateById(id);
  }
}

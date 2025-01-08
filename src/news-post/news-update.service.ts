import { Injectable } from '@nestjs/common';
import { NewsUpdateRepository } from './news-update.repository';
import { NewsUpdateDB } from '@prisma/client';

@Injectable()
export class NewsUpdateService {
  constructor(private readonly newsUpdateRepository: NewsUpdateRepository) {}

  // ดึงข้อมูล 5 ลำดับล่าสุด
  async getLatestNews(): Promise<NewsUpdateDB[]> {
    return this.newsUpdateRepository.getLatestNewsUpdates();
  }

  // ดึงข้อมูลข่าวตาม ID
  async getNewsById(id: string): Promise<NewsUpdateDB> {
    return this.newsUpdateRepository.getNewsUpdateById(id);
  }
}

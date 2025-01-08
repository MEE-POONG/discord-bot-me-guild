import { Injectable } from '@nestjs/common';
import { NewsUpdateDB } from '@prisma/client';
import { NewsUpdateRepository } from './news-update.repository';

@Injectable()
export class NewsUpdateService {
  constructor(private readonly newsUpdateRepository: NewsUpdateRepository) {}

  // ดึงข้อมูลข่าว 5 ลำดับล่าสุด
  async getLatestNews(): Promise<NewsUpdateDB[]> {
    return this.newsUpdateRepository.getLatestNewsUpdates();
  }

  // ดึงข้อมูลข่าวเฉพาะ ID
  async getNewsById(id: string): Promise<NewsUpdateDB> {
    return this.newsUpdateRepository.getNewsUpdateById(id);
  }
}

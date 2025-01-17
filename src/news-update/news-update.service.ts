import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { NewsUpdateDB } from '@prisma/client';

@Injectable()
export class NewsUpdateService {
  private readonly logger = new Logger(NewsUpdateService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ดึงข่าว 3 ลำดับล่าสุด
  async getLatestNews(): Promise<NewsUpdateDB[]> {
    try {
      const data = await this.prisma.newsUpdateDB.findMany({
        take: 3, // ดึงแค่ 3 รายการ
        orderBy: { createdAt: 'desc' }, // เรียงจากล่าสุดไปเก่า
      });
      this.logger.log('ดึงข้อมูลข่าว 3 ลำดับล่าสุดสำเร็จ:', data);
      return data;
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการดึงข่าว 3 ลำดับล่าสุด:', error);
      throw error;
    }
  }
}

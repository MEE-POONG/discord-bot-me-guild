import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { NewsUpdateDB } from '@prisma/client';

@Injectable()
export class NewsUpdateRepository {
  constructor(private readonly prismaService: PrismaService) {}

  // ดึงข้อมูลข่าว 5 ลำดับล่าสุด
  async getLatestNewsUpdates(): Promise<NewsUpdateDB[]> {
    return this.prismaService.newsUpdateDB.findMany({
      take: 5, // ดึงข้อมูล 5 รายการ
      orderBy: {
        createdAt: 'desc', // เรียงจากใหม่ไปเก่า
      },
    });
  }

  // ดึงข้อมูลข่าวตาม ID
  async getNewsUpdateById(id: string): Promise<NewsUpdateDB> {
    return this.prismaService.newsUpdateDB.findUnique({
      where: { id },
    });
  }
}

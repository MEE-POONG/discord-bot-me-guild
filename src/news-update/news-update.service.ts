import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { NewsUpdateDB } from '@prisma/client';
import { ServerRepository } from 'src/repository/server';

@Injectable()
export class NewsUpdateService {
  private readonly logger = new Logger(NewsUpdateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository, // เพิ่ม ServerRepository
  ) {}

  // ตรวจสอบข้อมูลเซิร์ฟเวอร์
  private async validateServer(guildId: string): Promise<void> {
    const server = await this.serverRepository.getServerById(guildId);
    if (!server) {
      this.logger.warn(`Server with ID ${guildId} is not registered in the database.`);
      throw new Error('เซิร์ฟเวอร์นี้ยังไม่ได้ลงทะเบียนในระบบฐานข้อมูล');
    }
  }

  // ดึงข่าว 3 ลำดับล่าสุด
  async getLatestNews(guildId: string, limit = 3): Promise<NewsUpdateDB[]> {
    // ตรวจสอบเซิร์ฟเวอร์ก่อน
    await this.validateServer(guildId);

    try {
      const data = await this.prisma.newsUpdateDB.findMany({
        take: limit, // ดึงข้อมูลตามจำนวนที่กำหนด
        orderBy: { createdAt: 'desc' }, // เรียงจากล่าสุดไปเก่า
      });
      this.logger.log(`ดึงข้อมูลข่าว ${limit} ลำดับล่าสุดสำเร็จ`);
      return data;
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการดึงข่าว:', error.message);
      throw new Error('ไม่สามารถดึงข้อมูลข่าวได้ กรุณาลองใหม่อีกครั้ง');
    }
  }
}

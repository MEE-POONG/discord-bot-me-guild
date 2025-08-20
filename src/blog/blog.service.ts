import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';
import { EmbedBuilder } from 'discord.js';

const IMAGE_DELIVERY_URL = 'https://imagedelivery.net/QZ6TuL-3r02W7wQjQrv5DA';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);
  private readonly cache = new Map<string, any[]>(); // ใช้แคชในหน่วยความจำ

  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) {}

  // ตรวจสอบข้อมูลเซิร์ฟเวอร์
  private async validateServer(guildId: string) {
    const server = await this.serverRepository.getServerById(guildId);
    if (!server) {
      this.logger.warn(`Server with ID ${guildId} is not registered in the database.`);
      throw new Error('เซิร์ฟเวอร์นี้ยังไม่ได้ลงทะเบียนในระบบฐานข้อมูล');
    }
    return server;
  }

  // ดึงข้อมูลทั้งหมดจาก BlogDB
  async getAllBlogs(limit = 3): Promise<any[]> {
    const cacheKey = `blogs:${limit}`;
    if (this.cache.has(cacheKey)) {
      this.logger.log(`ดึงข้อมูลบทความจากแคช: ${cacheKey}`);
      return this.cache.get(cacheKey);
    }

    const blogs = await this.prisma.blogDB.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    this.cache.set(cacheKey, blogs); // บันทึกข้อมูลลงในแคช
    this.logger.log(`ดึงข้อมูลบทความจากฐานข้อมูลและบันทึกในแคช: ${cacheKey}`);
    return blogs;
  }

  // ฟังก์ชันแสดงบทความ
  async displayBlogs(interaction: any) {
    const guildId = interaction.guild?.id;
    if (!guildId) {
      this.logger.warn('Interaction does not belong to a guild.');
      return interaction.reply({
        content: 'ไม่สามารถตรวจสอบเซิร์ฟเวอร์ได้',
        ephemeral: true,
      });
    }

    // ตรวจสอบเซิร์ฟเวอร์
    await this.validateServer(guildId);

    const blogs = await this.getAllBlogs();

    if (blogs.length === 0) {
      return interaction.reply({
        content: 'ไม่มีข้อมูลบทความในระบบขณะนี้',
        ephemeral: true,
      });
    }

    // สร้าง Embed สำหรับแต่ละบทความ
    const embeds = blogs.map((blog) => {
      const imageUrl = `${IMAGE_DELIVERY_URL}/${blog.img}/public`; // URL รูปภาพ

      return new EmbedBuilder()
        .setTitle(blog.title)
        .setDescription(
          `${blog.description.substring(0, 100)}...\n[อ่านเพิ่มเติม](${blog.creditlink})`,
        )
        .setImage(imageUrl) // แสดงรูปภาพ
        .setColor(0x00ae86)
        .setTimestamp(blog.createdAt);
    });

    // ส่ง Embed ตอบกลับ
    await interaction.reply({
      embeds: embeds,
      ephemeral: false, // เปลี่ยนเป็น false เพื่อให้ข้อมูลแสดงแบบคงอยู่
    });
  }
}

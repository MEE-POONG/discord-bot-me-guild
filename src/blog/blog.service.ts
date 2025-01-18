import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { EmbedBuilder } from 'discord.js';

const IMAGE_DELIVERY_URL = 'https://imagedelivery.net/QZ6TuL-3r02W7wQjQrv5DA';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  // ดึงข้อมูลทั้งหมดจาก BlogDB
  async getAllBlogs(limit = 3) {
    return this.prisma.blogDB.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ฟังก์ชันแสดงบทความ
  async displayBlogs(interaction: any) {
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
          `${blog.description.substring(0, 100)}...\n[อ่านเพิ่มเติม](${blog.creditlink})`
        )
        .setImage(imageUrl) // แสดงรูปภาพ
        .setColor(0x00ae86)
        .setTimestamp(blog.createdAt);
    });

    await interaction.reply({
      embeds: embeds,
      ephemeral: true,
    });
  }
}

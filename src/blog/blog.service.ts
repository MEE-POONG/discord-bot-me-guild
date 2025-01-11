import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

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

    const responseMessage = blogs
      .map(
        (blog) =>
          `**${blog.title}**\n${blog.description.substring(0, 100)}...\n[อ่านเพิ่มเติม](${blog.creditlink})`,
      )
      .join('\n\n');

    await interaction.reply({
      content: `ข้อมูลบทความล่าสุด:\n\n${responseMessage}`,
      ephemeral: true,
    });
  }
}

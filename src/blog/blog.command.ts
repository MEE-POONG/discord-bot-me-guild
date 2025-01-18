import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { BlogService } from './blog.service';


@Injectable()
export class BlogCommands {
  private readonly logger = new Logger(BlogCommands.name);

  constructor(private readonly blogService: BlogService) {}

  @SlashCommand({
    name: 'blog-update',
    description: 'ระบบสำหรับดูข้อมูลบทความล่าสุด',
  })
  async handleBlog(@Context() [interaction]: SlashCommandContext) {
    try {
      // เรียกใช้ฟังก์ชันแสดงข้อมูลบทความ
      await this.blogService.displayBlogs(interaction);
    } catch (error) {
      this.logger.error('ไม่สามารถดึงข้อมูลบทความได้:', error);
      return interaction.reply({
        content: 'ไม่สามารถดึงข้อมูลบทความได้ กรุณาลองใหม่อีกครั้ง',
        ephemeral: true,
      });
    }
  }
}

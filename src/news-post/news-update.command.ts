import { Injectable } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { NewsUpdateService } from './news-update.service';
import { NewsUpdateDto } from './news-update.dto';
 // DTO สำหรับการรับค่า

@Injectable()
export class NewsUpdateCommand {
  constructor(private readonly newsUpdateService: NewsUpdateService) {}

  // สร้างคำสั่งสำหรับดึงข่าวล่าสุด
  @SlashCommand({
    name: 'news-latest',
    description: 'แสดงข่าว 5 ลำดับล่าสุด',
  })
  async getLatestNews(
    @Context() [interaction]: SlashCommandContext, // รับ context ของ interaction
  ): Promise<void> {
    try {
      // เรียกใช้ service สำหรับดึงข่าวล่าสุด
      const newsUpdates = await this.newsUpdateService.getLatestNews();

      if (newsUpdates.length === 0) {
        await interaction.reply({
          content: 'ไม่มีข่าวในระบบขณะนี้',
          ephemeral: true,
        });
        return;
      }

      // สร้างข้อความตอบกลับ
      const message = newsUpdates
        .map(
          (news, index) =>
            `${index + 1}. **${news.title}**\n${news.description}\n[อ่านเพิ่มเติม](${news.creditlink})\n`,
        )
        .join('\n');

      await interaction.reply({
        content: `**ข่าวล่าสุด**\n\n${message}`,
        ephemeral: true, // ข้อความตอบกลับเฉพาะผู้ใช้
      });
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการดึงข่าว:', error);
      await interaction.reply({
        content: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง!',
        ephemeral: true,
      });
    }
  }

  // สร้างคำสั่งสำหรับดึงข่าวตาม ID
  @SlashCommand({
    name: 'news-detail',
    description: 'แสดงรายละเอียดข่าวตาม ID',
  })
  async getNewsById(
    @Context() [interaction]: SlashCommandContext, // รับ context
    @Options() options: NewsUpdateDto, // รับค่า ID ผ่าน DTO
  ): Promise<void> {
    try {
      const news = await this.newsUpdateService.getNewsById(options.id);

      if (!news) {
        await interaction.reply({
          content: 'ไม่พบบทความข่าวที่คุณค้นหา',
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content: `**${news.title}**\n\n${news.description}\n\n[อ่านเพิ่มเติม](${news.creditlink})`,
        ephemeral: true,
      });
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูลข่าว:', error);
      await interaction.reply({
        content: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง!',
        ephemeral: true,
      });
    }
  }
}

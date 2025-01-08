import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { NewsUpdateService } from './news-update.service';

@Injectable()
export class NewsUpdateCommands {
  private readonly logger = new Logger(NewsUpdateCommands.name);

  constructor(private readonly newsUpdateService: NewsUpdateService) {}

  // Command: ดึงข่าว 5 ลำดับล่าสุด
  @SlashCommand({
    name: 'news-latest',
    description: 'แสดงข่าว 5 ลำดับล่าสุด',
  })
  async handleLatestNews(@Context() [interaction]: SlashCommandContext) {
    try {
      const newsUpdates = await this.newsUpdateService.getLatestNews();

      if (newsUpdates.length === 0) {
        return interaction.reply({
          content: 'ไม่มีข่าวในระบบขณะนี้',
          ephemeral: true,
        });
      }

      const message = newsUpdates
        .map(
          (news, index) =>
            `${index + 1}. **${news.title}**\n${news.description}\n[อ่านเพิ่มเติม](${news.creditlink})\n`,
        )
        .join('\n');

      return interaction.reply({
        content: `**ข่าวล่าสุด**\n\n${message}`,
        ephemeral: true,
      });
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการดึงข่าวล่าสุด:', error);
      return interaction.reply({
        content: 'ไม่สามารถดึงข้อมูลข่าวล่าสุดได้ กรุณาลองใหม่อีกครั้ง!',
        ephemeral: true,
      });
    }
  }

  // Command: ดึงข่าวตาม ID
  @SlashCommand({
    name: 'news-detail',
    description: 'แสดงรายละเอียดข่าวตาม ID',
  })
  async handleNewsDetail(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: { id: string }, // ใช้ @Options() แทน Context
  ) {
    try {
      const news = await this.newsUpdateService.getNewsById(options.id);

      if (!news) {
        return interaction.reply({
          content: 'ไม่พบบทความข่าวที่คุณค้นหา',
          ephemeral: true,
        });
      }

      return interaction.reply({
        content: `**${news.title}**\n\n${news.description}\n\n[อ่านเพิ่มเติม](${news.creditlink})`,
        ephemeral: true,
      });
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการดึงข้อมูลข่าว:', error);
      return interaction.reply({
        content: 'ไม่สามารถดึงข้อมูลข่าวได้ กรุณาลองใหม่อีกครั้ง!',
        ephemeral: true,
      });
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { NewsUpdateService } from './news-update.service';
import { EmbedBuilder } from 'discord.js';

@Injectable()
export class NewsUpdateCommands {
  private readonly logger = new Logger(NewsUpdateCommands.name);

  constructor(private readonly newsUpdateService: NewsUpdateService) {}

  // Command: ดึงข่าว 3 ลำดับล่าสุด
  @SlashCommand({
    name: 'news-latest',
    description: 'ข่าวล่าสุด',
  })
  async handleLatestNews(@Context() [interaction]: SlashCommandContext) {
    try {
      // ดึงข้อมูลข่าว 3 ลำดับล่าสุด
      const newsUpdates = await this.newsUpdateService.getLatestNews();

      if (newsUpdates.length === 0) {
        return interaction.reply({
          content: 'ไม่มีข่าวในระบบขณะนี้',
          ephemeral: true,
        });
      }

      // สร้าง Embed สำหรับแสดงข่าว
      const embed = new EmbedBuilder()
        .setTitle('ข่าวล่าสุด')
        .setColor(0x00ae86)
        .setTimestamp();

      newsUpdates.forEach((news) => {
        embed.addFields({
          name: news.title,
          value: `${news.description.substring(0, 1021)}...\n[อ่านเพิ่มเติม](${news.creditlink})`,
        });
      });

      await interaction.reply({
        embeds: [embed],
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
}

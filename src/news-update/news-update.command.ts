import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { NewsUpdateService } from './news-update.service';
import { EmbedBuilder } from 'discord.js';

const IMAGE_DELIVERY_URL = 'https://imagedelivery.net/QZ6TuL-3r02W7wQjQrv5DA';

@Injectable()
export class NewsUpdateCommands {
  private readonly logger = new Logger(NewsUpdateCommands.name);

  constructor(private readonly newsUpdateService: NewsUpdateService) {}

  @SlashCommand({
    name: 'news-latest',
    description: 'แสดงข่าวล่าสุด',
  })
  async handleLatestNews(@Context() [interaction]: SlashCommandContext) {
    try {
      const guildId = interaction.guildId;
      if (!guildId) {
        return interaction.reply({
          content: 'ไม่สามารถระบุเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง!',
          ephemeral: true,
        });
      }

      // ดึงข้อมูลข่าว 3 ลำดับล่าสุด
      const newsUpdates = await this.newsUpdateService.getLatestNews(guildId);

      if (newsUpdates.length === 0) {
        return interaction.reply({
          content: 'ไม่มีข่าวในระบบขณะนี้',
          ephemeral: true,
        });
      }

      // สร้าง Embed สำหรับแต่ละข่าว
      const embeds = newsUpdates.map((news) => {
        const imageUrl = `${IMAGE_DELIVERY_URL}/${news.img}/public`;

        return new EmbedBuilder()
          .setTitle(news.title)
          .setDescription(
            `${news.description.substring(0, 1021)}...\n[อ่านเพิ่มเติม](${news.creditlink})`,
          )
          .setImage(imageUrl)
          .setColor(0x00ae86)
          .setTimestamp(news.createdAt || new Date());
      });

      await interaction.reply({
        embeds: embeds,
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

import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { NewsUpdateService } from './news-update.service';
import { EmbedBuilder } from 'discord.js';

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
      // ดึงข้อมูลข่าวล่าสุด
      const newsUpdates = await this.newsUpdateService.getLatestNews();

      if (newsUpdates.length === 0) {
        return interaction.reply({
          content: 'ไม่มีข่าวในระบบขณะนี้',
          ephemeral: true,
        });
      }

      // ใช้ Embed สำหรับแสดงข้อมูลข่าว
      const embed = new EmbedBuilder()
        .setTitle('ข่าว 5 ลำดับล่าสุด')
        .setColor(0x00AE86)
        .setTimestamp();

      newsUpdates.forEach((news, index) => {
        embed.addFields({
          name: `${index + 1}. ${news.title}`,
          value: `${news.description.length > 1024 ? news.description.substring(0, 1021) + '...' : news.description}\n[อ่านเพิ่มเติม](${news.creditlink})`,
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

  // Command: ดึงข่าวตาม ID
  @SlashCommand({
    name: 'news-detail',
    description: 'แสดงรายละเอียดข่าวตาม ID',
  })
  async handleNewsDetail(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: { id: string },
  ) {
    try {
      // ตรวจสอบ ID ที่รับเข้ามา
      if (!options.id || typeof options.id !== 'string') {
        return interaction.reply({
          content: 'กรุณาระบุ ID ที่ถูกต้อง!',
          ephemeral: true,
        });
      }

      // ดึงข้อมูลข่าวตาม ID
      const news = await this.newsUpdateService.getNewsById(options.id);

      if (!news) {
        return interaction.reply({
          content: 'ไม่พบบทความข่าวที่คุณค้นหา',
          ephemeral: true,
        });
      }

      // ตรวจสอบข้อความว่าเกิน 2000 ตัวอักษรหรือไม่
      const description =
        news.description.length > 4096
          ? news.description.substring(0, 4093) + '...'
          : news.description;

      // ใช้ Embed สำหรับแสดงข่าว
      const embed = new EmbedBuilder()
        .setTitle(news.title)
        .setDescription(description)
        .setURL(news.creditlink)
        .setImage(news.img)
        .setColor(0x00AE86)
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
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

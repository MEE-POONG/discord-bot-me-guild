import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { NewsService } from './news.service';

@Injectable()
export class NewsCommands {
  private readonly logger = new Logger(NewsCommands.name);
  constructor(private readonly formRegisterService: NewsService) {}

  @SlashCommand({
    name: 'news',
    description: 'ระบบแสดงข่าวสาร',
  })
  async handleNews(@Context() [interaction]: SlashCommandContext) {
    try {
      await this.formRegisterService.NewsSystem(interaction);
      // return interaction.reply({
      //   content: 'สร้างหน้าลงทะเบียนสำเร็จ',
      //   ephemeral: true,
      // });
    } catch (error) {
      this.logger.error('ไม่สามารถสร้างรูปแบบลงทะเบียนได้');
      return interaction.reply({
        content: 'ไม่สามารถสร้างรูปแบบลงทะเบียนได้',
        ephemeral: true,
      });
    }
  }
}

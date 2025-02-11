import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { getGuildIdsValues } from 'src/utils/guilds';
import { FormGameService } from './form-game.service';

@Injectable()
export class FormGameCommands {
  private readonly logger = new Logger(FormGameCommands.name);
  constructor(private readonly formGameService: FormGameService) {}

  @SlashCommand({
    name: 'form-game',
    description: 'ส่งป็อปอัพเกี่ยวกับการเล่นเกมส์',
    guilds: getGuildIdsValues,
  })
  async handleFormGame(@Context() [interaction]: SlashCommandContext) {
    try {
      await this.formGameService.createRegistrationMessage(interaction);
      this.logger.log('สร้างหน้าลงทะเบียนสำเร็จ');
      return interaction.reply({
        content: 'สร้างหน้าลงทะเบียนสำเร็จ',
        ephemeral: true,
      });
    } catch (error) {
      this.logger.error('ไม่สามารถสร้างรูปแบบลงทะเบียนได้');
      return interaction.reply({
        content: 'ไม่สามารถสร้างรูปแบบลงทะเบียนได้',
        ephemeral: true,
      });
    }
  }
}

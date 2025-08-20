import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { ServerclearService } from './server-clear.service';

@Injectable()
export class ServerclearCommands {
  private readonly logger = new Logger(ServerclearCommands.name);
  constructor(private readonly serverclearService: ServerclearService) {}

  @SlashCommand({
    name: 'server-clear',
    description: 'ล้างดิส',
  })
  async handleServerclear(@Context() [interaction]: SlashCommandContext) {
    try {
      await this.serverclearService.ServerclearSystem(interaction);
    } catch (error) {
      this.logger.error('ไม่สามารถสร้างรูปแบบลงทะเบียนได้');
      return interaction.reply({
        content: 'ไม่สามารถสร้างรูปแบบลงทะเบียนได้',
        ephemeral: true,
      });
    }
  }
}

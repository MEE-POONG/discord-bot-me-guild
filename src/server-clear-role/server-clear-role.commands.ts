import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { ServerclearRoleService } from './server-clear-role.service';

@Injectable()
export class ServerclearRoleCommands {
  private readonly logger = new Logger(ServerclearRoleCommands.name);
  constructor(private readonly serverclearroleService: ServerclearRoleService) {}

  @SlashCommand({
    name: 'server-clear-role',
    description: 'ล้าง role บทบาทดิส',
  })
  async handleServerclearRole(@Context() [interaction]: SlashCommandContext) {
    try {
      await this.serverclearroleService.ServerclearRoleSystem(interaction);
    } catch (error) {
      this.logger.error('ไม่สามารถสร้างรูปแบบลงทะเบียนได้');
      return interaction.reply({
        content: 'ไม่สามารถสร้างรูปแบบลงทะเบียนได้',
        ephemeral: true,
      });
    }
  }
}

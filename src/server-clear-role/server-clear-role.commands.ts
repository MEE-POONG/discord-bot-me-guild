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
    defaultMemberPermissions: '8',
  })
  async handleServerclearRole(@Context() [interaction]: SlashCommandContext) {
    try {
      // Defer reply เพื่อป้องกัน Unknown interaction error
      await interaction.deferReply({ ephemeral: true });

      await this.serverclearroleService.ServerclearRoleSystem(interaction);
    } catch (error) {
      this.logger.error('ไม่สามารถสร้างรูปแบบลงทะเบียนได้');
      try {
        return interaction.editReply({
          content: 'ไม่สามารถสร้างรูปแบบลงทะเบียนได้',
        });
      } catch (editError) {
        this.logger.error('Failed to edit reply:', editError.message);
      }
    }
  }
}

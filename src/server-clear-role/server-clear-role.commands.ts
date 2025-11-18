import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { ServerClearRoleService } from './server-clear-role.service';

@Injectable()
export class ServerClearRoleCommands {
  private readonly logger = new Logger(ServerClearRoleCommands.name);
  constructor(private readonly serverClearroleService: ServerClearRoleService) {}

  @SlashCommand({
    name: 'server-clear-role',
    description: 'ล้าง role บทบาทดิส',
    defaultMemberPermissions: '8',
  })
  async handleServerClearRole(@Context() [interaction]: SlashCommandContext) {
    try {
      // Defer reply เพื่อป้องกัน Unknown interaction error
      await interaction.deferReply({ ephemeral: true });

      await this.serverClearroleService.ServerClearRoleSystem(interaction);
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

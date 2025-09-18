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
    defaultMemberPermissions: '8',
  })
  async handleServerclear(@Context() [interaction]: SlashCommandContext) {
    this.logger.debug(`[handleServerclear] Command triggered by user: ${interaction.user.id} (${interaction.user.username})`);
    
    // Defer reply เพื่อป้องกัน Unknown interaction error
    await interaction.deferReply({ ephemeral: true });
    
    try {
      this.logger.debug(`[handleServerclear] Calling ServerclearSystem`);
      await this.serverclearService.ServerclearSystem(interaction);
      this.logger.debug(`[handleServerclear] ServerclearSystem completed`);
    } catch (error) {
      this.logger.error(`[handleServerclear] Error in server-clear command:`, error);
      try {
        await interaction.editReply({
          content: '❌ เกิดข้อผิดพลาดในการล้างเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง',
        });
      } catch (editError) {
        this.logger.error(`[handleServerclear] Failed to edit reply:`, editError);
      }
    }
  }
}

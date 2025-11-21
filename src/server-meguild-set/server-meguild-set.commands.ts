import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { ServerMeguildSetService } from './server-meguild-set.service';

@Injectable()
export class ServerMeguildSetCommands {
  private readonly logger = new Logger(ServerMeguildSetCommands.name);
  constructor(private readonly meguildSetService: ServerMeguildSetService) { }

  @SlashCommand({
    name: 'server-meguild-set',
    description: 'สร้างห้อง 🕍︰me-guild-set-server สำหรับตั้งค่าเซิร์ฟเวอร์',
    defaultMemberPermissions: '8',
  })
  async handleServerMeguildSet(@Context() [interaction]: SlashCommandContext) {
    try {
      await this.meguildSetService.ServerMeguildSetSystem(interaction);
    } catch (error) {
      this.logger.error('ไม่สามารถสร้างห้อง 🕍︰me-guild-set-server ได้:', error);
      return interaction.reply({
        content: '❌ เกิดข้อผิดพลาดในการสร้างห้อง กรุณาลองใหม่อีกครั้ง',
        ephemeral: true,
      });
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { ServerSetRoomService } from './server-set-room.service';
import { ServerSetRoomDto } from './dto/length.dto';

@Injectable()
export class ServerSetRoomCommands {
  private readonly logger = new Logger(ServerSetRoomCommands.name);
  constructor(private readonly ServerSetRoomService: ServerSetRoomService) { }

  @SlashCommand({
    name: 'server-set-room',
    description: 'สร้างและกำหนดค่าห้องในเซิร์ฟเวอร์',
    defaultMemberPermissions: '0',
  })
  async handleServerSetRoom(@Context() [interaction]: SlashCommandContext, @Options() options: ServerSetRoomDto) {
    try {
      await this.ServerSetRoomService.ServerSetRoomSystem(interaction, options);
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดขณะพยายามสร้างห้อง:', error);
      return interaction.reply({
        content:
          '❌ **ไม่สามารถสร้างห้องได้**\n' +
          'เกิดข้อผิดพลาดระหว่างการประมวลผลคำสั่งของคุณ\n' +
          'โปรดลองอีกครั้ง หรือติดต่อผู้ดูแลเซิร์ฟเวอร์หากปัญหายังคงอยู่',
        ephemeral: true,
      });
    }
  }
}

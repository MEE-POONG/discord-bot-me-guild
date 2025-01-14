import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { ServerSetRoomService } from './server-set-room.service';
import { ServerSetRoomDto } from './dto/length.dto';

@Injectable()
export class ServerSetRoomCommands {
  private readonly logger = new Logger(ServerSetRoomCommands.name);
  constructor(private readonly ServerSetRoomService: ServerSetRoomService) {}

  @SlashCommand({
    name: 'server-set-room',
    description: 'ระบบสำหรับลงทะเบียนนักผจญภัย',
  })
  async handleServerSetRoom(@Context() [interaction]: SlashCommandContext, @Options() options: ServerSetRoomDto) {
    try {
      await this.ServerSetRoomService.ServerSetRoomSystem(interaction,options);
    } catch (error) {
      this.logger.error('ไม่สามารถสร้างรูปแบบลงทะเบียนได้');
      return interaction.reply({
        content: 'ไม่สามารถสร้างรูปแบบลงทะเบียนได้',
        ephemeral: true,
      });
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { ServerTryItOnService } from './server-try-it-on.service';

@Injectable()
export class ServerTryItOnCommands {
  private readonly logger = new Logger(ServerTryItOnCommands.name);
  constructor(private readonly formRegisterService: ServerTryItOnService) {}

  @SlashCommand({
    name: 'server-try-it-on',
    description: 'ระบบสำหรับลงทะเบียนนักผจญภัย',
  })
  async handleServerTryItOn(@Context() [interaction]: SlashCommandContext) {
    try {
      await this.formRegisterService.ServerTryItOnSystem(interaction);
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

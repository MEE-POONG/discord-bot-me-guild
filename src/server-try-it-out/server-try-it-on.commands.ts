import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { ServerTryItOnService } from './server-try-it-on.service';

@Injectable()
export class ServerTryItOnCommands {
  private readonly logger = new Logger(ServerTryItOnCommands.name);
  constructor(private readonly serverTryItOnService: ServerTryItOnService) { }

  @SlashCommand({
    name: 'server-try-it-on',
    description: 'ระบบสำหรับลงทะเบียนนักผจญภัย',
    defaultMemberPermissions: '0',
  })
  async handleServerTryItOn(@Context() [interaction]: SlashCommandContext) {
    try {
      await this.serverTryItOnService.ServerTryItOnSystem(interaction);
    } catch (error) {
      this.logger.error('ไม่สามารถสร้างรูปแบบลงทะเบียนได้');
      return interaction.reply({
        content: 'ไม่สามารถสร้างรูปแบบลงทะเบียนได้',
        ephemeral: true,
      });
    }
  }
}

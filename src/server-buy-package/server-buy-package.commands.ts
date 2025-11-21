import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { ServerBuyPackageService } from './server-buy-package.service';

@Injectable()
export class ServerBuyPackageCommands {
  private readonly logger = new Logger(ServerBuyPackageCommands.name);
  constructor(private readonly serverBuyPackageService: ServerBuyPackageService) { }

  @SlashCommand({
    name: 'server-buy-package',
    description: 'ซื้อแพ็คเกจ',
    defaultMemberPermissions: '8',
  })
  async handleServerBuyPackage(@Context() [interaction]: SlashCommandContext) {
    try {
      await this.serverBuyPackageService.ServerBuyPackageSystem(interaction);
    } catch (error) {
      this.logger.error('ไม่สามารถสร้างรูปแบบลงทะเบียนได้');
      return interaction.reply({
        content: 'ไม่สามารถสร้างรูปแบบลงทะเบียนได้',
        ephemeral: true,
      });
    }
  }
}

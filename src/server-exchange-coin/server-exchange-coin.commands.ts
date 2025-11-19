import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { ServerExchangCoinService } from './server-exchange-coin.service';

@Injectable()
export class ServerExchangCoinCommands {
  private readonly logger = new Logger(ServerExchangCoinCommands.name);
  constructor(private readonly serverExchangCoinService: ServerExchangCoinService) {}

  @SlashCommand({
    name: 'server-exchange-coin',
    description: 'แลกเปลี่ยน Coins',
    defaultMemberPermissions: '8',
  })
  async handleServerExchangCoin(@Context() [interaction]: SlashCommandContext) {
    try {
      await this.serverExchangCoinService.ServerExchangCoinSystem(interaction);
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

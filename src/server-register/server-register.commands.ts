import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { ServerRegisterService } from './server-register.service';

@Injectable()
export class ServerRegisterCommands {
  private readonly logger = new Logger(ServerRegisterCommands.name);
  constructor(private readonly registerService: ServerRegisterService) { }

  @SlashCommand({
    name: 'server-register',
    description: 'ระบบเจ้าของดิสลงทะเบียน Discord Server',
    // defaultMemberPermissions: '8',
  })
  async handleServerRegister(@Context() [interaction]: SlashCommandContext) {
    try {
      await this.registerService.ServerRegisterSystem(interaction);
      // return interaction.reply({
      //   content: 'ลงทะเบียน DiscordServer สำเร็จ',
      //   ephemeral: true,
      // });
    } catch (error) {
      this.logger.error('ไม่สามารถสร้างรูปแบบลงทะเบียนเซิฟเวอร์ Discord ได้');
      return interaction.reply({
        content: 'ไม่สามารถสร้างรูปแบบลงทะเบียนเซิฟเวอร์ Discord ได้',
        ephemeral: true,
      });
    }
  }
}

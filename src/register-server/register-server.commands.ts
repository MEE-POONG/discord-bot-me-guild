import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { RegisterServerService } from './register-server.service';

@Injectable()
export class RegisterServerCommands {
  private readonly logger = new Logger(RegisterServerCommands.name);
  constructor(private readonly registerService: RegisterServerService) { }

  @SlashCommand({
    name: 'register-server',
    description: 'ระบบเจ้าของดิสลงทะเบียน Discord Server',
  })
  async handleRegisterServer(@Context() [interaction]: SlashCommandContext) {
    try {
      await this.registerService.RegisterServerSystem(interaction);
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

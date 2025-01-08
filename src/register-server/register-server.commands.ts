import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { RegisterServerService } from './register-server.service';

@Injectable()
export class RegisterServerCommands {
  private readonly logger = new Logger(RegisterServerCommands.name);
  constructor(private readonly formRegisterService: RegisterServerService) {}

  @SlashCommand({
    name: 'form-register',
    description: 'ระบบสำหรับลงทะเบียนนักผจญภัย',
  })
  async handleRegisterServer(@Context() [interaction]: SlashCommandContext) {
    try {
      await this.formRegisterService.registerServerSystem(interaction);
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

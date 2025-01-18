import { Injectable, Logger } from '@nestjs/common';
import { FormRegisterService } from './form-register.service';
import { Context, SlashCommand, SlashCommandContext } from 'necord';

@Injectable()
export class FormRegisterCommands {
  private readonly logger = new Logger(FormRegisterCommands.name);
  constructor(private readonly formRegisterService: FormRegisterService) {}

  @SlashCommand({
    name: 'form-register',
    description: 'ระบบสำหรับลงทะเบียนนักผจญภัย',
  })
  async handleFormRegister(@Context() [interaction]: SlashCommandContext) {
    try {
      await this.formRegisterService.createRegistrationMessage(interaction);
      this.logger.log('สร้างหน้าลงทะเบียนสำเร็จ');
      return interaction.reply({
        content: 'สร้างหน้าลงทะเบียนสำเร็จ',
        ephemeral: true,
      });
    } catch (error) {
      this.logger.error('ไม่สามารถสร้างรูปแบบลงทะเบียนได้');
      return interaction.reply({
        content: 'ไม่สามารถสร้างรูปแบบลงทะเบียนได้',
        ephemeral: true,
      });
    }
  }
}

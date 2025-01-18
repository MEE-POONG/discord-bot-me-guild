import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { PrototypeService } from './prototype.service';

@Injectable()
export class PrototypeCommands {
  private readonly logger = new Logger(PrototypeCommands.name);
  constructor(private readonly prototypeService: PrototypeService) {}

  @SlashCommand({
    name: 'prototype',
    description: 'ระบบสำหรับลงทะเบียนนักผจญภัย',
  })
  async handlePrototype(@Context() [interaction]: SlashCommandContext) {
    try {
      await this.prototypeService.PrototypeSystem(interaction);
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

import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { TestCreateChTwoService } from './test-create-ch-two.service';

@Injectable()
export class TestCreateChTwoCommands {
  private readonly logger = new Logger(TestCreateChTwoCommands.name);
  constructor(private readonly testcreatechtwoService: TestCreateChTwoService) {}

  @SlashCommand({
    name: 'test-create-channel',
    description: 'ระบบสำหรับลงทะเบียนนักผจญภัย',
  })
  async handleTestCreateChTwo(@Context() [interaction]: SlashCommandContext) {
    try {
      await this.testcreatechtwoService.TestCreateChTwoSystem(interaction);
    } catch (error) {
      this.logger.error('ไม่สามารถสร้างรูปแบบลงทะเบียนได้');
      return interaction.reply({
        content: 'ไม่สามารถสร้างรูปแบบลงทะเบียนได้',
        ephemeral: true,
      });
    }
  }
}

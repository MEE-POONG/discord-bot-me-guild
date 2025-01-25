import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { TestCreateChannelService } from './test-create-channel.service';

@Injectable()
export class TestCreateChannelCommands {
  private readonly logger = new Logger(TestCreateChannelCommands.name);
  constructor(private readonly testcreatechannelService: TestCreateChannelService) {}

  @SlashCommand({
    name: 'test-create-channel',
    description: 'ระบบสำหรับลงทะเบียนนักผจญภัย',
  })
  async handleTestCreateChannel(@Context() [interaction]: SlashCommandContext) {
    try {
      await this.testcreatechannelService.TestCreateChannelSystem(interaction);
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

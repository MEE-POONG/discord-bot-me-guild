import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { StageChannelService } from './stage-channel.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { GuildMember, VoiceBasedChannel } from 'discord.js';

@Injectable()
export class StageChannelCommands {
  private readonly logger = new Logger(StageChannelCommands.name);

  constructor(private readonly stageChannelService: StageChannelService) {}

  @SlashCommand({
    name: 'create-stage',
    description: 'สร้าง Stage Channel สำหรับไลฟ์',
  })
  async handleCreateStage(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: CreateStageDto,
  ) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel as VoiceBasedChannel;
    if (!voiceChannel) {
      await interaction.reply({
        content: '❌ คุณต้องอยู่ในห้องเสียงก่อนจึงจะสามารถเข้าร่วมห้องได้',
        ephemeral: true, // ข้อความจะเห็นได้เฉพาะผู้ใช้ที่กดปุ่ม
        fetchReply: true, // ใช้เพื่อให้เราสามารถดึงข้อมูลข้อความที่ส่งออกมาได้
      });
      return;
    }
    if (!options.topic) {
        await interaction.reply({
            content: '❌ หัวข้อเวทีไม่สามารถว่างได้',
            ephemeral: true,
            fetchReply: true,
        });
        return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      const stageChannel = await this.stageChannelService.createStageChannel(
        interaction,
        options.topic,
      );

      await interaction.editReply({
        content: `✅ สร้าง Stage Channel "${stageChannel.name}" และตั้งเวทีสำเร็จ!\nหัวข้อ: ${options.topic}\n\nบอทได้ย้ายคุณเข้าห้องแล้ว กรุณากด 'ขอพูด' (Request to Speak) ด้วยตัวเอง`,
      });
    } catch (error) {
      this.logger.error('Create stage command failed:', error);
      await interaction.editReply({
        content: '❌ ไม่สามารถสร้าง Stage Channel ได้ กรุณาลองใหม่อีกครั้ง',
      });
    }
  }
}

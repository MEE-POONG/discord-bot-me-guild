import { Injectable, Logger } from '@nestjs/common';
import {
  CommandInteraction,
  GuildMember,
  PermissionFlagsBits,
  ChannelType,
  CategoryChannel,
  VoiceBasedChannel,
} from 'discord.js';

@Injectable()
export class StageChannelService {
  private readonly logger = new Logger(StageChannelService.name);

  async createStageChannel(interaction: CommandInteraction, topic: string) {
    try {
      const member = interaction.member as GuildMember;
      const username = member.user.displayName;
      const channelName = `🎩・${username} ไลฟ์`;

      // หา category ที่ชื่อ Busking
      const category = interaction.guild.channels.cache.find(
        (c) =>
          c.type === ChannelType.GuildCategory &&
          (c.name === '〔🎩〕𝑩𝒖𝒔𝒌𝒊𝒏𝒈' || c.name === '〔🎩〕𝑩𝒖𝒔𝒌𝒊𝒏𝒈 𝑪𝒆𝒏𝒕𝒆𝒓'),
      ) as CategoryChannel | undefined;

      this.logger.debug(
        `Available channels: ${interaction.guild.channels.cache.map((c) => c.name).join(', ')}`,
      );

      if (!category) {
        throw new Error('ไม่พบหมวดหมู่ Busking ในเซิร์ฟเวอร์นี้');
      }

      // Create stage channel ใต้ category
      const stageChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildStageVoice,
        parent: category.id,
        permissionOverwrites: [
          {
            id: interaction.guild.id, // @everyone role
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
            deny: [PermissionFlagsBits.RequestToSpeak],
          },
          {
            id: member.id, // Command user
            allow: [
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.RequestToSpeak,
            ],
          },
        ],
      });

      // สร้าง Stage Instance ทันที
      await interaction.guild.stageInstances.create(stageChannel.id, { topic });

      try {
        // ดึง user ที่สั่งคำสั่งเข้าห้อง stage
        await member.voice.setChannel(stageChannel as VoiceBasedChannel);
      } catch (error) {
        this.logger.error('Error moving user to stage channel', error);
      }

      //   try {
      //     // Promote เป็น speaker (request to speak)
      //     if (stageChannel.type === ChannelType.GuildStageVoice) {
      //       await member.voice.setRequestToSpeak(true);
      //     }
      //   } catch (error) {
      //     this.logger.error('Error promoting to speaker (request to speak)', error);
      //   }

      return stageChannel;
    } catch (error) {
      this.logger.error('Failed to create stage channel:', error);
      throw error;
    }
  }
}

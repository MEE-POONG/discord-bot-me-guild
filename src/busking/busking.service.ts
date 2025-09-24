import { Injectable, Logger } from '@nestjs/common';
import { ChannelType, GuildMember } from 'discord.js';
import { SlashCommandContext } from 'necord';
@Injectable()
export class BuskingService {
  private readonly logger = new Logger(BuskingService.name);
  async createBuskingChannel([interaction]: SlashCommandContext) {
    if (interaction.member instanceof GuildMember) {
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply({
          content: 'คุณต้องเชื่อมต่อกับช่องเสียงก่อน',
          ephemeral: true,
        });
      }
    }

    const guild = interaction.guild;
    if (!guild) {
      return interaction.reply({ content: '❌ ไม่สามารถเข้าถึงเซิร์ฟเวอร์ได้', ephemeral: true });
    }

    const roleBusking = guild.roles.cache.find((role) => role.name === 'Busking');

    if (!roleBusking) {
      return interaction.reply({
        content: 'คุณต้องมีสิทธิ์ Busking ก่อน',
        ephemeral: true,
      });
    }

    const buskingCenter = guild.channels.cache.find(
      (channel) => channel.name === '〔🎩〕𝑩𝒖𝒔𝒌𝒊𝒏𝒈 𝑪𝒆𝒏𝒕𝒆𝒓',
    );

    if (!buskingCenter) {
      return interaction.reply({ content: '❌ ไม่พบหมวดหมู่ Busking Center', ephemeral: true });
    }

    const channel = await guild.channels.create({
      name: 'busking',
      type: ChannelType.GuildStageVoice,
      parent: buskingCenter.id,
    });

    await channel.permissionOverwrites.edit(roleBusking, {
      ViewChannel: true,
      Connect: true,
    });

    const member = await guild.members.fetch(interaction.user.id);
    try {
      await member.voice.setChannel(channel.id);
    } catch (error) {
      this.logger.error('Error moving user to voice channel', error);
    }

    try {
      // Set the bot as a speaker in the Stage Voice channel
      if (channel.type === ChannelType.GuildStageVoice) {
        await member.voice.setSuppressed(false);
      }
    } catch (error) {
      this.logger.error('Error moving user to voice channel', error);
    }

    return interaction.reply({
      content: 'สร้างช่องสำเร็จ',
      ephemeral: true,
    });
  }
}

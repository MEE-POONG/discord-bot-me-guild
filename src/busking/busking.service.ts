import { Injectable } from '@nestjs/common';
import {
  CacheType,
  ChannelType,
  ChatInputCommandInteraction,
  GuildMember,
  StringSelectMenuInteraction,
} from 'discord.js';
import { SlashCommandContext } from 'necord';
@Injectable()
export class BuskingService {
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
    const roleBusking = guild.roles.cache.find(
      (role) => role.name === 'Busking',
    );

    if (!roleBusking) {
      return interaction.reply({
        content: 'คุณต้องมีสิทธิ์ Busking ก่อน',
        ephemeral: true,
      });
    }

    const buskingCenter = guild.channels.cache.find(
      (channel) => channel.name === '〔🎩〕𝑩𝒖𝒔𝒌𝒊𝒏𝒈 𝑪𝒆𝒏𝒕𝒆𝒓',
    );

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
      console.log('error', error);
    }

    try {
      // Set the bot as a speaker in the Stage Voice channel
      if (channel.type === ChannelType.GuildStageVoice) {
        await member.voice.setSuppressed(false);
      }
    } catch (error) {
      console.log('error', error);
    }

    return interaction.reply({
      content: 'สร้างช่องสำเร็จ',
      ephemeral: true,
    });
  }
}

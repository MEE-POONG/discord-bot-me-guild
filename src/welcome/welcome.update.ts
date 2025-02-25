import { Injectable, Logger } from '@nestjs/common';
import {
  Context,
  On,
  ContextOf,
  SlashCommand,
  SlashCommandContext,
} from 'necord';
import { AttachmentBuilder, GuildMember, TextBasedChannel } from 'discord.js';
import { ServerRepository } from 'src/repository/server';
import axios from 'axios';
@Injectable()
export class WelcomeUpdate {
  private readonly logger = new Logger(WelcomeUpdate.name);
  constructor(private readonly serverRepository: ServerRepository) {}

  @On('guildMemberAdd')
  public async onGuildMemberAdd(
    @Context() [member]: ContextOf<'guildMemberAdd'>,
  ) {
    try {
      const buffer = await axios({
        method: 'POST',
        url: 'https://me-draw.me-prompt-technology.com/draw/image-me-guild-welcome',
        data: {
          displayName: member.displayName,
          avatar: member.user.displayAvatarURL({ extension: 'png' }),
        },
        responseType: 'arraybuffer',
      });

      const server = await this.serverRepository.getServerById(member.guild.id);
      if (!server) {
        this.logger.warn(
          `Server with ID ${member.guild.id} is not registered in the database.`,
        );
        return;
      }

      if (!server.welcomechannel) {
        this.logger.warn(
          `No welcome channel configured for server ID ${member.guild.id}`,
        );
        return;
      }
      const channel = (await member.guild.channels.fetch(
        server.welcomechannel,
      )) as TextBasedChannel;
      if (channel && channel.isTextBased() && 'send' in channel) {
        await channel.send({
          files: [new AttachmentBuilder(buffer.data, { name: 'welcome.png' })],
          content: `🎉 ยินดีต้อนรับ ${member.toString()} เข้าสู่เซิร์ฟเวอร์!`,
        });
      } else {
        this.logger.warn(
          `The channel is not text-based or does not support sending messages.`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to send welcome message', error);
    }
  }

  @SlashCommand({
    name: 'test-welcome',
    description: 'ตั้งค่าสำหรับการส่งข้อความยินดีต้อนรับ',
  })
  public async welcomeCommand(@Context() [interaction]: SlashCommandContext) {
    await this.onGuildMemberAdd([interaction.member as GuildMember]);
  }
}

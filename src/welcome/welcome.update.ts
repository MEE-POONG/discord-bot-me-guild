import { Injectable, Logger } from '@nestjs/common';
import { Context, On, ContextOf } from 'necord';
import { AttachmentBuilder, TextBasedChannel } from 'discord.js';
import { generateImage } from '../utils/generateImage';
import { ServerRepository } from 'src/repository/server';

@Injectable()
export class WelcomeUpdate {
  private readonly logger = new Logger(WelcomeUpdate.name);
  constructor(private readonly serverRepository: ServerRepository) { }

  @On('guildMemberAdd')
  public async onGuildMemberAdd(
    @Context() [member]: ContextOf<'guildMemberAdd'>,
  ) {
    try {
      const buffer = await generateImage(member);
      const image = new AttachmentBuilder(buffer, { name: 'welcome.png' });
      const server = await this.serverRepository.getServerById(member.guild.id);
      if (!server) {
        this.logger.warn(`Server with ID ${member.guild.id} is not registered in the database.`);
        return;
      }

      if (!server.welcomechannel) {
        this.logger.warn(`No welcome channel configured for server ID ${member.guild.id}`);
        return;
      }
      const channel = await member.guild.channels.fetch(server.welcomechannel) as TextBasedChannel;
      if (channel && channel.isTextBased() && 'send' in channel) {
        await channel.send({
          files: [image],
          content: `🎉 ยินดีต้อนรับ ${member.toString()} เข้าสู่เซิร์ฟเวอร์!`,
        });
      } else {
        this.logger.warn(`The channel is not text-based or does not support sending messages.`);
      }

    
    } catch (error) {
      this.logger.error('Failed to send welcome message', error);
    }
  }
}

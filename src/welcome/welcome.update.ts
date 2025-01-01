import { Injectable, Logger } from '@nestjs/common';
import { Context, On, ContextOf } from 'necord';
import { AttachmentBuilder } from 'discord.js';
import { generateImage } from '../utils/generateImage';

@Injectable()
export class WelcomeUpdate {
  private readonly logger = new Logger(WelcomeUpdate.name);

  @On('guildMemberAdd')
  public async onGuildMemberAdd(
    @Context() [member]: ContextOf<'guildMemberAdd'>,
  ) {
    try {
      const buffer = await generateImage(member);
      const image = new AttachmentBuilder(buffer, { name: 'welcome.png' });
      const channel = await member.guild.channels.fetch('1314455560841859124');

      if (channel && channel.isTextBased()) {
        await channel.send({
          files: [image],
          content: `${member.toString()}`,
        });
      }
    } catch (error) {
      this.logger.error('Failed to send welcome message', error);
    }
  }
}

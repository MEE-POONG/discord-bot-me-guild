import { Injectable, Logger } from '@nestjs/common';
import { Context, On, ContextOf } from 'necord';
import { AttachmentBuilder } from 'discord.js';
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
      const server = await this.serverRepository.getServerById(member.guild.id);
      console.log(18, server);

      const buffer = await generateImage(member);
      const image = new AttachmentBuilder(buffer, { name: 'welcome.png' });
      const channel = await member.guild.channels.fetch(server.welcomechannel);

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
